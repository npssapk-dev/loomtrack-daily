import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataTable, Empty, Field, PageHeader, Panel, Stat } from "./ui";
import { SearchSelect } from "./SearchSelect";
import { db, errMsg, nameMap, sum, useBusinessId, useEmployees, useInvalidateAll, usePayments, usePaymentTypes, type Direction } from "@/lib/data";
import { supabase } from "@/lib/backend";
import { fmtDate, money, monthStartStr, todayStr } from "@/lib/format";

/** Single transaction UI on `payments`. Direction always comes from the chosen payment type. */
export function PaymentsPage({ direction, title }: { direction?: Direction; title: string }) {
  const bid = useBusinessId();
  const [from, setFrom] = useState(monthStartStr());
  const [to, setTo] = useState(todayStr());
  const { data: types } = usePaymentTypes();
  const { data: employees } = useEmployees();
  const { data: payments, isLoading } = usePayments(from, to);
  const invalidate = useInvalidateAll();
  const [form, setForm] = useState<{ payment_date: string; payment_type_id: string; amount: string; employee_id: string; description: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const typeById = useMemo(() => Object.fromEntries((types ?? []).map((t) => [t.id, t])), [types]);
  const empNames = nameMap(employees);
  const rows = (payments ?? []).filter((p) => !direction || typeById[p.payment_type_id]?.direction === direction);
  const typeOpts = (types ?? []).filter((t) => t.is_active && (!direction || t.direction === direction))
    .map((t) => ({ value: t.id, label: `${t.id} · ${t.description}`, hint: t.direction }));
  const empOpts = (employees ?? []).filter((e) => e.is_active).map((e) => ({ value: e.id, label: `${e.id} · ${e.name}` }));
  const selDir = form ? typeById[form.payment_type_id]?.direction : undefined;

  async function save() {
    if (!form || !bid) return;
    if (!form.payment_type_id) { toast.error("Payment type is required"); return; }
    const amount = Number(form.amount);
    if (!(amount > 0)) { toast.error("Amount must be greater than 0"); return; }
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await db.from("payments").insert({
      business_id: bid, payment_date: form.payment_date, payment_type_id: form.payment_type_id, amount,
      employee_id: form.employee_id || null, description: form.description.trim() || null, created_by: u.user?.id,
    });
    setSaving(false);
    if (error) { toast.error(errMsg(error)); return; }
    toast.success("Transaction saved");
    setForm(null);
    invalidate();
  }

  async function remove(id: string) {
    if (!confirm("Delete this transaction?")) return;
    const { error } = await db.from("payments").delete().eq("id", id).eq("business_id", bid);
    if (error) { toast.error(errMsg(error)); return; }
    invalidate();
  }

  const income = sum(rows.filter((r) => typeById[r.payment_type_id]?.direction === "INCOME"), (r) => r.amount);
  const expense = sum(rows.filter((r) => typeById[r.payment_type_id]?.direction === "EXPENSE"), (r) => r.amount);

  return (
    <>
      <PageHeader title={title} subtitle="Recorded in Payments"
        actions={<Button size="lg" onClick={() => setForm({ payment_date: todayStr(), payment_type_id: "", amount: "", employee_id: "", description: "" })}><Plus /> Add</Button>} />
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="From" htmlFor="from"><Input id="from" type="date" className="h-11" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label="To" htmlFor="to"><Input id="to" type="date" className="h-11" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
        {direction !== "EXPENSE" && <Stat label="Income" value={money(income)} tone="success" />}
        {direction !== "INCOME" && <Stat label="Expense" value={money(expense)} tone="danger" />}
      </div>
      <Panel>
        {isLoading ? <Empty>Loading…</Empty> : !rows.length ? <Empty>No transactions in this period.</Empty> : (
          <DataTable head={<tr><th>No.</th><th>Date</th><th>Type</th><th>Employee</th><th>Description</th><th className="text-right">Amount</th><th /></tr>}>
            {rows.map((r) => {
              const t = typeById[r.payment_type_id];
              return (
                <tr key={r.id}>
                  <td className="num">{r.id}</td>
                  <td className="whitespace-nowrap">{fmtDate(r.payment_date)}</td>
                  <td>{t ? `${t.id} · ${t.description}` : "—"}</td>
                  <td>{r.employee_id ? empNames[r.employee_id] ?? "—" : ""}</td>
                  <td className="max-w-56 truncate">{r.description}</td>
                  <td className={"num text-right font-medium " + (t?.direction === "EXPENSE" ? "text-destructive" : "text-success")}>{money(r.amount)}</td>
                  <td className="text-right"><Button variant="ghost" size="icon" aria-label="Delete" onClick={() => remove(r.id)}><Trash2 className="text-destructive" /></Button></td>
                </tr>
              );
            })}
          </DataTable>
        )}
      </Panel>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add transaction</DialogTitle></DialogHeader>
          {form && (
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
              <Field label="Date *" htmlFor="pd"><Input id="pd" type="date" className="h-12" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} /></Field>
              <Field label="Payment type *"><SearchSelect options={typeOpts} value={form.payment_type_id} onChange={(v) => setForm({ ...form, payment_type_id: v })} placeholder="Select type" /></Field>
              {selDir && <p className="text-sm">Direction: <b className={selDir === "EXPENSE" ? "text-destructive" : "text-success"}>{selDir}</b></p>}
              <Field label="Amount *" htmlFor="amt"><Input id="amt" type="number" step="0.01" inputMode="decimal" className="h-12 text-base" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
              <Field label="Employee (optional)"><SearchSelect options={empOpts} value={form.employee_id} onChange={(v) => setForm({ ...form, employee_id: v })} allowClear placeholder="None" /></Field>
              <Field label="Description / notes" htmlFor="desc"><Textarea id="desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
              <DialogFooter>
                <Button type="button" variant="outline" size="lg" onClick={() => setForm(null)}>Cancel</Button>
                <Button type="submit" size="lg" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
