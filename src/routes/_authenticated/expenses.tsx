import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Empty } from "@/components/app/ui";
export const Route = createFileRoute("/_authenticated/expenses")({
  head: () => ({ meta: [{ title: "Expenses — LoomTrack" }, { name: "description", content: "Expenses in LoomTrack." }, { property: "og:title", content: "Expenses — LoomTrack" }, { property: "og:description", content: "Expenses in LoomTrack." }] }),
  component: () => (<><PageHeader title="Expenses" /><Panel><Empty>This screen is being finished.</Empty></Panel></>),
});
