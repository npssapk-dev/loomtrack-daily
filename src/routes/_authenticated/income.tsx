import { createFileRoute } from "@tanstack/react-router";
import { PaymentsPage } from "@/components/app/PaymentsPage";
export const Route = createFileRoute("/_authenticated/income")({
  head: () => ({ meta: [{ title: "Income — LoomTrack" }, { name: "description", content: "Income payments in LoomTrack." }, { property: "og:title", content: "Income — LoomTrack" }, { property: "og:description", content: "Income payments in LoomTrack." }] }),
  component: () => <PaymentsPage direction="INCOME" title="Income" />,
});
