import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataTable, Empty, Field, PageHeader, Panel, Stat } from "@/components/app/ui";
import { SearchSelect } from "@/components/app/SearchSelect";
import { useEmployeeEntriesPage, useEmployees, useMachines, useProducts, useWageRows, WAGE_ROW_CAP, type Employee } from "@/lib/data";
import { fmtDate, money, monthStartStr, qty, todayStr } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/wages")({
  head: () => ({ meta: [{ title: "Employee Wages — LoomTrack" }, { name: "description", content: "Employee-wise piece-rate wages from daily production." }, { property: "og:title", content: "Employee Wages — LoomTrack" }, { property: "og:description", content: "Employee-wise piece-rate wages from daily production." }] }),
  component: WagesPage,
});

const PAGE = 25;
type Row = { emp: Employee | undefined; id: string; qty: number; wage: number; count: number };

function WagesPage() {
  const today = todayStr();
  const [from, setFrom] = useState(monthStartStr());
  const [to, setTo] = useState(today);
  const [empId, setEmpId] = useState("");
  const [view, setView] = useState<string | null>(null);

  const employees = useEmployees();
  const empById = useMemo(() => new Map((employees.data ?? []).map((e) => [e.id, e])), [employees.data]);
  const empOpts = useMemo(() => [...(employees.data ?? [])].sort((a, b) => a.record_no - b.record_no)
    .map((e) => ({ value: e.id, label: `${e.record_no} · ${e.name}${e.is_active ? "" : " (inactive)"}` })), [employees.data]);

  const rangeError = !from || !to ? "Both dates are required" : from > to ? "From date must be on or before To date" : to > today ? "To date cannot be in the future" : "";
  const wage = useWageRows(rangeError ? "" : from, rangeError ? "" : to, empId);

  const rows = useMemo<Row[]>(() => {
    const m = new Map<string, Row>();
    for (const r of wage.data ?? []) {
      const x = m.get(r.employee_id) ?? { id: r.employee_id, emp: empById.get(r.employee_id), qty: 0, wage: 0, count: 0 };
      x.qty += Number(r.quantity) || 0; x.wage += Number(r.wage_amount) || 0; x.count += 1;
      m.set(r.employee_id, x);
    }
    return [...m.values()].sort((a, b) => (a.emp?.record_no ?? Infinity) - (b.emp?.record_no ?? Infinity));
  }, [wage.data, empById]);

  const tot = rows.reduce((t, r) => ({ qty: t.qty + r.qty, wage: t.wage + r.wage, count: t.count + r.count }), { qty: 0, wage: 0, count: 0 });
  const capped = (wage.data?.length ?? 0) >= WAGE_ROW_CAP;

  return (
    <div className="space-y-5">
      <PageHeader title="Employee Wages" subtitle="Piece-rate wages from saved production entries" />

      <Panel>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="From" htmlFor="wf" required><Input id="wf" type="date" required value={from} max={to || today} onChange={(e) => setFrom(e.target.value)} className="h-12" /></Field>
          <Field label="To" htmlFor="wt" required error={rangeError || undefined}><Input id="wt" type="date" required value={to} min={from} max={today} onChange={(e) => setTo(e.target.value)} className="h-12" /></Field>
          <Field label="Employee"><SearchSelect options={empOpts} value={empId} onChange={setEmpId} allowClear placeholder="All employees" /></Field>
        </div>
      </Panel>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total production qty" value={qty(tot.qty)} />
        <Stat label="Total wage" value={money(tot.wage)} tone="accent" />
        <Stat label="Production entries" value={String(tot.count)} />
        {!empId && <Stat label="Employees" value={String(rows.length)} />}
      </div>

      {capped && <p className="text-sm text-destructive">This period has more than {WAGE_ROW_CAP.toLocaleString()} entries — totals may be incomplete. Please choose a shorter date range.</p>}

      <Panel title="Employee-wise summary">
        {wage.isLoading ? <Empty>Loading…</Empty> : wage.error ? <Empty>Could not load wages.</Empty> : rows.length === 0 ? <Empty>No production entries for this period.</Empty> : (
          <DataTable
            head={<tr><th>No.</th><th>Employee</th><th className="text-right">Qty</th><th className="text-right">Wage</th><th className="text-right">Entries</th><th /></tr>}
            foot={<tr><td /><td>Total</td><td className="text-right">{qty(tot.qty)}</td><td className="text-right">{money(tot.wage)}</td><td className="text-right">{tot.count}</td><td /></tr>}
          >
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="tabular-nums">{r.emp?.record_no ?? "—"}</td>
                <td>{r.emp?.name ?? "Unknown employee"}</td>
                <td className="text-right tabular-nums">{qty(r.qty)}</td>
                <td className="text-right tabular-nums font-medium">{money(r.wage)}</td>
                <td className="text-right tabular-nums">{r.count}</td>
                <td className="text-right"><Button size="sm" variant="ghost" onClick={() => setView(r.id)}><Eye className="mr-1 h-4 w-4" />View</Button></td>
              </tr>
            ))}
          </DataTable>
        )}
      </Panel>

      {view && <EntriesDialog employeeId={view} emp={empById.get(view)} from={from} to={to} onClose={() => setView(null)} />}
    </div>
  );
}

function EntriesDialog({ employeeId, emp, from, to, onClose }: { employeeId: string; emp: Employee | undefined; from: string; to: string; onClose: () => void }) {
  const [page, setPage] = useState(0);
  const q = useEmployeeEntriesPage(employeeId, from, to, page, PAGE);
  const machines = useMachines();
  const products = useProducts();
  const mName = useMemo(() => new Map((machines.data ?? []).map((m) => [m.id, m.name])), [machines.data]);
  const pName = useMemo(() => new Map((products.data ?? []).map((p) => [p.id, `${p.code} · ${p.name}`])), [products.data]);
  const total = q.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader><DialogTitle>{emp ? `${emp.record_no} · ${emp.name}` : "Employee"} — {fmtDate(from)} to {fmtDate(to)}</DialogTitle></DialogHeader>
        {q.isLoading ? <Empty>Loading…</Empty> : !q.data?.rows.length ? <Empty>No entries.</Empty> : (
          <DataTable head={<tr><th>Date</th><th>Prod. No.</th><th>Machine</th><th>Product</th><th className="text-right">Qty</th><th className="text-right">Rate</th><th className="text-right">Wage</th></tr>}>
            {q.data.rows.map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap">{fmtDate(r.production_date)}</td>
                <td className="tabular-nums">{r.record_no}</td>
                <td>{mName.get(r.machine_id) ?? "—"}</td>
                <td>{pName.get(r.product_id) ?? "—"}</td>
                <td className="text-right tabular-nums">{qty(r.quantity)}</td>
                <td className="text-right tabular-nums">{money(r.piece_rate)}</td>
                <td className="text-right tabular-nums font-medium">{money(r.wage_amount)}</td>
              </tr>
            ))}
          </DataTable>
        )}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{total ? `${page * PAGE + 1}–${Math.min(total, (page + 1) * PAGE)} of ${total}` : ""}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page === 0 || q.isFetching} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button size="sm" variant="outline" disabled={page + 1 >= pages || q.isFetching} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
