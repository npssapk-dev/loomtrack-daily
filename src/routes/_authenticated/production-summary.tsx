import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, Empty, Field, PageHeader, Panel, Stat } from "@/components/app/ui";
import { SearchSelect } from "@/components/app/SearchSelect";
import {
  useEmployees, useMachines, useProducts, useProductionFilteredPage, useProductionSummaryRows, WAGE_ROW_CAP, type ProdFilter,
} from "@/lib/data";
import { fmtDate, money, monthStartStr, qty, todayStr } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/production-summary")({
  head: () => ({ meta: [{ title: "Production Summary — LoomTrack" }, { name: "description", content: "Production trends by date, employee, machine and product." }, { property: "og:title", content: "Production Summary — LoomTrack" }, { property: "og:description", content: "Production trends by date, employee, machine and product." }] }),
  component: SummaryPage,
});

const PAGE = 25;
const tip = { contentStyle: { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 } };

function group<T>(rows: T[], key: (r: T) => string) {
  const m = new Map<string, number>();
  for (const r of rows) m.set(key(r), (m.get(key(r)) ?? 0) + Number((r as { quantity: number }).quantity || 0));
  return m;
}

function SummaryPage() {
  const today = todayStr();
  const [from, setFrom] = useState(monthStartStr());
  const [to, setTo] = useState(today);
  const [employeeId, setEmp] = useState("");
  const [machineId, setMac] = useState("");
  const [productId, setProd] = useState("");
  const [page, setPage] = useState(0);

  const rangeError = !from || !to ? "Both dates are required" : from > to ? "From must be on or before To" : to > today ? "To date cannot be in the future" : "";
  const f: ProdFilter = rangeError ? { from: "", to: "", employeeId, machineId, productId } : { from, to, employeeId, machineId, productId };
  const reset = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); setPage(0); };

  const emps = useEmployees(); const macs = useMachines(); const prods = useProducts();
  const eMap = useMemo(() => new Map((emps.data ?? []).map((e) => [e.id, e])), [emps.data]);
  const mMap = useMemo(() => new Map((macs.data ?? []).map((m) => [m.id, m])), [macs.data]);
  const pMap = useMemo(() => new Map((prods.data ?? []).map((p) => [p.id, p])), [prods.data]);
  const byNo = <T extends { id: number }>(l?: T[]) => [...(l ?? [])].sort((a, b) => a.id - b.id);
  const eOpts = byNo(emps.data).map((e) => ({ value: String(e.id), label: `${e.id} · ${e.name}` }));
  const mOpts = byNo(macs.data).map((m) => ({ value: String(m.id), label: `${m.id} · ${m.name}` }));
  const pOpts = byNo(prods.data).map((p) => ({ value: String(p.id), label: `${p.id} · ${p.code} · ${p.name}` }));

  const s = useProductionSummaryRows(f);
  const rows = s.data ?? [];
  const tot = rows.reduce((t, r) => ({ q: t.q + Number(r.quantity || 0), w: t.w + Number(r.wage_amount || 0) }), { q: 0, w: 0 });
  const empCount = new Set(rows.map((r) => r.employee_id)).size;
  const macCount = new Set(rows.map((r) => r.machine_id)).size;

  const trend = useMemo(() => [...group(rows, (r) => r.production_date)].sort(([a], [b]) => a.localeCompare(b)).map(([d, q]) => ({ name: fmtDate(d), qty: q })), [rows]);
  const top = (m: Map<number | string, number>, label: (id: number) => string) => [...m].map(([id, q]) => ({ name: label(Number(id)), qty: q })).sort((a, b) => b.qty - a.qty).slice(0, 10);
  const byEmp = useMemo(() => top(group(rows, (r) => r.employee_id), (id) => eMap.get(id)?.name ?? "Unknown"), [rows, eMap]);
  const byMac = useMemo(() => top(group(rows, (r) => r.machine_id), (id) => mMap.get(id)?.name ?? "Unknown"), [rows, mMap]);
  const byProd = useMemo(() => top(group(rows, (r) => r.product_id), (id) => pMap.get(id)?.code ?? "Unknown"), [rows, pMap]);

  const d = useProductionFilteredPage(f, page, PAGE);
  const total = d.data?.total ?? 0;

  return (
    <div className="space-y-5">
      <PageHeader title="Production Summary" subtitle="Trends and contribution from saved production entries" />
      <Panel>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="From" htmlFor="sf" required><Input id="sf" type="date" required value={from} max={to || today} onChange={(e) => reset(setFrom)(e.target.value)} className="h-12" /></Field>
          <Field label="To" htmlFor="st" required error={rangeError || undefined}><Input id="st" type="date" required value={to} min={from} max={today} onChange={(e) => reset(setTo)(e.target.value)} className="h-12" /></Field>
          <Field label="Employee"><SearchSelect options={eOpts} value={employeeId} onChange={reset(setEmp)} allowClear placeholder="All employees" /></Field>
          <Field label="Machine"><SearchSelect options={mOpts} value={machineId} onChange={reset(setMac)} allowClear placeholder="All machines" /></Field>
          <Field label="Product"><SearchSelect options={pOpts} value={productId} onChange={reset(setProd)} allowClear placeholder="All products" /></Field>
        </div>
      </Panel>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Production qty" value={qty(tot.q)} />
        <Stat label="Wage amount" value={money(tot.w)} tone="accent" />
        <Stat label="Entries" value={String(rows.length)} />
        <Stat label="Employees involved" value={String(empCount)} />
        <Stat label="Machines involved" value={String(macCount)} />
      </div>
      {rows.length >= WAGE_ROW_CAP && <p className="text-sm text-destructive">More than {WAGE_ROW_CAP.toLocaleString()} entries in this period — figures may be incomplete. Choose a shorter range.</p>}

      {s.isLoading ? <Empty>Loading…</Empty> : rows.length === 0 ? <Empty>No production entries for these filters.</Empty> : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Daily production quantity">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trend}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="name" fontSize={11} /><YAxis fontSize={11} width={48} /><Tooltip {...tip} /><Line type="monotone" dataKey="qty" name="Qty" stroke="var(--chart-1)" strokeWidth={2} dot={false} /></LineChart>
            </ResponsiveContainer>
          </Panel>
          <ChartBars title="By employee (top 10)" data={byEmp} color="var(--chart-2)" />
          <ChartBars title="By machine (top 10)" data={byMac} color="var(--chart-3)" />
          <ChartBars title="By product (top 10)" data={byProd} color="var(--chart-4)" />
        </div>
      )}

      <Panel title="Entries">
        {d.isLoading ? <Empty>Loading…</Empty> : !d.data?.rows.length ? <Empty>No entries.</Empty> : (
          <DataTable head={<tr><th>Date</th><th>Prod. No.</th><th>Employee</th><th>Machine</th><th>Product</th><th className="text-right">Qty</th><th className="text-right">Rate</th><th className="text-right">Wage</th></tr>}>
            {d.data.rows.map((r) => {
              const e = eMap.get(r.employee_id); const p = pMap.get(r.product_id);
              return (
                <tr key={r.id}>
                  <td className="whitespace-nowrap">{fmtDate(r.production_date)}</td>
                  <td className="tabular-nums">{r.id}</td>
                  <td>{e ? `${e.id} · ${e.name}` : "—"}</td>
                  <td>{mMap.get(r.machine_id)?.name ?? "—"}</td>
                  <td>{p ? `${p.code} · ${p.name}` : "—"}</td>
                  <td className="text-right tabular-nums">{qty(r.quantity)}</td>
                  <td className="text-right tabular-nums">{money(r.piece_rate)}</td>
                  <td className="text-right tabular-nums font-medium">{money(r.wage_amount)}</td>
                </tr>
              );
            })}
          </DataTable>
        )}
        <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
          <span>{total ? `${page * PAGE + 1}–${Math.min(total, (page + 1) * PAGE)} of ${total}` : ""}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page === 0 || d.isFetching} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button size="sm" variant="outline" disabled={(page + 1) * PAGE >= total || d.isFetching} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function ChartBars({ title, data, color }: { title: string; data: { name: string; qty: number }[]; color: string }) {
  return (
    <Panel title={title}>
      <ResponsiveContainer width="100%" height={Math.max(160, data.length * 28 + 40)}>
        <BarChart data={data} layout="vertical" margin={{ left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
          <XAxis type="number" fontSize={11} /><YAxis type="category" dataKey="name" width={96} fontSize={11} />
          <Tooltip {...tip} /><Bar dataKey="qty" name="Qty" fill={color} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Panel>
  );
}
