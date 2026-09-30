import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/lib/backend";
import { fetchMembership } from "@/lib/data";
import { AppShell } from "@/components/app/AppShell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location, context }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    // Business membership gate: no business -> onboarding; has business -> skip onboarding.
    const membership = await context.queryClient.fetchQuery({ queryKey: ["membership"], queryFn: fetchMembership, staleTime: 60_000 });
    const onOnboarding = location.pathname === "/onboarding";
    if (!membership && !onOnboarding) throw redirect({ to: "/onboarding" });
    if (membership && onOnboarding) throw redirect({ to: "/dashboard" });
    return { user: data.user, membership };
  },
  component: Layout,
});

function Layout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname === "/onboarding") return <Outlet />;
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
