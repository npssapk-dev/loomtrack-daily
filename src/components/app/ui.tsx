import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { CalendarDays } from "lucide-react";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string | undefined; actions?: ReactNode }) {
  return (
    <div className="sticky top-14 z-20 -mx-4 mb-4 flex min-h-16 flex-wrap items-center justify-between gap-2 border-b bg-background/95 px-4 py-2.5 shadow-sm backdrop-blur-sm lg:-mx-8 lg:px-8">
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="ml-auto flex shrink-0 flex-wrap justify-end gap-2">{actions}</div>}
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

export const DateInput = forwardRef<HTMLInputElement, Omit<InputHTMLAttributes<HTMLInputElement>, "type">>(
  ({ className, value, disabled, ...props }, ref) => (
    <div className={cn("relative flex h-11 items-center rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50", disabled && "cursor-not-allowed opacity-50", className)}>
      <span className={cn("min-w-0 flex-1", value ? "text-foreground" : "text-muted-foreground")}>{value ? fmtDate(String(value)) : "DD/MM/YYYY"}</span>
      <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <input ref={ref} type="date" value={value} disabled={disabled} className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed" {...props} />
    </div>
  ),
);
DateInput.displayName = "DateInput";

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
