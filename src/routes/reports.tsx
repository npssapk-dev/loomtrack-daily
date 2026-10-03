import { useMemo, useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, Panel, Field, Stat, DataTable, DateInput, Empty } from "@/components/app/ui";
import { SearchSelect, type Option } from "@/components/app/SearchSelect";
import {
  db, useBusinessId, useMachines, useProducts, useEmployees, useCustomers, usePaymentTypes, errMsg,
} from "@/lib/data";
import { downloadCsv, fmtDate, fmtDateTime, money, monthStartStr, qty, todayStr } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Reports — LoomTrack" },
      { name: "description", content: "Production, wage, income & expense and delivery reports with CSV export." },
      { property: "og:title", content: "Reports — LoomTrack" },
      { property: "og:description", content: "Production, wage, income & expense and delivery reports with CSV export." },
    ],
  }),
  component: ReportsPage,
});

type Kind = "production" | "machines" | "wages" | "payments" | "profit" | "deliveries";
const CAP = 20000;
const PAGE = 25;
type Cell = string | number | null;
type Col = { h: string; num?: boolean; fmt?: (v: Cell) => string };

function ReportsPage() {
  const bid = useBusinessId();
  const today = todayStr();
  const [kind, setKind] = useState<Kind>("production");
  const [from, setFrom] = useState(monthStartStr());
  const [to, setTo] = useState(today);
  const [f, setF] = useState<Partial<Record<"employee" | "machine" | "product" | "type" | "customer" | "direction", string>>>({});
  const [page, setPage] = useState(0);
  const set = (k: keyof typeof f, v: string) => { setF((p) => ({ ...p, [k]: v })); setPage(0); };

  const machines = useMachines().data ?? [];
  const products = useProducts().data ?? [];
  const employees = useEmployees().data ?? [];
  const customers = useCustomers().data ?? [];
  const types = usePaymentTypes().data ?? [];
  const mN = Object.fromEntries(machines.map((x) => [x.id, x.name]));
  const pN = Object.fromEntries(products.map((x) => [x.id, `${x.code} · ${x.name}`]));
  const eN = Object.fromEntries(employees.map((x) => [x.id, `${x.id} · ${x.name}`]));
  const cN = Object.fromEntries(customers.map((x) => [x.id, `${x.id} · ${x.name}`]));
  const tMap = Object.fromEntries(types.map((x) => [x.id, x]));

  const dateErr = from > today || to > today ? "Dates cannot be in the future" : from > to ? "From must be on or before To" : "";

  const q = useQuery({
    queryKey: ["report", kind, bid, from, to, f],
    enabled: !!bid && !dateErr,
    queryFn: async () => {
      let r;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let pays: any[] = [];
      if (kind === "wages") {
        // Employee-linked payments (salary, advances, etc.) reduce the wage balance.
        let pq = db.from("payments").select("employee_id,amount,payment_type_id").eq("business_id", bid)
          .gte("payment_date", from).lte("payment_date", to).not("employee_id", "is", null);
        if (f.employee) pq = pq.eq("employee_id", Number(f.employee));
        const pr = await pq.limit(CAP);
        if (pr.error) throw pr.error;
        pays = pr.data ?? [];
      }
      if (kind === "production" || kind === "machines" || kind === "wages") {
        r = db.from("production_entries").select("id,production_date,machine_id,product_id,employee_id,quantity,piece_rate,wage_amount,created_at")
          .eq("business_id", bid).gte("production_date", from).lte("production_date", to);
        if (f.employee) r = r.eq("employee_id", Number(f.employee));
        if (kind !== "wages" && f.machine) r = r.eq("machine_id", Number(f.machine));
        if (kind !== "wages" && f.product) r = r.eq("product_id", Number(f.product));
        r = kind === "wages"
          ? r.order("employee_id").order("production_date", { ascending: false }).order("id", { ascending: false })
          : r.order("production_date", { ascending: false }).order("created_at", { ascending: false }).order("id", { ascending: false });
      } else if (kind === "payments" || kind === "profit") {
        r = db.from("payments").select("id,payment_date,payment_type_id,amount,employee_id,description,created_at")
          .eq("business_id", bid).gte("payment_date", from).lte("payment_date", to);
        if (f.type) r = r.eq("payment_type_id", Number(f.type));
        if (f.employee) r = r.eq("employee_id", Number(f.employee));
        r = r.order("payment_date", { ascending: false }).order("created_at", { ascending: false }).order("id", { ascending: false });
      } else {
        r = db.from("deliveries").select("id,delivery_date,customer_id,product_id,delivered_qty,approved_qty,rejected_qty,rate,bill_amount,status,created_at")
          .eq("business_id", bid).gte("delivery_date", from).lte("delivery_date", to);
        if (f.customer) r = r.eq("customer_id", Number(f.customer));
        if (f.product) r = r.eq("product_id", Number(f.product));
        r = r.order("delivery_date", { ascending: false }).order("created_at", { ascending: false }).order("id", { ascending: false });
      }
      const { data, error } = await r.limit(CAP);
      if (error) throw error;
      return { rows: data as any[], pays, at: new Date() };
    },
  });

  const raw = q.data?.rows ?? [];
  const N = (v: unknown) => Number(v ?? 0);

  const report = useMemo(() => {
    let cols: Col[] = [];
    let rows: Cell[][] = [];
    let stats: { label: string; value: string; tone?: "accent" | "success" | "danger" }[] = [];
    let foot: Cell[] = [];
    const Q = (v: Cell) => qty(v as number), M = (v: Cell) => money(v as number), D = (v: Cell) => fmtDate(v as string);
    if (kind === "production") {
      let tq = 0, tw = 0;
      cols = [{ h: "Date", fmt: D }, { h: "Prod. No." }, { h: "Machine" }, { h: "Product" }, { h: "Employee" }, { h: "Qty", num: true, fmt: Q }, { h: "Piece rate", num: true, fmt: M }, { h: "Wage", num: true, fmt: M }];
      rows = raw.map((x) => { tq += N(x.quantity); tw += N(x.wage_amount); return [x.production_date, x.id, mN[x.machine_id] ?? "—", pN[x.product_id] ?? "—", eN[x.employee_id] ?? "—", N(x.quantity), N(x.piece_rate), N(x.wage_amount)]; });
      foot = ["Total", "", "", "", "", tq, "", tw];
      stats = [{ label: "Total quantity", value: qty(tq) }, { label: "Total wage", value: money(tw), tone: "accent" }, { label: "Entries", value: String(raw.length) }];
    } else if (kind === "machines") {
      const g = new Map<number, { n: number; q: number; w: number }>();
      for (const x of raw) { const v = g.get(x.machine_id) ?? { n: 0, q: 0, w: 0 }; v.n++; v.q += N(x.quantity); v.w += N(x.wage_amount); g.set(x.machine_id, v); }
      let tq = 0, tw = 0;
      cols = [{ h: "Machine" }, { h: "Entries", num: true }, { h: "Qty", num: true, fmt: Q }, { h: "Wage", num: true, fmt: M }, { h: "Share %", num: true }];
      const total = [...g.values()].reduce((a, v) => a + v.q, 0);
      rows = [...g.entries()].sort((a, b) => b[1].q - a[1].q).map(([id, v]) => { tq += v.q; tw += v.w; return [mN[id] ?? `#${id}`, v.n, v.q, v.w, total ? (v.q * 100 / total).toFixed(1) : "0.0"]; });
      foot = ["Total", raw.length, tq, tw, "100.0"];
      stats = [{ label: "Machines", value: String(g.size) }, { label: "Total quantity", value: qty(tq) }, { label: "Total wage", value: money(tw), tone: "accent" }, { label: "Avg qty / machine", value: qty(g.size ? tq / g.size : 0) }];
    } else if (kind === "wages") {
      const pays = q.data?.pays ?? [];
      const g = new Map<number, { n: number; q: number; w: number; p: number }>();
      const get = (id: number) => g.get(id) ?? { n: 0, q: 0, w: 0, p: 0 };
      for (const x of raw) { const v = get(x.employee_id); v.n++; v.q += N(x.quantity); v.w += N(x.wage_amount); g.set(x.employee_id, v); }
      for (const x of pays) {
        const dirn = tMap[x.payment_type_id]?.direction;
        const v = get(x.employee_id);
        v.p += dirn === "INCOME" ? -N(x.amount) : N(x.amount); // recoveries from employee reduce amount paid
        g.set(x.employee_id, v);
      }
      let tq = 0, tw = 0, tp = 0;
      cols = [{ h: "Employee" }, { h: "Entries", num: true }, { h: "Qty", num: true, fmt: Q }, { h: "Wage earned", num: true, fmt: M }, { h: "Paid / advances", num: true, fmt: M }, { h: "Balance", num: true, fmt: M }];
      rows = [...g.entries()].sort((a, b) => a[0] - b[0]).map(([id, v]) => { tq += v.q; tw += v.w; tp += v.p; return [eN[id] ?? `#${id}`, v.n, v.q, v.w, v.p, v.w - v.p]; });
      foot = ["Total", raw.length, tq, tw, tp, tw - tp];
      stats = [{ label: "Total quantity", value: qty(tq) }, { label: "Wage earned", value: money(tw), tone: "accent" }, { label: "Paid / advances", value: money(tp), tone: "danger" }, { label: "Balance payable", value: money(tw - tp), tone: tw - tp < 0 ? "danger" : "success" }, { label: "Employees", value: String(g.size) }];
    } else if (kind === "profit") {
      const g = new Map<number, number>();
      for (const x of raw) g.set(x.payment_type_id, (g.get(x.payment_type_id) ?? 0) + N(x.amount));
      let inc = 0, exp = 0;
      cols = [{ h: "Direction" }, { h: "Payment type" }, { h: "Income", num: true, fmt: M }, { h: "Expense", num: true, fmt: M }];
      rows = [...g.entries()].map(([id, amt]) => ({ t: tMap[id], id, amt }))
        .sort((a, b) => (a.t?.direction ?? "").localeCompare(b.t?.direction ?? "") * -1 || b.amt - a.amt)
        .map(({ t, id, amt }) => {
          const isInc = t?.direction === "INCOME";
          if (isInc) inc += amt; else exp += amt;
          return [isInc ? "Income" : "Expense", t ? t.description : `#${id}`, isInc ? amt : "", isInc ? "" : amt];
        });
      foot = [`Net ${money(inc - exp)}`, "", inc, exp];
      const margin = inc ? ((inc - exp) * 100 / inc).toFixed(1) + "%" : "—";
      stats = [{ label: "Income", value: money(inc), tone: "success" }, { label: "Expenses", value: money(exp), tone: "danger" }, { label: "Net profit", value: money(inc - exp), tone: inc - exp < 0 ? "danger" : "accent" }, { label: "Net margin", value: margin }];
    } else if (kind === "payments") {
      let inc = 0, exp = 0;
      const dirF = f.direction;
      const list = raw.filter((x) => !dirF || tMap[x.payment_type_id]?.direction === dirF);
      cols = [{ h: "Date", fmt: D }, { h: "Payment No." }, { h: "Payment type" }, { h: "Direction" }, { h: "Amount", num: true, fmt: M }, { h: "Employee" }, { h: "Description" }];
      rows = list.map((x) => {
        const t = tMap[x.payment_type_id];
        if (t?.direction === "INCOME") inc += N(x.amount); else if (t?.direction === "EXPENSE") exp += N(x.amount);
        return [x.payment_date, x.id, t ? `${t.id} · ${t.description}` : "—", t ? (t.direction === "INCOME" ? "Income" : "Expense") : "—", N(x.amount), x.employee_id ? eN[x.employee_id] ?? "—" : "", x.description ?? ""];
      });
      foot = ["Total", "", "", "", inc - exp, "", "Net"];
      stats = [{ label: "Total income", value: money(inc), tone: "success" }, { label: "Total expense", value: money(exp), tone: "danger" }, { label: "Net", value: money(inc - exp), tone: "accent" }, { label: "Transactions", value: String(list.length) }];
    } else {
      let d = 0, a = 0, rj = 0, b = 0;
      cols = [{ h: "Date", fmt: D }, { h: "Delivery No." }, { h: "Customer" }, { h: "Product" }, { h: "Delivered", num: true, fmt: Q }, { h: "Approved", num: true, fmt: Q }, { h: "Rejected", num: true, fmt: Q }, { h: "Rate", num: true, fmt: M }, { h: "Bill", num: true, fmt: M }, { h: "Status" }];
      rows = raw.map((x) => { d += N(x.delivered_qty); a += N(x.approved_qty); rj += N(x.rejected_qty); b += N(x.bill_amount); return [x.delivery_date, x.id, cN[x.customer_id] ?? "—", pN[x.product_id] ?? "—", N(x.delivered_qty), N(x.approved_qty), N(x.rejected_qty), N(x.rate), N(x.bill_amount), x.status ?? ""]; });
      foot = ["Total", "", "", "", d, a, rj, "", b, ""];
      stats = [{ label: "Delivered", value: qty(d) }, { label: "Approved", value: qty(a), tone: "success" }, { label: "Rejected", value: qty(rj), tone: "danger" }, { label: "Bill amount", value: money(b), tone: "accent" }, { label: "Deliveries", value: String(raw.length) }];
    }
    return { cols, rows, stats, foot };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw, q.data?.pays, kind, f.direction, machines, products, employees, customers, types]);

  const pages = Math.max(1, Math.ceil(report.rows.length / PAGE));
  const shown = report.rows.slice(page * PAGE, page * PAGE + PAGE);
  const show = (c: Col, v: Cell) => (v === "" || v == null ? "" : c.fmt ? c.fmt(v) : String(v));

  const exportCsv = () => {
    downloadCsv(`loomtrack-${kind}-${from}-to-${to}.csv`, report.cols.map((c) => c.h),
      [...report.rows, report.foot]);
  };

  const opts = (list: { id: number; label: string }[]): Option[] => list.map((x) => ({ value: String(x.id), label: x.label }));
  const empO = opts(employees.map((x) => ({ id: x.id, label: `${x.id} · ${x.name}` })));
  const prodO = opts(products.map((x) => ({ id: x.id, label: `${x.id} · ${x.code} · ${x.name}` })));
  const filters: ReactNode[] = [];
  const sel = (k: keyof typeof f, label: string, o: Option[], ph: string) => filters.push(
    <Field key={k} label={label}><SearchSelect options={o} value={f[k] ?? ""} onChange={(v) => set(k, v)} allowClear placeholder={ph} /></Field>);
  if (kind === "production" || kind === "machines") {
    sel("machine", "Machine", opts(machines.map((x) => ({ id: x.id, label: `${x.id} · ${x.name}` }))), "All machines");
    sel("product", "Product", prodO, "All products");
    sel("employee", "Employee", empO, "All employees");
  } else if (kind === "wages") sel("employee", "Employee", empO, "All employees");
  else if (kind === "payments") {
    sel("type", "Payment type", opts(types.map((x) => ({ id: x.id, label: `${x.id} · ${x.description}` }))), "All types");
    sel("direction", "Direction", [{ value: "INCOME", label: "Income" }, { value: "EXPENSE", label: "Expense" }], "All");
    sel("employee", "Employee", empO, "All employees");
  } else if (kind === "deliveries") {
    sel("customer", "Customer", opts(customers.map((x) => ({ id: x.id, label: `${x.id} · ${x.name}` }))), "All customers");
    sel("product", "Product", prodO, "All products");
  }

  return (
    <>
      <PageHeader title="Reports" actions={
        <Button variant="outline" onClick={exportCsv} disabled={!report.rows.length}><Download className="mr-1 h-4 w-4" />Export CSV</Button>
      } />
      <div className="space-y-4">
        <Tabs value={kind} onValueChange={(v) => { setKind(v as Kind); setF({}); setPage(0); }}>
          <TabsList className="flex h-auto w-full flex-wrap justify-start">
            <TabsTrigger value="production">Production</TabsTrigger>
            <TabsTrigger value="machines">Machine-wise</TabsTrigger>
            <TabsTrigger value="wages">Employee Wages</TabsTrigger>
            <TabsTrigger value="payments">Income & Expense</TabsTrigger>
            <TabsTrigger value="profit">Profit Summary</TabsTrigger>
            <TabsTrigger value="deliveries">Sales & Delivery</TabsTrigger>
          </TabsList>
        </Tabs>

        <Panel>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Field label="From" htmlFor="rf" required error={dateErr || undefined}>
              <DateInput id="rf" required max={today} value={from} onChange={(e) => { setFrom(e.target.value); setPage(0); }} />
            </Field>
            <Field label="To" htmlFor="rt" required>
              <DateInput id="rt" required max={today} value={to} onChange={(e) => { setTo(e.target.value); setPage(0); }} />
            </Field>
            {filters}
          </div>
        </Panel>

        <p className="text-xs text-muted-foreground">
          Period {fmtDate(from)} – {fmtDate(to)}
          {q.data && <> · Generated {fmtDateTime(q.data.at)}</>}
          {raw.length >= CAP && <span className="text-destructive"> · Showing the first {CAP.toLocaleString()} records — narrow the dates.</span>}
        </p>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {report.stats.map((s) => <Stat key={s.label} label={s.label} value={s.value} {...(s.tone ? { tone: s.tone } : {})} />)}
        </div>

        <Panel>
          {q.isError ? <Empty>{errMsg(q.error)}</Empty>
            : q.isLoading ? <Empty>Loading…</Empty>
            : !report.rows.length ? <Empty>No records for the selected period and filters.</Empty>
            : (
              <div>
                <DataTable
                  head={<tr>{report.cols.map((c) => <th key={c.h} className={c.num ? "text-right" : ""}>{c.h}</th>)}</tr>}
                  foot={<tr className="font-semibold">{report.cols.map((c, i) => <td key={c.h} className={`px-4 py-2.5 ${c.num ? "num text-right" : ""}`}>{show(c, report.foot[i] ?? "")}</td>)}</tr>}
                >
                  {shown.map((r, ri) => (
                    <tr key={ri} className="border-b last:border-0">
                      {report.cols.map((c, i) => <td key={c.h} className={`px-4 py-2.5 ${c.num ? "num text-right" : ""}`}>{show(c, r[i] ?? "")}</td>)}
                    </tr>
                  ))}
                </DataTable>
                <div className="flex items-center justify-between gap-2 py-3 text-sm text-muted-foreground">
                  <span>{page * PAGE + 1}–{Math.min((page + 1) * PAGE, report.rows.length)} of {report.rows.length}</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
                    <Button size="sm" variant="outline" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Next</Button>
                  </div>
                </div>
              </div>
            )}
        </Panel>
      </div>
    </>
  );
}
