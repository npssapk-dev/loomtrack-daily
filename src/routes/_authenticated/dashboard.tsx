import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Empty } from "@/components/app/ui";
export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — LoomTrack" }, { name: "description", content: "Dashboard in LoomTrack." }, { property: "og:title", content: "Dashboard — LoomTrack" }, { property: "og:description", content: "Dashboard in LoomTrack." }] }),
  component: () => (<><PageHeader title="Dashboard" /><Panel><Empty>This screen is being finished.</Empty></Panel></>),
});
