import { createFileRoute } from "@tanstack/react-router";
import { CrudPage } from "@/components/app/CrudPage";
import type { Customer } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/customers")({
  head: () => ({ meta: [{ title: "Customers — LoomTrack" }, { name: "description", content: "Manage the customers you deliver cloth to." }, { property: "og:title", content: "Customers — LoomTrack" }, { property: "og:description", content: "Manage the customers you deliver cloth to." }] }),
  component: () => (
    <CrudPage<Customer & { email?: string | null }>
      title="Customers" table="customers" singular="Customer"
      fields={[
        { key: "name", label: "Name", required: true },
        { key: "phone", label: "Phone", type: "tel" },
        { key: "email", label: "Email", type: "email" },
        { key: "address", label: "Address", type: "textarea" },
        { key: "is_active", label: "Active", type: "bool", defaultValue: true },
      ]}
      columns={[
        { label: "Name", render: (r) => <span className="font-medium">{r.name}</span> },
        { label: "Phone", render: (r) => r.phone ?? "" },
        { label: "Email", render: (r) => r.email ?? "" },
      ]}
    />
  ),
});
