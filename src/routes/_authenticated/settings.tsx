import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Empty } from "@/components/app/ui";
export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — LoomTrack" }, { name: "description", content: "Settings in LoomTrack." }, { property: "og:title", content: "Settings — LoomTrack" }, { property: "og:description", content: "Settings in LoomTrack." }] }),
  component: () => (<><PageHeader title="Settings" /><Panel><Empty>This screen is being finished.</Empty></Panel></>),
});
