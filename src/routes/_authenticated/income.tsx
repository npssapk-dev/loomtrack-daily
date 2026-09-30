import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Empty } from "@/components/app/ui";
export const Route = createFileRoute("/_authenticated/income")({
  head: () => ({ meta: [{ title: "Income — LoomTrack" }, { name: "description", content: "Income in LoomTrack." }, { property: "og:title", content: "Income — LoomTrack" }, { property: "og:description", content: "Income in LoomTrack." }] }),
  component: () => (<><PageHeader title="Income" /><Panel><Empty>This screen is being finished.</Empty></Panel></>),
});
