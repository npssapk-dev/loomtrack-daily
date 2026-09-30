import { createFileRoute, Link } from "@tanstack/react-router";
import { Cog, Contact, Package, Tags, Users } from "lucide-react";
import { PageHeader } from "@/components/app/ui";
import { cn } from "@/lib/utils";

const masters = [
  { to: "/customers", label: "Customers", description: "Buyers used in sales and delivery", icon: Contact },
  { to: "/employees", label: "Employees", description: "People used in production and payments", icon: Users },
  { to: "/machines", label: "Machines", description: "Powerlooms used for daily production", icon: Cog },
  { to: "/products", label: "Products", description: "Product codes, units, and rates", icon: Package },
  { to: "/payment-types", label: "Payment Types", description: "Income and expense classifications", icon: Tags },
] as const;

export const Route = createFileRoute("/_authenticated/masters")({
  head: () => ({
    meta: [
      { title: "Masters — LoomTrack" },
      { name: "description", content: "Manage LoomTrack customers, employees, machines, products, and payment types." },
      { property: "og:title", content: "Masters — LoomTrack" },
      { property: "og:description", content: "Manage LoomTrack customers, employees, machines, products, and payment types." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MastersPage,
});

function MastersPage() {
  return (
    <>
      <PageHeader title="Masters" subtitle="Manage the records used across LoomTrack" />
      <nav aria-label="Master records" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {masters.map((master) => (
          <Link
            key={master.to}
            to={master.to}
            className={cn(
              "group flex min-h-28 items-start gap-4 rounded-lg border bg-card p-4 shadow-sm transition-colors",
              "hover:border-primary/40 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
              <master.icon className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold text-foreground group-hover:text-primary">{master.label}</span>
              <span className="mt-1 block text-sm leading-snug text-muted-foreground">{master.description}</span>
            </span>
          </Link>
        ))}
      </nav>
    </>
  );
}