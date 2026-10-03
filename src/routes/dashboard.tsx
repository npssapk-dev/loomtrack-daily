import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Factory, IndianRupee, Truck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, Empty, PageHeader, Panel, Stat, StatusBadge } from "@/components/app/ui";
import {
  nameMap, sum, useCustomers, useEmployees, useMachines, usePayments, usePaymentTypes, useProducts, useProductionEntries,
  useRecentDeliveries, useRecentProduction,
} from "@/lib/data";
import { fmtDate, money, monthStartStr, qty, todayStr } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — LoomTrack" }, { name: "description", content: "Today's and this month's production, wages, income and expenses at a glance." }, { property: "og:title", content: "Dashboard — LoomTrack" }, { property: "og:description", content: "Today's and this month's production, wages, income and expenses at a glance." }] }),
  component: DashboardPage,
});

type Agg = { id: number; qty: number; wage: number; n: number };
function groupBy<T>(rows: T[], key: (r: T) => number, q: (r: T) => number, w: (r: T) => number): Agg[] {
  const m = new Map<number, Agg>();
  for (const r of rows) {
    const id = key(r);
    const a = m.get(id) ?? { id, qty: 0, wage: 0, n: 0 };
    a.qty += Number(q(r)) || 0; a.wage += Number(w(r)) || 0; a.n += 1;
    m.set(id, a);
  }
  return [...m.values()].sort((a, b) => b.qty - a.qty);
}

function DashboardPage() {
  const from = monthStartStr();
  const today = todayStr();
  const { data: prod, isLoading: pl } = useProductionEntries(from, today);
  const { data: payments, isLoading: payl } = usePayments(from, today);
  const { data: types } = usePaymentTypes();
  const { data: recent, isLoading: rl } = useRecentProduction(5);
  const { data: recentDel, isLoading: dl } = useRecentDeliveries(5);
  const { data: machines } = useMachines();
  const { data: products } = useProducts();
  const { data: employees } = useEmployees();
  const { data: customers } = useCustomers();

  const mN = nameMap(machines), pN = nameMap(products), eN = nameMap(employees), cN = nameMap(customers);
  const dir = useMemo(() => Object.fromEntries((types ?? []).map((t) => [t.id, t.direction])), [types]);

  const todayProd = useMemo(() => (prod ?? []).filter((r) => r.production_date === today), [prod, today]);
  const todayPay = useMemo(() => (payments ?? []).filter((p) => p.payment_date === today), [payments, today]);
  const inc = (list?: typeof payments) => sum(list?.filter((p) => dir[p.payment_type_id] === "INCOME"), (p) => p.amount);
  const exp = (list?: typeof payments) => sum(list?.filter((p) => dir[p.payment_type_id] === "EXPENSE"), (p) => p.amount);

  const mIncome = inc(payments), mExpense = exp(payments), net = mIncome - mExpense;
  const byMachine = useMemo(() => groupBy(todayProd, (r) => r.machine_id, (r) => r.quantity, (r) => r.wage_amount), [todayProd]);
  const byEmployee = useMemo(() => groupBy(todayProd, (r) => r.employee_id, (r) => r.quantity, (r) => r.wage_amount), [todayProd]);

  const loading = pl || payl;
  const v = (s: string) => (loading ? "…" : s);

  return (
    <>
      <PageHeader title="Dashboard" subtitle={`Today ${fmtDate(today)}`} actions={
        <>
          <Button asChild size="sm"><Link to="/production"><Factory className="mr-1 h-4 w-4" />Production</Link></Button>
          <Button asChild size="sm" variant="outline"><Link to="/payments"><Wallet className="mr-1 h-4 w-4" />Expense</Link></Button>
          <Button asChild size="sm" variant="outline"><Link to="/payments"><IndianRupee className="mr-1 h-4 w-4" />Income</Link></Button>
          <Button asChild size="sm" variant="outline"><Link to="/deliveries"><Truck className="mr-1 h-4 w-4" />Delivery</Link></Button>
        </>
      } />

      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Today</h2>
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Production qty" value={v(qty(sum(todayProd, (r) => r.quantity)))} />
        <Stat label="Calculated wages" value={v(money(sum(todayProd, (r) => r.wage_amount)))} tone="accent" />
        <Stat label="Income" value={v(money(inc(todayPay)))} tone="success" />
        <Stat label="Expenses" value={v(money(exp(todayPay)))} tone="danger" />
      </div>

      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">This month · {fmtDate(from)} – {fmtDate(today)}</h2>
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Production qty" value={v(qty(sum(prod, (r) => r.quantity)))} />
        <Stat label="Income" value={v(money(mIncome))} tone="success" />
        <Stat label="Expenses" value={v(money(mExpense))} tone="danger" />
        <Stat label="Net" value={v(money(net))} tone={net < 0 ? "danger" : "success"} sub="Income − Expenses" />
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-2">
        <Panel title="Machine-wise today">
          {pl ? <Empty>Loading…</Empty> : !byMachine.length ? <Empty>No production entered today.</Empty> : (
            <DataTable head={<tr><th>Machine</th><th className="text-right">Entries</th><th className="text-right">Qty</th></tr>}
              foot={<tr><td>Total</td><td className="text-right">{todayProd.length}</td><td className="text-right">{qty(sum(byMachine, (a) => a.qty))}</td></tr>}>
              {byMachine.map((a) => (
                <tr key={a.id}><td>{mN[a.id] ?? `#${a.id}`}</td><td className="num text-right">{a.n}</td><td className="num text-right font-medium">{qty(a.qty)}</td></tr>
              ))}
            </DataTable>
          )}
        </Panel>
        <Panel title="Employee-wise today">
          {pl ? <Empty>Loading…</Empty> : !byEmployee.length ? <Empty>No production entered today.</Empty> : (
            <DataTable head={<tr><th>Employee</th><th className="text-right">Qty</th><th className="text-right">Wage</th></tr>}
              foot={<tr><td>Total</td><td className="text-right">{qty(sum(byEmployee, (a) => a.qty))}</td><td className="text-right">{money(sum(byEmployee, (a) => a.wage))}</td></tr>}>
              {byEmployee.map((a) => (
                <tr key={a.id}><td>{eN[a.id] ?? `#${a.id}`}</td><td className="num text-right">{qty(a.qty)}</td><td className="num text-right font-medium">{money(a.wage)}</td></tr>
              ))}
            </DataTable>
          )}
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Recent production" actions={<Link to="/production" className="text-sm font-medium text-primary underline-offset-4 hover:underline">View all</Link>}>
          {rl ? <Empty>Loading…</Empty> : !recent?.length ? <Empty>No production recorded yet.</Empty> : (
            <DataTable head={<tr><th>Date</th><th>Machine</th><th>Product</th><th>Employee</th><th className="text-right">Qty</th><th className="text-right">Wage</th></tr>}>
              {recent.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap">{fmtDate(r.production_date)}</td>
                  <td>{mN[r.machine_id] ?? "—"}</td>
                  <td>{pN[r.product_id] ?? "—"}</td>
                  <td>{eN[r.employee_id] ?? "—"}</td>
                  <td className="num text-right">{qty(r.quantity)}</td>
                  <td className="num text-right font-medium">{money(r.wage_amount)}</td>
                </tr>
              ))}
            </DataTable>
          )}
        </Panel>
        <Panel title="Recent sales & deliveries" actions={<Link to="/deliveries" className="text-sm font-medium text-primary underline-offset-4 hover:underline">View all</Link>}>
          {dl ? <Empty>Loading…</Empty> : !recentDel?.length ? <Empty>No deliveries recorded yet.</Empty> : (
            <DataTable head={<tr><th>Date</th><th>Customer</th><th>Product</th><th className="text-right">Approved</th><th className="text-right">Bill</th><th>Status</th></tr>}>
              {recentDel.map((d) => (
                <tr key={d.id}>
                  <td className="whitespace-nowrap">{fmtDate(d.delivery_date)}</td>
                  <td>{cN[d.customer_id] ?? "—"}</td>
                  <td>{pN[d.product_id] ?? "—"}</td>
                  <td className="num text-right">{qty(d.approved_qty)}</td>
                  <td className="num text-right font-medium">{money(d.bill_amount)}</td>
                  <td><StatusBadge status={d.status} /></td>
                </tr>
              ))}
            </DataTable>
          )}
        </Panel>
      </div>
    </>
  );
}
