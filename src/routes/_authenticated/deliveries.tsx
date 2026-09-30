import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Empty } from "@/components/app/ui";
export const Route = createFileRoute("/_authenticated/deliveries")({
  head: () => ({ meta: [{ title: "Sales & Delivery — LoomTrack" }, { name: "description", content: "Sales & Delivery in LoomTrack." }, { property: "og:title", content: "Sales & Delivery — LoomTrack" }, { property: "og:description", content: "Sales & Delivery in LoomTrack." }] }),
  component: () => (<><PageHeader title="Sales & Delivery" /><Panel><Empty>This screen is being finished.</Empty></Panel></>),
});
