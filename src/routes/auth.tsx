import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/app/ui";
import { supabase } from "@/lib/backend";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — LoomTrack" },
      { name: "description", content: "Sign in to LoomTrack to record production, wages and sales." },
      { property: "og:title", content: "Sign in — LoomTrack" },
      { property: "og:description", content: "Sign in to LoomTrack to record production, wages and sales." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) navigate({ to: "/dashboard" }); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => { if (s) navigate({ to: "/dashboard" }); });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error(error.message);
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
      if (error) toast.error(error.message);
      else if (!data.session) toast.success("Account created. Check your email to confirm, then sign in.");
    }
    setBusy(false);
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error("Google sign-in failed");
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-sidebar bg-weave p-10 text-sidebar-foreground lg:flex">
        <p className="font-display text-2xl font-semibold">LoomTrack</p>
        <div>
          <h1 className="font-display text-5xl font-semibold leading-tight">Every metre woven.<br />Every rupee earned.</h1>
          <p className="mt-4 max-w-md opacity-75">Record daily loom production in seconds. Wages calculate themselves from piece rates.</p>
        </div>
        <p className="text-sm opacity-60">Built for small powerloom units</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <p className="mb-8 font-display text-2xl font-semibold lg:hidden">LoomTrack</p>
          <h2 className="text-3xl font-semibold">{mode === "in" ? "Sign in" : "Create account"}</h2>
          <p className="mb-6 text-sm text-muted-foreground">Owner access to your loom records.</p>
          <form onSubmit={submit} className="space-y-4">
            <Field label="Email" htmlFor="email">
              <Input id="email" type="email" required className="h-12 text-base" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Password" htmlFor="password">
              <Input id="password" type="password" required minLength={6} className="h-12 text-base" value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={busy}>
              {busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}
            </Button>
          </form>
          <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
          <Button variant="outline" size="lg" className="h-12 w-full text-base" onClick={google}>Continue with Google</Button>
          <p className="mt-6 text-center text-sm">
            {mode === "in" ? "New here? " : "Already have an account? "}
            <button className="font-medium text-accent underline-offset-4 hover:underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
              {mode === "in" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
