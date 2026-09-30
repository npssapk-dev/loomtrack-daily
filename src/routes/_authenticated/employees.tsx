import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Empty } from "@/components/app/ui";
export const Route = createFileRoute("/_authenticated/employees")({
  head: () => ({ meta: [{ title: "Employees & Wages — LoomTrack" }, { name: "description", content: "Employees & Wages in LoomTrack." }, { property: "og:title", content: "Employees & Wages — LoomTrack" }, { property: "og:description", content: "Employees & Wages in LoomTrack." }] }),
  component: () => (<><PageHeader title="Employees & Wages" /><Panel><Empty>This screen is being finished.</Empty></Panel></>),
});
