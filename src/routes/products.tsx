import { createFileRoute } from "@tanstack/react-router";
import { CrudPage } from "@/components/app/CrudPage";
import type { Product } from "@/lib/data";
import { money } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/products")({
  head: () => ({ meta: [{ title: "Products — LoomTrack" }, { name: "description", content: "Manage fabric products, rates and default piece rates." }, { property: "og:title", content: "Products — LoomTrack" }, { property: "og:description", content: "Manage fabric products, rates and default piece rates." }] }),
  component: () => (
    <CrudPage<Product & { rate?: number | null; description?: string | null }>
      title="Products" table="products" singular="Product" uniqueLabel="product code"
      fields={[
        { key: "code", label: "Code", required: true },
        { key: "name", label: "Name", required: true },
        { key: "unit", label: "Unit", required: true, defaultValue: "m", placeholder: "m" },
        { key: "rate", label: "Rate", type: "number", min: 0, defaultValue: "0" },
        { key: "default_piece_rate", label: "Default piece rate", type: "number", required: true, min: 0, defaultValue: "0" },
        { key: "description", label: "Description", type: "textarea" },
        { key: "is_active", label: "Active", type: "bool", defaultValue: true },
      ]}
      columns={[
        { label: "Code", className: "num", render: (r) => r.code },
        { label: "Name", render: (r) => <span className="font-medium">{r.name}</span> },
        { label: "Unit", render: (r) => r.unit },
        { label: "Rate", className: "num text-right", render: (r) => money(r.rate ?? 0) },
        { label: "Piece rate", className: "num text-right", render: (r) => money(r.default_piece_rate) },
      ]}
    />
  ),
});
