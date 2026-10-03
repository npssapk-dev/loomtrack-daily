import { createFileRoute, redirect } from "@tanstack/react-router";
// Legacy path: Income & Expenses are unified on /payments.
export const Route = createFileRoute("/_authenticated/expenses")({
  beforeLoad: () => { throw redirect({ to: "/payments" }); },
});
