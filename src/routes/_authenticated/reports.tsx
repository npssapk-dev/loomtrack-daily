import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Empty } from "@/components/app/ui";
export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports — LoomTrack" }, { name: "description", content: "Reports in LoomTrack." }, { property: "og:title", content: "Reports — LoomTrack" }, { property: "og:description", content: "Reports in LoomTrack." }] }),
  component: () => (<><PageHeader title="Reports" /><Panel><Empty>This screen is being finished.</Empty></Panel></>),
});
