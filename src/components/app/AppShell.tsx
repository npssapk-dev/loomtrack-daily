import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard, Users, Cog, Package, Contact, BarChart3, Settings, Menu, LogOut, Tags, ChevronDown, Library,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
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

const PAGE_NAMES: Record<string, string> = {
  "/dashboard": "Dashboard", "/masters": "Masters", "/customers": "Customers", "/employees": "Employees", "/machines": "Machines", "/products": "Products",
  "/payment-types": "Payment Types", "/production": "Daily Production", "/production-summary": "Production Summary", "/wages": "Employee Wages",
  "/payments": "Income & Expenses", "/deliveries": "Sales & Delivery", "/reports": "Reports", "/settings": "Settings",
};

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

  const navLink = (item: { to: "/dashboard" | "/customers" | "/employees" | "/machines" | "/products" | "/payment-types" | "/reports" | "/settings"; label: string; icon: typeof LayoutDashboard }, nested = false) => {
    const active = pathname.startsWith(item.to);
    return (
      <Link key={item.to} to={item.to}
        className={cn("flex items-center gap-3 rounded-md px-3 py-2.5 text-[15px] transition-colors", nested && "ml-3 py-2 text-sm",
          active ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-[inset_3px_0_0_var(--sidebar-primary)]" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60")}>
        <item.icon className="h-[18px] w-[18px]" />
        {item.label}
      </Link>
    );
  };

  const navList = (
    <nav className="flex flex-col gap-0.5">
      {navLink({ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard })}
      <Collapsible open={mastersOpen} onOpenChange={setMastersOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className={cn("h-auto w-full justify-start gap-3 px-3 py-2.5 text-[15px] font-normal text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground", onMaster && "font-medium text-sidebar-accent-foreground")}>
            <Library className="h-[18px] w-[18px]" />
            <span className="flex-1 text-left">Masters</span>
            <ChevronDown className={cn("h-4 w-4 transition-transform", mastersOpen && "rotate-180")} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-0.5 pt-0.5">
          {MASTERS.map((item) => navLink(item, true))}
        </CollapsibleContent>
      </Collapsible>
      {navLink({ to: "/reports", label: "Reports", icon: BarChart3 })}
      {navLink({ to: "/settings", label: "Settings", icon: Settings })}
    </nav>
  );

  const pageName = PAGE_NAMES[pathname] ?? "LoomTrack";
  const masterName = onMaster && pathname !== "/masters" ? pageName : null;
  const crumb = (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap gap-1 text-xs sm:text-sm">
        {masterName && <><BreadcrumbItem><BreadcrumbLink asChild><Link to="/masters"><span className="hidden sm:inline">Masters</span><Library className="h-3.5 w-3.5 sm:hidden" aria-label="Masters" /></Link></BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator /></>}
        <BreadcrumbItem className="min-w-0"><BreadcrumbPage className="max-w-36 truncate sm:max-w-none">{pageName}</BreadcrumbPage></BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col bg-sidebar p-4 text-sidebar-foreground lg:flex">
        <div className="mb-6 px-1"><Brand name={settings?.business_name} /></div>
        <div className="flex-1 overflow-y-auto">{navList}</div>
        <Button variant="ghost" onClick={signOut} className="mt-4 h-auto justify-start gap-3 px-3 py-2.5 text-sm font-normal text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground">
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background px-4 lg:ml-64 lg:px-8">
        <div className="min-w-0 flex-1">{crumb}</div>
        <div className="h-6 w-px bg-border" aria-hidden="true" />
        <div className="shrink-0 scale-90 origin-right"><Brand /></div>
        <Button variant="ghost" size="icon" onClick={() => setOpen(true)} className="shrink-0 lg:hidden" aria-label="Open menu">
          <Menu className="h-6 w-6" />
        </Button>
      </header>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar p-4 text-sidebar-foreground">
          <SheetHeader className="mb-4 p-0"><SheetTitle className="text-sidebar-foreground"><Brand name={settings?.business_name} /></SheetTitle></SheetHeader>
          {navList}
          <Button variant="ghost" onClick={signOut} className="mt-4 h-auto w-full justify-start gap-3 px-3 py-2.5 text-sm font-normal text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground">
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </SheetContent>
      </Sheet>

      <main className="px-4 pb-10 lg:ml-64 lg:px-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
