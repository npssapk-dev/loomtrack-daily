import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { DataTable, Empty, PageHeader, Panel, Stat } from "@/components/app/ui";
import {
  nameMap, sum, useEmployees, useMachines, usePayments, usePaymentTypes, useProducts, useProductionEntries, useRecentProduction,
} from "@/lib/data";
import { fmtDate, money, monthStartStr, qty, todayStr } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — LoomTrack" }, { name: "description", content: "This month's production, wages, income and expenses at a glance." }, { property: "og:title", content: "Dashboard — LoomTrack" }, { property: "og:description", content: "This month's production, wages, income and expenses at a glance." }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const from = monthStartStr();
  const to = todayStr();
  const { data: prod, isLoading: pl } = useProductionEntries(from, to);
  const { data: payments, isLoading: payl } = usePayments(from, to);
  const { data: types } = usePaymentTypes();
  const { data: recent, isLoading: rl } = useRecentProduction(5);
  const { data: machines } = useMachines();
  const { data: products } = useProducts();
  const { data: employees } = useEmployees();

  const mN = nameMap(machines), pN = nameMap(products), eN = nameMap(employees);
  const dir = useMemo(() => Object.fromEntries((types ?? []).map((t) => [t.id, t.direction])), [types]);
  const income = sum(payments?.filter((p) => dir[p.payment_type_id] === "INCOME"), (p) => p.amount);
  const expense = sum(payments?.filter((p) => dir[p.payment_type_id] === "EXPENSE"), (p) => p.amount);
  const net = income - expense;
  const loading = pl || payl;
  const v = (s: string) => (loading ? "…" : s);

  return (
    <>
      <PageHeader title="Dashboard" subtitle={`${fmtDate(from)} – ${fmtDate(to)}`} />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Production qty" value={v(qty(sum(prod, (r) => r.quantity)))} />
        <Stat label="Production wages" value={v(money(sum(prod, (r) => r.wage_amount)))} tone="accent" />
        <Stat label="Production entries" value={v(String(prod?.length ?? 0))} />
        <Stat label="Total income" value={v(money(income))} tone="success" />
        <Stat label="Total expenses" value={v(money(expense))} tone="danger" />
        <Stat label="Net cash flow" value={v(money(net))} tone={net < 0 ? "danger" : "success"} sub="Income − Expenses" />
      </div>
      <Panel title="Recent production">
        {rl ? <Empty>Loading…</Empty> : !recent?.length ? <Empty>No production recorded yet.</Empty> : (
          <DataTable head={<tr><th>No.</th><th>Date</th><th>Machine</th><th>Product</th><th>Employee</th><th className="text-right">Qty</th><th className="text-right">Wage</th></tr>}>
            {recent.map((r) => (
              <tr key={r.id}>
                <td className="num">{r.id}</td>
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
    </>
  );
}
