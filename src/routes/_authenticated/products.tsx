import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Empty } from "@/components/app/ui";
export const Route = createFileRoute("/_authenticated/products")({
  head: () => ({ meta: [{ title: "Products — LoomTrack" }, { name: "description", content: "Products in LoomTrack." }, { property: "og:title", content: "Products — LoomTrack" }, { property: "og:description", content: "Products in LoomTrack." }] }),
  component: () => (<><PageHeader title="Products" /><Panel><Empty>This screen is being finished.</Empty></Panel></>),
});
