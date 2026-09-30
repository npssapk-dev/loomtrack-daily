import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Empty } from "@/components/app/ui";
export const Route = createFileRoute("/_authenticated/customers")({
  head: () => ({ meta: [{ title: "Customers — LoomTrack" }, { name: "description", content: "Customers in LoomTrack." }, { property: "og:title", content: "Customers — LoomTrack" }, { property: "og:description", content: "Customers in LoomTrack." }] }),
  component: () => (<><PageHeader title="Customers" /><Panel><Empty>This screen is being finished.</Empty></Panel></>),
});
