import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Empty } from "@/components/app/ui";
export const Route = createFileRoute("/_authenticated/production")({
  head: () => ({ meta: [{ title: "Daily Production — LoomTrack" }, { name: "description", content: "Daily Production in LoomTrack." }, { property: "og:title", content: "Daily Production — LoomTrack" }, { property: "og:description", content: "Daily Production in LoomTrack." }] }),
  component: () => (<><PageHeader title="Daily Production" /><Panel><Empty>This screen is being finished.</Empty></Panel></>),
});
