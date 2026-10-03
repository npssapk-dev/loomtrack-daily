import { useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataTable, DateInput, Empty, Field, PageHeader, Panel, Stat } from "@/components/app/ui";
import { SearchSelect } from "@/components/app/SearchSelect";
import {
  db, errMsg, useBusinessId, useCustomers, useDeliveriesPage, useDeliveryTotalsRows, useInvalidateAll, useProducts, useUserNames,
  DEL_ROW_CAP, type Delivery,
} from "@/lib/data";
import { fmtDate, fmtDateTime, money, monthStartStr, qty, round2, todayStr } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/deliveries")({
  head: () => ({ meta: [{ title: "Sales & Delivery — LoomTrack" }, { name: "description", content: "Record cloth deliveries, approvals, rejections and bills." }, { property: "og:title", content: "Sales & Delivery — LoomTrack" }, { property: "og:description", content: "Record cloth deliveries, approvals, rejections and bills." }] }),
  component: DeliveriesPage,
});

const PAGE = 25;
const STATUSES = ["Draft", "Delivered", "Partially Approved", "Approved", "Rejected", "Paid"];
type Form = { entry?: Delivery; delivery_date: string; customer_id: string; product_id: string; delivered_qty: string; approved_qty: string; rejected_qty: string; rate: string; status: string; notes: string };

function DeliveriesPage() {
  const bid = useBusinessId();
  const today = todayStr();
  const [from, setFrom] = useState(monthStartStr());
  const [to, setTo] = useState(today);
  const [custF, setCustF] = useState("");
  const [prodF, setProdF] = useState("");
  const [page, setPage] = useState(0);
  const { data: customers } = useCustomers();
  const { data: products } = useProducts();
  const invalidate = useInvalidateAll();

  const cBy = useMemo(() => new Map((customers ?? []).map((x) => [x.id, x])), [customers]);
  const pBy = useMemo(() => new Map((products ?? []).map((x) => [x.id, x])), [products]);

  const rangeError = !from || !to ? "Both dates are required" : from > to ? "From must be on or before To" : to > today ? "To date cannot be in the future" : "";
  const filter = { from: rangeError ? "" : from, to: rangeError ? "" : to, customerId: custF, productId: prodF };
  const pageQ = useDeliveriesPage(filter, page, PAGE);
  const totQ = useDeliveryTotalsRows(filter);
  const rows = pageQ.data?.rows ?? [];
  const total = pageQ.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const { data: names } = useUserNames(rows.flatMap((r) => [r.created_by, r.updated_by]));
  const who = (id?: string | null) => (!id ? "System/Existing" : names?.[id] ?? "User");

  const tot = useMemo(() => (totQ.data ?? []).reduce((t, r) => ({
    d: t.d + (Number(r.delivered_qty) || 0), a: t.a + (Number(r.approved_qty) || 0), r: t.r + (Number(r.rejected_qty) || 0), b: t.b + (Number(r.bill_amount) || 0),
  }), { d: 0, a: 0, r: 0, b: 0 }), [totQ.data]);
  const capped = (totQ.data?.length ?? 0) >= DEL_ROW_CAP;

  const cLabel = (c: { id: number; name: string }) => `${c.id} · ${c.name}`;
  const pLabel = (p: { id: number; code: string; name: string }) => `${p.id} · ${p.code} · ${p.name}`;
  const custFilterOpts = (customers ?? []).map((c) => ({ value: String(c.id), label: cLabel(c) }));
  const prodFilterOpts = (products ?? []).map((p) => ({ value: String(p.id), label: pLabel(p) }));

  const activeC = (customers ?? []).filter((c) => c.is_active);
  const activeP = (products ?? []).filter((p) => p.is_active);
  const mastersLoaded = !!customers && !!products;
  const missing = [
    !activeC.length && { name: "Customer", to: "/customers" as const },
    !activeP.length && { name: "Product", to: "/products" as const },
  ].filter((x): x is { name: string; to: "/customers" | "/products" } => !!x);

  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const deletingRef = useRef(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const custOpts = (customers ?? []).filter((c) => c.is_active || String(c.id) === form?.customer_id).map((c) => ({ value: String(c.id), label: cLabel(c) }));
  const prodOpts = (products ?? []).filter((p) => p.is_active || String(p.id) === form?.product_id).map((p) => ({ value: String(p.id), label: pLabel(p) }));

  const dq = Number(form?.delivered_qty || 0), aq = Number(form?.approved_qty || 0), rq = Number(form?.rejected_qty || 0);
  const liveBill = form ? round2(aq * Number(form.rate || 0)) : 0;
  const qtyError = form && aq + rq > dq ? "Approved + rejected cannot exceed delivered" : undefined;

  function openNew() {
    const c = activeC.length === 1 ? String(activeC[0]!.id) : "";
    const p = activeP.length === 1 ? activeP[0]! : undefined;
    setForm({ delivery_date: today, customer_id: c, product_id: p ? String(p.id) : "", delivered_qty: "", approved_qty: "0", rejected_qty: "0", rate: "", status: "Draft", notes: "" });
  }
  function openEdit(r: Delivery) {
    setForm({ entry: r, delivery_date: r.delivery_date, customer_id: String(r.customer_id), product_id: String(r.product_id), delivered_qty: String(r.delivered_qty),
      approved_qty: String(r.approved_qty ?? 0), rejected_qty: String(r.rejected_qty ?? 0), rate: String(r.rate), status: r.status || "Draft", notes: r.notes ?? "" });
  }

  async function save() {
    if (!form || !bid || savingRef.current) return;
    if (!form.delivery_date) { toast.error("Select a delivery date"); return; }
    if (form.delivery_date > todayStr()) { toast.error("Delivery date cannot be in the future"); return; }
    if (!form.customer_id || !form.product_id) { toast.error("Select customer and product"); return; }
    const rate = Number(form.rate);
    if (!(dq > 0)) { toast.error("Delivered quantity must be greater than 0"); return; }
    if (!(aq >= 0) || !(rq >= 0)) { toast.error("Approved and rejected quantities cannot be negative"); return; }
    if (aq + rq > dq) { toast.error("Approved + rejected cannot exceed delivered"); return; }
    if (form.rate === "" || !(rate >= 0)) { toast.error("Rate cannot be negative"); return; }
    const payload = { delivery_date: form.delivery_date, customer_id: Number(form.customer_id), product_id: Number(form.product_id),
      delivered_qty: dq, approved_qty: aq, rejected_qty: rq, rate, bill_amount: round2(aq * rate), status: form.status, notes: form.notes.trim() || null };
    savingRef.current = true; setSaving(true);
    try {
      const run = (p: Record<string, unknown>) => form.entry
        ? db.from("deliveries").update(p).eq("id", form.entry.id).eq("business_id", bid)
        : db.from("deliveries").insert({ ...p, business_id: bid });
      let { error } = await run(payload);
      // If bill_amount is a generated column in the database, let it calculate.
      if (error && (error.code === "428C9" || /generated/i.test(error.message ?? ""))) {
        const { bill_amount: _b, ...rest } = payload; void _b;
        ({ error } = await run(rest));
      }
      if (error) { toast.error(errMsg(error)); return; }
      toast.success(form.entry ? "Delivery updated" : "Delivery saved");
      if (!form.entry) setPage(0);
      setForm(null);
      invalidate();
    } catch (e) { toast.error(errMsg(e)); }
    finally { savingRef.current = false; setSaving(false); }
  }

  async function remove(r: Delivery) {
    if (deletingRef.current || !bid) return;
    if (!confirm(`Delete delivery ${r.id}?`)) return;
    deletingRef.current = true; setDeletingId(r.id);
    try {
      const { error } = await db.from("deliveries").delete().eq("id", r.id).eq("business_id", bid);
      if (error) { toast.error(errMsg(error)); return; }
      toast.success("Delivery deleted");
      if (rows.length === 1 && page > 0) setPage(page - 1);
      invalidate();
    } catch (e) { toast.error(errMsg(e)); }
    finally { deletingRef.current = false; setDeletingId(null); }
  }

  const reset = () => setPage(0);

  return (
    <>
      <PageHeader title="Sales & Delivery"
        actions={<Button size="lg" onClick={openNew} disabled={!mastersLoaded || missing.length > 0}><Plus /> Add delivery</Button>} />

      {mastersLoaded && missing.length > 0 && (
        <div className="mb-4 rounded-lg border border-warning bg-warning/10 p-4 text-sm">
          Before recording deliveries, add at least one active{" "}
          {missing.map((m, i) => (<span key={m.name}>{i > 0 && " and "}<Link to={m.to} className="font-semibold underline">{m.name}</Link></span>))}.
        </div>
      )}

      <Panel>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Field label="From" htmlFor="df" required><DateInput id="df" required value={from} max={to || today} onChange={(e) => { setFrom(e.target.value); reset(); }} /></Field>
          <Field label="To" htmlFor="dt" required error={rangeError || undefined}><DateInput id="dt" required value={to} min={from} max={today} onChange={(e) => { setTo(e.target.value); reset(); }} /></Field>
          <Field label="Customer"><SearchSelect options={custFilterOpts} value={custF} onChange={(v) => { setCustF(v); reset(); }} allowClear placeholder="All customers" /></Field>
          <Field label="Product"><SearchSelect options={prodFilterOpts} value={prodF} onChange={(v) => { setProdF(v); reset(); }} allowClear placeholder="All products" /></Field>
        </div>
      </Panel>

      <div className="my-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Delivered qty" value={totQ.data ? qty(tot.d) : "…"} />
        <Stat label="Approved qty" value={totQ.data ? qty(tot.a) : "…"} tone="success" />
        <Stat label="Rejected qty" value={totQ.data ? qty(tot.r) : "…"} tone="danger" />
        <Stat label="Bill amount" value={totQ.data ? money(tot.b) : "…"} tone="accent" />
        <Stat label="Deliveries" value={totQ.data ? String(totQ.data.length) : "…"} />
      </div>
      {capped && <p className="mb-3 text-sm text-warning">Totals cover the first {DEL_ROW_CAP.toLocaleString()} deliveries only — narrow the period.</p>}

      <Panel>
        {pageQ.isLoading ? <Empty>Loading…</Empty> : !rows.length ? <Empty>No deliveries in this period.</Empty> : (
          <>
            <DataTable head={<tr><th>No.</th><th>Date</th><th>Customer</th><th>Product</th><th className="text-right">Delivered</th><th className="text-right">Approved</th><th className="text-right">Rejected</th><th className="text-right">Rate</th><th className="text-right">Bill</th><th>Status</th><th>Created at</th><th>Created by</th><th /></tr>}>
              {rows.map((r) => {
                const c = cBy.get(r.customer_id), p = pBy.get(r.product_id);
                return (
                  <tr key={r.id}>
                    <td className="num">{r.id}</td>
                    <td className="whitespace-nowrap">{fmtDate(r.delivery_date)}</td>
                    <td>{c ? cLabel(c) : r.customer_id}</td>
                    <td>{p ? pLabel(p) : r.product_id}</td>
                    <td className="num text-right">{qty(r.delivered_qty)}</td>
                    <td className="num text-right">{qty(r.approved_qty)}</td>
                    <td className="num text-right">{qty(r.rejected_qty)}</td>
                    <td className="num text-right">{money(r.rate)}</td>
                    <td className="num text-right font-medium">{money(r.bill_amount)}</td>
                    <td className="whitespace-nowrap">{r.status}</td>
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
          <DialogHeader><DialogTitle>{form?.entry ? `Edit delivery ${form.entry.id}` : "Add delivery"}</DialogTitle></DialogHeader>
          {form && (
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
              <Field label="Delivery date" htmlFor="dd" required error={form.delivery_date > today ? "Delivery date cannot be in the future" : undefined}>
                <DateInput id="dd" required max={today} className="h-12" value={form.delivery_date} onChange={(e) => setForm({ ...form, delivery_date: e.target.value })} />
              </Field>
              <Field label="Customer" required><SearchSelect options={custOpts} value={form.customer_id} onChange={(v) => setForm({ ...form, customer_id: v })} placeholder="Select customer" required /></Field>
              <Field label="Product" required><SearchSelect options={prodOpts} value={form.product_id} onChange={(v) => setForm({ ...form, product_id: v })} placeholder="Select product" required /></Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Delivered" htmlFor="dq" required><Input id="dq" type="number" step="0.01" min="0.01" required inputMode="decimal" className="h-12" value={form.delivered_qty} onChange={(e) => setForm({ ...form, delivered_qty: e.target.value })} /></Field>
                <Field label="Approved" htmlFor="aq"><Input id="aq" type="number" step="0.01" min="0" inputMode="decimal" className="h-12" value={form.approved_qty} onChange={(e) => setForm({ ...form, approved_qty: e.target.value })} /></Field>
                <Field label="Rejected" htmlFor="rq"><Input id="rq" type="number" step="0.01" min="0" inputMode="decimal" className="h-12" value={form.rejected_qty} onChange={(e) => setForm({ ...form, rejected_qty: e.target.value })} /></Field>
              </div>
              {qtyError && <p className="text-sm text-destructive" role="alert">{qtyError}</p>}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Rate" htmlFor="rt" required><Input id="rt" type="number" step="0.01" min="0" required inputMode="decimal" className="h-12" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} /></Field>
                <Field label="Status" htmlFor="st">
                  <select id="st" className="h-12 w-full rounded-md border border-input bg-card px-3" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    {[...new Set([...STATUSES, form.status])].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
              </div>
              <p className="rounded-md bg-muted p-3 text-sm">Bill amount (approved × rate): <b className="num">{money(liveBill)}</b></p>
              <Field label="Notes" htmlFor="dn"><Textarea id="dn" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
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
