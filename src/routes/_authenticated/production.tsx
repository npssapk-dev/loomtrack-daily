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
  db, errMsg, useBusinessId, useEmployees, useInvalidateAll, useMachines, useProducts, useProductionPage, useProductionTotals, useUserNames,
  type ProductionEntry,
} from "@/lib/data";
import { fmtDate, money, monthStartStr, qty, round2, todayStr } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/production")({
  head: () => ({ meta: [{ title: "Daily Production — LoomTrack" }, { name: "description", content: "Record daily loom production and piece-rate wages." }, { property: "og:title", content: "Daily Production — LoomTrack" }, { property: "og:description", content: "Record daily loom production and piece-rate wages." }] }),
  component: ProductionPage,
});

type Form = { id?: string; entry?: ProductionEntry; production_date: string; machine_id: string; product_id: string; employee_id: string; quantity: string; piece_rate: string; notes: string };

const PAGE = 25;
const fmtDateTime = (s?: string | null) => (s ? new Date(s).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—");

function ProductionPage() {
  const bid = useBusinessId();
  const [from, setFrom] = useState(monthStartStr());
  const [to, setTo] = useState(todayStr());
  const [page, setPage] = useState(0);
  const { data: machines } = useMachines();
  const { data: products } = useProducts();
  const { data: employees } = useEmployees();
  const { data: pageData, isLoading, isFetching } = useProductionPage(from, to, page, PAGE);
  const { data: totals } = useProductionTotals(from, to);
  const rows = pageData?.rows ?? [];
  const total = pageData?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const { data: names } = useUserNames(rows.flatMap((r) => [r.created_by, r.updated_by]));
  const who = (id: string | null) => (!id ? "System/Existing" : names?.[id] ?? "User");
  const invalidate = useInvalidateAll();
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false); // synchronous lock: blocks rapid double-click / Enter before re-render
  const deletingRef = useRef(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const mBy = useMemo(() => Object.fromEntries((machines ?? []).map((x) => [x.id, x])), [machines]);
  const pBy = useMemo(() => Object.fromEntries((products ?? []).map((x) => [x.id, x])), [products]);
  const eBy = useMemo(() => Object.fromEntries((employees ?? []).map((x) => [x.id, x])), [employees]);

  // Active only, but keep the currently-selected (possibly now inactive) record when editing.
  const opts = <T extends { id: string; record_no: number; is_active: boolean }>(list: T[] | undefined, keep: string | undefined, label: (x: T) => string) =>
    (list ?? []).filter((x) => x.is_active || x.id === keep).map((x) => ({ value: x.id, label: `${x.record_no} · ${label(x)}` }));
  const machineOpts = opts(machines, form?.machine_id, (x) => x.name);
  const productOpts = opts(products, form?.product_id, (x) => `${x.name} (${x.code})`);
  const employeeOpts = opts(employees, form?.employee_id, (x) => x.name);

  const missing = [
    !(machines ?? []).some((x) => x.is_active) && { name: "Machine", to: "/machines" as const },
    !(products ?? []).some((x) => x.is_active) && { name: "Product", to: "/products" as const },
    !(employees ?? []).some((x) => x.is_active) && { name: "Employee", to: "/employees" as const },
  ].filter((x): x is { name: string; to: "/machines" | "/products" | "/employees" } => !!x);
  const mastersLoaded = !!machines && !!products && !!employees;

  const liveWage = form ? round2(Number(form.quantity || 0) * Number(form.piece_rate || 0)) : 0;

  function openNew() {
    // Auto-select when exactly one active option exists (new entries only; edits keep saved values).
    const only = <T extends { id: string; is_active: boolean }>(list: T[] | undefined) => {
      const a = (list ?? []).filter((x) => x.is_active);
      return a.length === 1 ? a[0]!.id : "";
    };
    const product_id = only(products);
    setForm({ production_date: todayStr(), machine_id: only(machines), product_id, employee_id: only(employees), quantity: "",
      piece_rate: product_id ? String(pBy[product_id]?.default_piece_rate ?? 0) : "", notes: "" });
  }
  function openEdit(r: ProductionEntry) {
    setForm({ id: r.id, production_date: r.production_date, machine_id: r.machine_id, product_id: r.product_id, employee_id: r.employee_id,
      quantity: String(r.quantity), piece_rate: String(r.piece_rate), notes: r.notes ?? "" });
  }
  function pickProduct(v: string) {
    if (!form) return;
    // Changing product re-defaults the rate; keeping the same product preserves the saved rate.
    const rate = v && v !== form.product_id ? String(pBy[v]?.default_piece_rate ?? 0) : form.piece_rate;
    setForm({ ...form, product_id: v, piece_rate: rate });
  }

  async function save() {
    if (!form || !bid || savingRef.current) return;
    if (!form.production_date) { toast.error("Select a production date"); return; }
    if (form.production_date > todayStr()) { toast.error("Production date cannot be in the future"); return; }
    if (!form.machine_id || !form.product_id || !form.employee_id) { toast.error("Select machine, product and employee"); return; }
    const q = Number(form.quantity), rate = Number(form.piece_rate);
    if (!(q > 0)) { toast.error("Quantity must be greater than 0"); return; }
    if (form.piece_rate === "" || !(rate >= 0)) { toast.error("Piece rate cannot be negative"); return; }
    const payload = { production_date: form.production_date, machine_id: form.machine_id, product_id: form.product_id,
      employee_id: form.employee_id, quantity: q, piece_rate: rate, notes: form.notes.trim() || null };
    savingRef.current = true;
    setSaving(true);
    try {
      // wage_amount is computed by the database trigger — not sent from the browser.
      const { error } = form.id
        ? await db.from("production_entries").update(payload).eq("id", form.id).eq("business_id", bid)
        : await db.from("production_entries").insert({ ...payload, business_id: bid });
      if (error) { toast.error(errMsg(error)); return; }
      toast.success(form.id ? "Entry updated" : "Production saved");
      setForm(null);
      if (!form.id) setPage(0); // new entries appear at the top of page 1
      invalidate();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  async function remove(r: ProductionEntry) {
    if (deletingRef.current) return;
    if (!confirm(`Delete production entry ${r.record_no}?`)) return;
    deletingRef.current = true;
    setDeletingId(r.id);
    try {
      const { error } = await db.from("production_entries").delete().eq("id", r.id).eq("business_id", bid);
      if (error) { toast.error(errMsg(error)); return; }
      toast.success("Entry deleted");
      invalidate();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      deletingRef.current = false;
      setDeletingId(null);
    }
  }

  return (
    <>
      <PageHeader title="Daily Production" subtitle="Piece-rate production and wages"
        actions={<Button size="lg" onClick={openNew} disabled={!mastersLoaded || missing.length > 0}><Plus /> Add entry</Button>} />

      {mastersLoaded && missing.length > 0 && (
        <div className="mb-4 rounded-lg border border-warning bg-warning/10 p-4 text-sm">
          Before recording production, add at least one active{" "}
          {missing.map((m, i) => (
            <span key={m.name}>{i > 0 && (i === missing.length - 1 ? " and " : ", ")}<Link to={m.to} className="font-semibold underline">{m.name}</Link></span>
          ))}.
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Field label="From" htmlFor="from"><Input id="from" type="date" className="h-11" value={from} onChange={(e) => { setFrom(e.target.value); setPage(0); }} /></Field>
        <Field label="To" htmlFor="to"><Input id="to" type="date" className="h-11" value={to} onChange={(e) => { setTo(e.target.value); setPage(0); }} /></Field>
        <Stat label="Total qty" value={totals ? qty(totals.qty) : "…"} />
        <Stat label="Total wages" value={totals ? money(totals.wages) : "…"} tone="accent" />
        <Stat label="Entries" value={String(pageData?.total ?? totals?.count ?? 0)} />
      </div>

      <Panel>
        {isLoading ? <Empty>Loading…</Empty> : !rows.length ? <Empty>No production in this period.</Empty> : (
          <>
          <DataTable head={<tr><th>No.</th><th>Date</th><th>Machine</th><th>Product</th><th>Employee</th><th className="text-right">Qty</th><th className="text-right">Rate</th><th className="text-right">Wage</th><th>Notes</th><th>Created at</th><th>Created by</th><th /></tr>}>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="num">{r.record_no}</td>
                <td className="whitespace-nowrap">{fmtDate(r.production_date)}</td>
                <td>{mBy[r.machine_id]?.name ?? "—"}</td>
                <td>{pBy[r.product_id]?.name ?? "—"}</td>
                <td>{eBy[r.employee_id]?.name ?? "—"}</td>
                <td className="num text-right">{qty(r.quantity)}</td>
                <td className="num text-right">{money(r.piece_rate)}</td>
                <td className="num text-right font-medium">{money(r.wage_amount)}</td>
                <td className="max-w-40 truncate">{r.notes}</td>
                <td className="whitespace-nowrap text-xs">{fmtDateTime(r.created_at)}</td>
                <td className="whitespace-nowrap text-xs">{who(r.created_by)}</td>
                <td className="whitespace-nowrap text-right">
                  <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => openEdit(r)}><Pencil /></Button>
                  <Button variant="ghost" size="icon" aria-label="Delete" disabled={deletingId === r.id} onClick={() => remove(r)}><Trash2 className="text-destructive" /></Button>
                </td>
              </tr>
            ))}
          </DataTable>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
            <span>Showing {page * PAGE + 1}–{page * PAGE + rows.length} of {total} · Page {page + 1} of {pages}</span>
            <div className="flex gap-2">
              <Button variant="outline" disabled={page === 0 || isFetching} onClick={() => setPage(page - 1)}>Previous</Button>
              <Button variant="outline" disabled={page + 1 >= pages || isFetching} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          </div>
          </>
        )}
      </Panel>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form?.id ? `Edit production${form.entry ? ` ${form.entry.record_no}` : ""}` : "Add production"}</DialogTitle></DialogHeader>
          {form && (
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
              {form.entry && (
                <div className="grid grid-cols-2 gap-2 rounded-md border px-3 py-2 text-xs text-muted-foreground">
                  <span>Created: {fmtDateTime(form.entry.created_at)} · {who(form.entry.created_by)}</span>
                  <span>Updated: {form.entry.updated_at ? `${fmtDateTime(form.entry.updated_at)} · ${who(form.entry.updated_by)}` : "—"}</span>
                </div>
              )}
              <Field label="Production date" htmlFor="pdate" required error={form.production_date > todayStr() ? "Production date cannot be in the future" : undefined}>
                <Input id="pdate" type="date" required max={todayStr()} className="h-12" value={form.production_date} onChange={(e) => setForm({ ...form, production_date: e.target.value })} />
              </Field>
              <Field label="Machine" required><SearchSelect required options={machineOpts} value={form.machine_id} onChange={(v) => setForm({ ...form, machine_id: v })} placeholder="Select machine" /></Field>
              <Field label="Product" required><SearchSelect required options={productOpts} value={form.product_id} onChange={pickProduct} placeholder="Select product" /></Field>
              <Field label="Employee" required><SearchSelect required options={employeeOpts} value={form.employee_id} onChange={(v) => setForm({ ...form, employee_id: v })} placeholder="Select employee" /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={`Quantity${form.product_id && pBy[form.product_id] ? ` (${pBy[form.product_id]?.unit})` : ""}`} htmlFor="q" required>
                  <Input id="q" type="number" required step="0.01" min="0" inputMode="decimal" className="h-12 text-base" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                </Field>
                <Field label="Piece rate" htmlFor="rate" required>
                  <Input id="rate" type="number" required step="0.01" min="0" inputMode="decimal" className="h-12 text-base" value={form.piece_rate} onChange={(e) => setForm({ ...form, piece_rate: e.target.value })} />
                </Field>
              </div>
              <div className="flex items-center justify-between rounded-md bg-muted px-4 py-3">
                <span className="text-sm text-muted-foreground">Calculated wage</span>
                <span className="num font-display text-xl font-semibold">{money(liveWage)}</span>
              </div>
              <Field label="Notes" htmlFor="notes"><Textarea id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
              <DialogFooter>
                <Button type="button" variant="outline" size="lg" disabled={saving} onClick={() => setForm(null)}>Cancel</Button>
                <Button type="submit" size="lg" disabled={saving} aria-busy={saving}>{saving ? (form.id ? "Updating…" : "Saving…") : (form.id ? "Update" : "Save")}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
