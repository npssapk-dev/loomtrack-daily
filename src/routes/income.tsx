import { createFileRoute, redirect } from "@tanstack/react-router";
// Legacy path: Income & Expenses are unified on /payments.
export const Route = createFileRoute("/_authenticated/income")({
  beforeLoad: () => { throw redirect({ to: "/payments" }); },
});
