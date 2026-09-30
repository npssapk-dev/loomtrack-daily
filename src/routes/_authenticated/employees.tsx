import { createFileRoute } from "@tanstack/react-router";
import { CrudPage } from "@/components/app/CrudPage";
import type { Employee } from "@/lib/data";
import { fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/employees")({
  head: () => ({ meta: [{ title: "Employees — LoomTrack" }, { name: "description", content: "Manage loom workers and their details." }, { property: "og:title", content: "Employees — LoomTrack" }, { property: "og:description", content: "Manage loom workers and their details." }] }),
  component: () => (
    <CrudPage<Employee & { email?: string | null; address?: string | null }>
      title="Employees" subtitle="Wages come from Daily Production entries" table="employees" singular="Employee"
      fields={[
        { key: "name", label: "Name", required: true },
        { key: "phone", label: "Phone", type: "tel" },
        { key: "email", label: "Email", type: "email" },
        { key: "address", label: "Address", type: "textarea" },
        { key: "join_date", label: "Join date", type: "date" },
        { key: "is_active", label: "Active", type: "bool", defaultValue: true },
      ]}
      columns={[
        { label: "Name", render: (r) => <span className="font-medium">{r.name}</span> },
        { label: "Phone", render: (r) => r.phone ?? "" },
        { label: "Email", render: (r) => r.email ?? "" },
        { label: "Join date", className: "whitespace-nowrap", render: (r) => fmtDate(r.join_date) },
      ]}
    />
  ),
});
