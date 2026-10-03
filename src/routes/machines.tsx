import { createFileRoute } from "@tanstack/react-router";
import { CrudPage } from "@/components/app/CrudPage";
import type { Machine } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/machines")({
  head: () => ({ meta: [{ title: "Machines — LoomTrack" }, { name: "description", content: "Manage the looms and machines in your unit." }, { property: "og:title", content: "Machines — LoomTrack" }, { property: "og:description", content: "Manage the looms and machines in your unit." }] }),
  component: () => (
    <CrudPage<Machine & { description?: string | null }>
      title="Machines" subtitle="Looms used in daily production" table="machines" singular="Machine" uniqueLabel="machine name"
      fields={[
        { key: "name", label: "Name / number", required: true },
        { key: "description", label: "Description", type: "textarea" },
        { key: "is_active", label: "Active", type: "bool", defaultValue: true },
      ]}
      columns={[
        { label: "Name", render: (r) => <span className="font-medium">{r.name}</span> },
        { label: "Description", className: "max-w-60 truncate", render: (r) => r.description ?? "" },
      ]}
    />
  ),
});
