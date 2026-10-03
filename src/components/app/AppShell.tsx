import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard, Users, Cog, Package, Contact, BarChart3, Settings, MoreHorizontal, LogOut, Tags, ChevronDown, Library, Factory, IndianRupee, Truck, PieChart, Wallet, Menu, PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/lib/backend";
import { useSettings } from "@/lib/data";
import { setCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const MASTERS = [
  { to: "/customers", label: "Customers", icon: Contact },
  { to: "/employees", label: "Employees", icon: Users },
  { to: "/machines", label: "Machines", icon: Cog },
  { to: "/products", label: "Products", icon: Package },
  { to: "/payment-types", label: "Payment Types", icon: Tags },
] as const;

const DAILY_NAV = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/production", label: "Production", icon: Factory },
  { to: "/payments", label: "Income & Exp", icon: IndianRupee },
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
  const [collapsed, setCollapsed] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onMaster = pathname === "/masters" || MASTERS.some((item) => pathname.startsWith(item.to));
  const [mastersOpen, setMastersOpen] = useState(onMaster);
  const { data: settings } = useSettings();
  const qc = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => { if (settings) setCurrency(settings.currency); }, [settings]);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => { if (onMaster) setMastersOpen(true); }, [onMaster]);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const navLink = (item: { to: "/dashboard" | "/production" | "/payments" | "/deliveries" | "/production-summary" | "/wages" | "/customers" | "/employees" | "/machines" | "/products" | "/payment-types" | "/reports" | "/settings"; label: string; icon: typeof LayoutDashboard }, nested = false, compact = false) => {
    const active = pathname.startsWith(item.to);
    return (
      <Link key={item.to} to={item.to}
        aria-label={item.label}
        title={compact ? item.label : undefined}
        className={cn("flex min-w-0 items-center gap-3 rounded-md px-3 py-2.5 text-[15px] transition-colors", nested && !compact && "ml-3 py-2 text-sm", compact && "justify-center px-2",
          active ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-[inset_3px_0_0_var(--sidebar-primary)]" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60")}>
        <item.icon className="h-[18px] w-[18px] shrink-0" />
        {!compact && <span className="truncate">{item.label}</span>}
      </Link>
    );
  };

  const navigation = (compact = false) => (
    <nav className="flex flex-col gap-0.5">
      {navLink({ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard }, false, compact)}
      {navLink({ to: "/production", label: "Daily Production", icon: Factory }, false, compact)}
      {navLink({ to: "/payments", label: "Income & Expenses", icon: IndianRupee }, false, compact)}
      {navLink({ to: "/deliveries", label: "Sales & Delivery", icon: Truck }, false, compact)}
      {navLink({ to: "/production-summary", label: "Production Summary", icon: PieChart }, false, compact)}
      {navLink({ to: "/wages", label: "Employee Wages", icon: Wallet }, false, compact)}
      <Collapsible open={mastersOpen} onOpenChange={setMastersOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" title={compact ? "Masters" : undefined} aria-label="Masters" className={cn("h-auto w-full justify-start gap-3 px-3 py-2.5 text-[15px] font-normal text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground", compact && "justify-center px-2", onMaster && "font-medium text-sidebar-accent-foreground")}>
            <Library className="h-[18px] w-[18px] shrink-0" />
            {!compact && <><span className="flex-1 text-left">Masters</span><ChevronDown className={cn("h-4 w-4 transition-transform", mastersOpen && "rotate-180")} /></>}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-0.5 pt-0.5">
          {MASTERS.map((item) => navLink(item, true, compact))}
        </CollapsibleContent>
      </Collapsible>
      {navLink({ to: "/reports", label: "Reports", icon: BarChart3 }, false, compact)}
      {navLink({ to: "/settings", label: "Settings", icon: Settings }, false, compact)}
    </nav>
  );

  return (
    <div className="min-h-screen">
      <aside className={cn("fixed inset-x-0 bottom-0 left-0 top-14 hidden flex-col bg-sidebar p-3 text-sidebar-foreground transition-[width] lg:flex", collapsed ? "w-16" : "w-64")}>
        {!collapsed && settings?.business_name && <p className="mb-4 truncate px-3 pt-2 text-sm font-medium text-sidebar-foreground/70">{settings.business_name}</p>}
        <div className={cn("flex-1 overflow-y-auto", collapsed && "pt-2")}>{navigation(collapsed)}</div>
        <Button variant="ghost" title={collapsed ? "Sign out" : undefined} aria-label="Sign out" onClick={signOut} className={cn("mt-4 h-auto justify-start gap-3 px-3 py-2.5 text-sm font-normal text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground", collapsed && "justify-center px-2")}>
          <LogOut className="h-4 w-4 shrink-0" /> {!collapsed && "Sign out"}
        </Button>
      </aside>

      <header className="sticky top-0 z-30 grid h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b bg-background px-4 lg:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <Button type="button" variant="ghost" size="icon" className="-ml-2 shrink-0 lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation" title="Open navigation"><Menu /></Button>
          <Button type="button" variant="ghost" size="icon" className="-ml-2 hidden shrink-0 lg:inline-flex" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? "Expand navigation" : "Collapse navigation"} title={collapsed ? "Expand navigation" : "Collapse navigation"}>
            {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          </Button>
          <div className="min-w-0"><Brand /></div>
        </div>
        <div className="flex items-center gap-2" />
      </header>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar p-4 text-sidebar-foreground">
          <SheetHeader className="mb-4 p-0"><SheetTitle className="text-sidebar-foreground"><Brand name={settings?.business_name} /></SheetTitle></SheetHeader>
          {navigation()}
          <Button variant="ghost" onClick={signOut} className="mt-4 h-auto w-full justify-start gap-3 px-3 py-2.5 text-sm font-normal text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground">
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </SheetContent>
      </Sheet>

      <main className={cn("px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] transition-[margin] lg:px-8 lg:pb-10", collapsed ? "lg:ml-16" : "lg:ml-64")}>
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>

      <nav aria-label="Daily navigation" className="fixed inset-x-0 bottom-0 z-40 grid h-16 grid-cols-5 border-t bg-background/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_12px_hsl(var(--foreground)/0.08)] backdrop-blur-sm lg:hidden">
        {DAILY_NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeOptions={{ exact: true }}
            className="flex min-w-0 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium text-muted-foreground transition-colors data-[status=active]:text-primary"
          >
            <item.icon className="h-5 w-5" />
            <span className="max-w-full truncate">{item.label}</span>
          </Link>
        ))}
        <Button
          type="button"
          variant="ghost"
          onClick={() => setOpen(true)}
          className="flex h-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-none px-1 text-[11px] font-medium text-muted-foreground"
          aria-label="More navigation"
        >
          <MoreHorizontal className="h-5 w-5" />
          <span>More</span>
        </Button>
      </nav>
    </div>
  );
}
