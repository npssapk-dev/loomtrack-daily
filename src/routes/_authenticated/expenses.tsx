import { createFileRoute } from "@tanstack/react-router";
import { PaymentsPage } from "@/components/app/PaymentsPage";
export const Route = createFileRoute("/_authenticated/expenses")({
  head: () => ({ meta: [{ title: "Expenses — LoomTrack" }, { name: "description", content: "Expense payments in LoomTrack." }, { property: "og:title", content: "Expenses — LoomTrack" }, { property: "og:description", content: "Expense payments in LoomTrack." }] }),
  component: () => <PaymentsPage direction="EXPENSE" title="Expenses" />,
});
