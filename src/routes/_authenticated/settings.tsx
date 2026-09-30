import { createFileRoute, Link } from "@tanstack/react-router";
import { Empty, PageHeader, Panel } from "@/components/app/ui";
import { useMembership } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — LoomTrack" }, { name: "description", content: "Business details and payment types in LoomTrack." }, { property: "og:title", content: "Settings — LoomTrack" }, { property: "og:description", content: "Business details and payment types in LoomTrack." }] }),
  component: Settings,
});

function Settings() {
  const { data: m } = useMembership();
  const b = m?.businesses;

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
          <p className="text-sm">Add, edit or deactivate payment types on the <Link to="/payment-types" className="font-semibold underline">Payment Types</Link> page.</p>
        </Panel>
      </div>
    </>
  );
}
