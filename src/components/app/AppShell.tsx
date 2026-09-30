import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard, Factory, Users, IndianRupee, Receipt, Cog, Package, Contact, Truck, BarChart3, Settings, Menu, LogOut, Wallet, PieChart, Tags,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/lib/backend";
import { useSettings } from "@/lib/data";
import { setCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/production", label: "Daily Production", icon: Factory },
  { to: "/employees", label: "Employees", icon: Users },
  { to: "/production-summary", label: "Production Summary", icon: PieChart },
  { to: "/wages", label: "Employee Wages", icon: Wallet },
  { to: "/payments", label: "Income & Expenses", icon: IndianRupee },
  { to: "/deliveries", label: "Sales & Delivery", icon: Truck },
  { to: "/machines", label: "Machines", icon: Cog },
  { to: "/products", label: "Products", icon: Package },
  { to: "/customers", label: "Customers", icon: Contact },
  { to: "/payment-types", label: "Payment Types", icon: Tags },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

const BOTTOM = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/production", label: "Production", icon: Factory },
  { to: "/payments", label: "Payments", icon: Receipt },
  { to: "/deliveries", label: "Sales", icon: Truck },
] as const;

function Brand({ name }: { name?: string | undefined }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid h-9 w-9 place-items-center rounded-md bg-sidebar-primary bg-weave font-display text-lg font-bold text-sidebar-primary-foreground">L</div>
      <div className="leading-tight">
        <p className="font-display text-lg font-semibold">LoomTrack</p>
        {name && <p className="max-w-40 truncate text-xs opacity-70">{name}</p>}
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: settings } = useSettings();
  const qc = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => { if (settings) setCurrency(settings.currency); }, [settings]);
  useEffect(() => setOpen(false), [pathname]);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const navList = (
    <nav className="flex flex-col gap-0.5">
      {NAV.map((n) => {
        const active = pathname.startsWith(n.to);
        return (
          <Link key={n.to} to={n.to}
            className={cn("flex items-center gap-3 rounded-md px-3 py-2.5 text-[15px] transition-colors",
              active ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-[inset_3px_0_0_var(--sidebar-primary)]" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60")}>
            <n.icon className="h-[18px] w-[18px]" />
            {n.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col bg-sidebar p-4 text-sidebar-foreground lg:flex">
        <div className="mb-6 px-1"><Brand name={settings?.business_name} /></div>
        <div className="flex-1 overflow-y-auto">{navList}</div>
        <button onClick={signOut} className="mt-4 flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/60">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-sidebar px-4 text-sidebar-foreground lg:hidden">
        <Brand name={settings?.business_name} />
        <button onClick={() => setOpen(true)} className="grid h-11 w-11 place-items-center rounded-md hover:bg-sidebar-accent" aria-label="Open menu">
          <Menu className="h-6 w-6" />
        </button>
      </header>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar p-4 text-sidebar-foreground">
          <SheetHeader className="mb-4 p-0"><SheetTitle className="text-sidebar-foreground"><Brand name={settings?.business_name} /></SheetTitle></SheetHeader>
          {navList}
          <button onClick={signOut} className="mt-4 flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/60">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </SheetContent>
      </Sheet>

      <main className="px-4 pb-28 pt-5 lg:ml-64 lg:px-8 lg:pb-10 lg:pt-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-card pb-[env(safe-area-inset-bottom)] lg:hidden">
        {BOTTOM.map((n) => {
          const active = pathname.startsWith(n.to);
          return (
            <Link key={n.to} to={n.to} className={cn("flex h-16 flex-col items-center justify-center gap-1 text-xs", active ? "font-semibold text-primary" : "text-muted-foreground")}>
              <n.icon className="h-5 w-5" />{n.label}
            </Link>
          );
        })}
        <button onClick={() => setOpen(true)} className="flex h-16 flex-col items-center justify-center gap-1 text-xs text-muted-foreground">
          <Menu className="h-5 w-5" />More
        </button>
      </nav>
    </div>
  );
}
