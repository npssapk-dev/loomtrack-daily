import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, Empty, Field, PageHeader, Panel, StatusBadge } from "@/components/app/ui";
import { db, errMsg, useBusinessId, useInvalidateAll, useMembership, usePaymentTypes, type Direction } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — LoomTrack" }, { name: "description", content: "Business details and payment types in LoomTrack." }, { property: "og:title", content: "Settings — LoomTrack" }, { property: "og:description", content: "Business details and payment types in LoomTrack." }] }),
  component: Settings,
});

function Settings() {
  const { data: m } = useMembership();
  const bid = useBusinessId();
  const { data: types, isLoading } = usePaymentTypes();
  const invalidate = useInvalidateAll();
  const [desc, setDesc] = useState("");
  const [dir, setDir] = useState<Direction>("EXPENSE");
  const b = m?.businesses;

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const d = desc.trim();
    if (!d) { toast.error("Description is required"); return; }
    if (types?.some((t) => t.description.toLowerCase() === d.toLowerCase() && t.direction === dir)) { toast.error("That payment type already exists"); return; }
    const { error } = await db.from("payment_types").insert({ business_id: bid, description: d, direction: dir });
    if (error) { toast.error(errMsg(error)); return; }
    setDesc(""); toast.success("Payment type added"); invalidate();
  }

  return (
    <>
      <PageHeader title="Settings" />
      <div className="space-y-5">
        <Panel title="Business">
          {b ? (
            <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              {[["Business No.", b.id], ["Name", b.company_name], ["Phone", b.phone], ["Email", b.email], ["Address", b.address],
                ["City", b.city], ["State / Province", b.state], ["Country", b.country], ["Postal Code", b.postal_code], ["Tax / Reg. ID", b.tax_id],
                ["Your role", m?.role], ["Member No.", m?.id]].map(([k, v]) => (
                <div key={String(k)} className="flex justify-between gap-3 border-b py-1.5"><dt className="text-muted-foreground">{k}</dt><dd className="text-right font-medium">{v ?? "—"}</dd></div>
              ))}
            </dl>
          ) : <Empty>Loading…</Empty>}
        </Panel>
        <Panel title="Payment types">
          <form onSubmit={add} className="mb-4 grid gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-end">
            <Field label="Description" htmlFor="ptd"><Input id="ptd" className="h-11" value={desc} onChange={(e) => setDesc(e.target.value)} /></Field>
            <Field label="Direction" htmlFor="ptdir">
              <select id="ptdir" className="h-11 w-full rounded-md border bg-background px-3" value={dir} onChange={(e) => setDir(e.target.value as Direction)}>
                <option value="INCOME">INCOME</option><option value="EXPENSE">EXPENSE</option>
              </select>
            </Field>
            <Button type="submit" size="lg">Add type</Button>
          </form>
          {isLoading ? <Empty>Loading…</Empty> : !types?.length ? <Empty>No payment types found.</Empty> : (
            <DataTable head={<tr><th>No.</th><th>Description</th><th>Direction</th><th>Status</th></tr>}>
              {types.map((t) => (
                <tr key={t.id}>
                  <td className="num">{t.id}</td><td>{t.description}</td>
                  <td className={t.direction === "EXPENSE" ? "text-destructive" : "text-success"}>{t.direction}</td>
                  <td><StatusBadge status={t.is_active ? "Active" : "Inactive"} /></td>
                </tr>
              ))}
            </DataTable>
          )}
        </Panel>
      </div>
    </>
  );
}
