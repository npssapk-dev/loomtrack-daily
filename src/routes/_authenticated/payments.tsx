import { useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataTable, Empty, Field, PageHeader, Panel, Stat } from "@/components/app/ui";
import { SearchSelect } from "@/components/app/SearchSelect";
import {
  db, errMsg, useBusinessId, useEmployees, useInvalidateAll, usePaymentsPage, usePaymentTotalsRows, usePaymentTypes, useUserNames,
  PAY_ROW_CAP, type Direction, type Payment,
} from "@/lib/data";
import { fmtDate, money, monthStartStr, todayStr } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/payments")({
  head: () => ({ meta: [{ title: "Income & Expenses — LoomTrack" }, { name: "description", content: "Record income and expense payments; direction comes from the payment type." }, { property: "og:title", content: "Income & Expenses — LoomTrack" }, { property: "og:description", content: "Record income and expense payments; direction comes from the payment type." }] }),
  component: PaymentsScreen,
});

const PAGE = 25;
const fmtDateTime = (s?: string | null) => (s ? new Date(s).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—");
type Form = { entry?: Payment; payment_date: string; payment_type_id: string; amount: string; employee_id: string; description: string };

function DirBadge({ d }: { d?: Direction | undefined }) {
  if (!d) return <span>—</span>;
  return <span className={"rounded px-1.5 py-0.5 text-xs font-semibold " + (d === "INCOME" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive")}>{d === "INCOME" ? "Income" : "Expense"}</span>;
}

function PaymentsScreen() {
  const bid = useBusinessId();
  const today = todayStr();
  const [from, setFrom] = useState(monthStartStr());
  const [to, setTo] = useState(today);
  const [typeF, setTypeF] = useState("");
  const [dirF, setDirF] = useState<"" | Direction>("");
  const [page, setPage] = useState(0);
  const { data: types } = usePaymentTypes();
  const { data: employees } = useEmployees();
  const invalidate = useInvalidateAll();

  const typeById = useMemo(() => new Map((types ?? []).map((t) => [t.id, t])), [types]);
  const empById = useMemo(() => new Map((employees ?? []).map((e) => [e.id, e])), [employees]);

  // View-only filters: direction resolves to the payment types with that direction.
  const typeIds = useMemo(() => {
    if (typeF) return [Number(typeF)];
    if (dirF) return (types ?? []).filter((t) => t.direction === dirF).map((t) => t.id);
    return null;
  }, [typeF, dirF, types]);
  const rangeError = !from || !to ? "Both dates are required" : from > to ? "From must be on or before To" : to > today ? "To date cannot be in the future" : "";
  const filter = { from: rangeError ? "" : from, to: rangeError ? "" : to, typeIds };
  const pageQ = usePaymentsPage(filter, page, PAGE);
  const totQ = usePaymentTotalsRows(filter);
  const rows = pageQ.data?.rows ?? [];
  const total = pageQ.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const { data: names } = useUserNames(rows.flatMap((r) => [r.created_by, r.updated_by]));
  const who = (id?: string | null) => (!id ? "System/Existing" : names?.[id] ?? "User");

  const totals = useMemo(() => {
    let inc = 0, exp = 0;
    for (const r of totQ.data ?? []) {
      const d = typeById.get(r.payment_type_id)?.direction;
      if (d === "INCOME") inc += Number(r.amount) || 0; else if (d === "EXPENSE") exp += Number(r.amount) || 0;
    }
    return { inc, exp, count: totQ.data?.length ?? 0 };
  }, [totQ.data, typeById]);
  const capped = (totQ.data?.length ?? 0) >= PAY_ROW_CAP;

  const activeTypes = (types ?? []).filter((t) => t.is_active);
  const typeLabel = (t: { id: number; description: string }) => `${t.id} · ${t.description}`;
  const filterTypeOpts = (types ?? []).map((t) => ({ value: String(t.id), label: typeLabel(t), hint: t.direction === "INCOME" ? "Income" : "Expense" }));

  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const deletingRef = useRef(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const keepType = form?.payment_type_id;
  const formTypeOpts = (types ?? []).filter((t) => t.is_active || String(t.id) === keepType)
    .map((t) => ({ value: String(t.id), label: typeLabel(t), hint: t.direction === "INCOME" ? "Income" : "Expense" }));
  const keepEmp = form?.employee_id;
  const empOpts = (employees ?? []).filter((e) => e.is_active || String(e.id) === keepEmp).map((e) => ({ value: String(e.id), label: `${e.id} · ${e.name}` }));
  const selDir = form?.payment_type_id ? typeById.get(Number(form.payment_type_id))?.direction : undefined;

  function openNew() {
    setForm({ payment_date: today, payment_type_id: activeTypes.length === 1 ? String(activeTypes[0]!.id) : "", amount: "", employee_id: "", description: "" });
  }
  function openEdit(r: Payment) {
    setForm({ entry: r, payment_date: r.payment_date, payment_type_id: String(r.payment_type_id), amount: String(r.amount),
      employee_id: r.employee_id ? String(r.employee_id) : "", description: r.description ?? "" });
  }

  async function save() {
    if (!form || !bid || savingRef.current) return;
    if (!form.payment_date) { toast.error("Select a date"); return; }
    if (form.payment_date > todayStr()) { toast.error("Payment date cannot be in the future"); return; }
    if (!form.payment_type_id) { toast.error("Payment type is required"); return; }
    const amount = Number(form.amount);
    if (!(amount > 0)) { toast.error("Amount must be greater than 0"); return; }
    const payload = { payment_date: form.payment_date, payment_type_id: Number(form.payment_type_id), amount,
      employee_id: form.employee_id ? Number(form.employee_id) : null, description: form.description.trim() || null };
    savingRef.current = true; setSaving(true);
    try {
      // id and audit fields come from the database.
      const { error } = form.entry
        ? await db.from("payments").update(payload).eq("id", form.entry.id).eq("business_id", bid)
        : await db.from("payments").insert({ ...payload, business_id: bid });
      if (error) { toast.error(errMsg(error)); return; }
      toast.success(form.entry ? "Payment updated" : "Payment saved");
      if (!form.entry) setPage(0);
      setForm(null);
      invalidate();
    } catch (e) { toast.error(errMsg(e)); }
    finally { savingRef.current = false; setSaving(false); }
  }

  async function remove(r: Payment) {
    if (deletingRef.current || !bid) return;
    if (!confirm(`Delete payment ${r.id}?`)) return;
    deletingRef.current = true; setDeletingId(r.id);
    try {
      const { error } = await db.from("payments").delete().eq("id", r.id).eq("business_id", bid);
      if (error) { toast.error(errMsg(error)); return; }
      toast.success("Payment deleted");
      if (rows.length === 1 && page > 0) setPage(page - 1);
      invalidate();
    } catch (e) { toast.error(errMsg(e)); }
    finally { deletingRef.current = false; setDeletingId(null); }
  }

  const reset = () => setPage(0);

  return (
    <>
      <PageHeader title="Income & Expenses" subtitle="Direction comes from the payment type"
        actions={<Button size="lg" onClick={openNew} disabled={!types || activeTypes.length === 0}><Plus /> Add payment</Button>} />

      {types && activeTypes.length === 0 && (
        <div className="mb-4 rounded-lg border border-warning bg-warning/10 p-4 text-sm">
          No active payment types yet. Add one in <Link to="/settings" className="font-semibold underline">Settings</Link> first.
        </div>
      )}

      <Panel>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Field label="From" htmlFor="pf" required><Input id="pf" type="date" required className="h-11" value={from} max={to || today} onChange={(e) => { setFrom(e.target.value); reset(); }} /></Field>
          <Field label="To" htmlFor="pt" required error={rangeError || undefined}><Input id="pt" type="date" required className="h-11" value={to} min={from} max={today} onChange={(e) => { setTo(e.target.value); reset(); }} /></Field>
          <Field label="Payment type"><SearchSelect options={filterTypeOpts} value={typeF} onChange={(v) => { setTypeF(v); reset(); }} allowClear placeholder="All types" /></Field>
          <Field label="Direction" htmlFor="pdir">
            <select id="pdir" className="h-11 w-full rounded-md border border-input bg-card px-3" value={dirF} onChange={(e) => { setDirF(e.target.value as "" | Direction); reset(); }}>
              <option value="">All</option><option value="INCOME">Income</option><option value="EXPENSE">Expense</option>
            </select>
          </Field>
        </div>
      </Panel>

      <div className="my-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total income" value={totQ.data ? money(totals.inc) : "…"} tone="success" />
        <Stat label="Total expense" value={totQ.data ? money(totals.exp) : "…"} tone="danger" />
        <Stat label="Net (Income − Expense)" value={totQ.data ? money(totals.inc - totals.exp) : "…"} tone="accent" />
        <Stat label="Transactions" value={totQ.data ? String(totals.count) : "…"} />
      </div>
      {capped && <p className="mb-3 text-sm text-warning">Totals cover the first {PAY_ROW_CAP.toLocaleString()} transactions only — narrow the period.</p>}

      <Panel>
        {pageQ.isLoading ? <Empty>Loading…</Empty> : !rows.length ? <Empty>No payments in this period.</Empty> : (
          <>
            <DataTable head={<tr><th>No.</th><th>Date</th><th>Payment type</th><th>Type</th><th className="text-right">Amount</th><th>Employee</th><th>Description</th><th>Created at</th><th>Created by</th><th /></tr>}>
              {rows.map((r) => {
                const t = typeById.get(r.payment_type_id);
                return (
                  <tr key={r.id}>
                    <td className="num">{r.id}</td>
                    <td className="whitespace-nowrap">{fmtDate(r.payment_date)}</td>
                    <td>{t ? typeLabel(t) : "—"}</td>
                    <td><DirBadge d={t?.direction} /></td>
                    <td className={"num text-right font-medium " + (t?.direction === "EXPENSE" ? "text-destructive" : "text-success")}>{money(r.amount)}</td>
                    <td>{r.employee_id ? empById.get(r.employee_id)?.name ?? "—" : ""}</td>
                    <td className="max-w-48 truncate">{r.description}</td>
                    <td className="whitespace-nowrap text-xs">{fmtDateTime(r.created_at)}</td>
                    <td className="whitespace-nowrap text-xs">{who(r.created_by)}</td>
                    <td className="whitespace-nowrap text-right">
                      <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => openEdit(r)}><Pencil /></Button>
                      <Button variant="ghost" size="icon" aria-label="Delete" disabled={deletingId === r.id} onClick={() => remove(r)}><Trash2 className="text-destructive" /></Button>
                    </td>
                  </tr>
                );
              })}
            </DataTable>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
              <span>Showing {page * PAGE + 1}–{page * PAGE + rows.length} of {total} · Page {page + 1} of {pages}</span>
              <div className="flex gap-2">
                <Button variant="outline" disabled={page === 0 || pageQ.isFetching} onClick={() => setPage(page - 1)}>Previous</Button>
                <Button variant="outline" disabled={page + 1 >= pages || pageQ.isFetching} onClick={() => setPage(page + 1)}>Next</Button>
              </div>
            </div>
          </>
        )}
      </Panel>

      <Dialog open={!!form} onOpenChange={(o) => !o && !saving && setForm(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form?.entry ? `Edit payment ${form.entry.id}` : "Add payment"}</DialogTitle></DialogHeader>
          {form && (
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
              <Field label="Date" htmlFor="pd" required error={form.payment_date > today ? "Payment date cannot be in the future" : undefined}>
                <Input id="pd" type="date" required max={today} className="h-12" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} />
              </Field>
              <Field label="Payment type" required>
                <SearchSelect options={formTypeOpts} value={form.payment_type_id} onChange={(v) => setForm({ ...form, payment_type_id: v })} placeholder="Select type" required />
              </Field>
              {selDir && <p className="text-sm">Recorded as <DirBadge d={selDir} /></p>}
              <Field label="Amount" htmlFor="amt" required>
                <Input id="amt" type="number" step="0.01" min="0.01" required inputMode="decimal" className="h-12 text-base" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </Field>
              <Field label="Employee (optional)"><SearchSelect options={empOpts} value={form.employee_id} onChange={(v) => setForm({ ...form, employee_id: v })} allowClear placeholder="None" /></Field>
              <Field label="Description / notes" htmlFor="desc"><Textarea id="desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
              {form.entry && (
                <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
                  Created {fmtDateTime(form.entry.created_at)} by {who(form.entry.created_by)}
                  {form.entry.updated_at && <> · Updated {fmtDateTime(form.entry.updated_at)} by {who(form.entry.updated_by)}</>}
                </div>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" size="lg" disabled={saving} onClick={() => setForm(null)}>Cancel</Button>
                <Button type="submit" size="lg" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
