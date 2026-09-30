import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Empty } from "@/components/app/ui";
export const Route = createFileRoute("/_authenticated/machines")({
  head: () => ({ meta: [{ title: "Machines — LoomTrack" }, { name: "description", content: "Machines in LoomTrack." }, { property: "og:title", content: "Machines — LoomTrack" }, { property: "og:description", content: "Machines in LoomTrack." }] }),
  component: () => (<><PageHeader title="Machines" /><Panel><Empty>This screen is being finished.</Empty></Panel></>),
});
