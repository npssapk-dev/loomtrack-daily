import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string | undefined; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-3xl font-semibold leading-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Field({ label, htmlFor, children, error, className, required }: {
  label: string; htmlFor?: string; children: ReactNode; error?: string | undefined; className?: string; required?: boolean;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
        {required && <span className="ml-0.5 text-destructive" aria-hidden="true">*</span>}
        {required && <span className="sr-only"> (required)</span>}
      </Label>
      {children}
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}

export function Panel({ title, children, actions, className }: { title?: string; children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-lg border bg-card shadow-sm", className)}>
      {title && (
        <header className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          {actions}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Stat({ label, value, tone = "default", sub }: { label: string; value: string; tone?: "default" | "accent" | "success" | "danger"; sub?: string }) {
  return (
    <div className="relative overflow-hidden rounded-lg border bg-card p-4 shadow-sm">
      <div className={cn("absolute inset-y-0 left-0 w-1",
        tone === "accent" && "bg-accent", tone === "success" && "bg-success", tone === "danger" && "bg-destructive", tone === "default" && "bg-primary")} />
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="num mt-1 font-display text-2xl font-semibold sm:text-3xl">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{children}</p>;
}

export function StatusBadge({ status }: { status: string }) {
  const tone: Record<string, string> = {
    Draft: "bg-muted text-muted-foreground",
    Delivered: "bg-secondary text-secondary-foreground border",
    "Partially Approved": "bg-warning text-warning-foreground",
    Approved: "bg-primary text-primary-foreground",
    Rejected: "bg-destructive text-destructive-foreground",
    Paid: "bg-success text-success-foreground",
    Active: "bg-success/15 text-success",
    Inactive: "bg-muted text-muted-foreground",
    Employee: "bg-accent/15 text-accent",
    General: "bg-primary/10 text-primary",
  };
  return <span className={cn("inline-flex whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium", tone[status] ?? "bg-muted")}>{status}</span>;
}

export function DataTable({ head, children, foot }: { head: ReactNode; children: ReactNode; foot?: ReactNode }) {
  return (
    <div className="-mx-4 overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead className="border-b bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground [&_th]:px-4 [&_th]:py-2.5 [&_th]:font-medium">
          {head}
        </thead>
        <tbody className="[&_td]:px-4 [&_td]:py-2.5 [&_tr]:border-b [&_tr:last-child]:border-0">{children}</tbody>
        {foot && <tfoot className="border-t-2 font-semibold [&_td]:px-4 [&_td]:py-2.5">{foot}</tfoot>}
      </table>
    </div>
  );
}
