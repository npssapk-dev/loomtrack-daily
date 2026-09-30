import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/app/ui";
import { db, errMsg } from "@/lib/data";
import { supabase } from "@/lib/backend";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [
    { title: "Register your business — LoomTrack" },
    { name: "description", content: "Set up your powerloom business in LoomTrack." },
    { property: "og:title", content: "Register your business — LoomTrack" },
    { property: "og:description", content: "Set up your powerloom business in LoomTrack." },
  ] }),
  component: Onboarding,
});

const FIELDS = [
  { key: "company_name", label: "Company / Business Name", required: true, span: true },
  { key: "address", label: "Address", required: true, span: true },
  { key: "phone", label: "Phone", required: true, type: "tel" },
  { key: "email", label: "Email", type: "email" },
  { key: "city", label: "City" },
  { key: "state", label: "State / Province" },
  { key: "country", label: "Country" },
  { key: "postal_code", label: "Postal Code" },
  { key: "tax_id", label: "Tax / Registration ID", span: true },
] as const;

function Onboarding() {
  const [form, setForm] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    for (const f of FIELDS) if ("required" in f && !form[f.key]?.trim()) return toast.error(`${f.label} is required`);
    setBusy(true);
    const v = (k: string) => form[k]?.trim() || null;
    // Existing backend registration function: creates the business and makes the caller OWNER.
    const { error } = await db.rpc("register_business", {
      p_company_name: v("company_name"), p_address: v("address"), p_phone: v("phone"), p_email: v("email"),
      p_city: v("city"), p_state: v("state"), p_country: v("country"), p_postal_code: v("postal_code"), p_tax_id: v("tax_id"),
    });
    if (error) { setBusy(false); return toast.error(errMsg(error)); }
    await qc.invalidateQueries();
    await qc.refetchQueries({ queryKey: ["membership"] });
    toast.success("Business registered");
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:py-14">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-primary bg-weave font-display text-lg font-bold text-primary-foreground">L</div>
          <p className="font-display text-xl font-semibold">LoomTrack</p>
        </div>
        <h1 className="text-3xl font-semibold">Register your business</h1>
        <p className="mb-6 text-sm text-muted-foreground">One-time setup. You will be the owner of this business.</p>
        <form onSubmit={submit} className="grid gap-4 rounded-lg border bg-card p-5 shadow-sm sm:grid-cols-2">
          {FIELDS.map((f) => (
            <Field key={f.key} label={f.label + ("required" in f ? " *" : "")} htmlFor={f.key} className={"span" in f ? "sm:col-span-2" : ""}>
              <Input id={f.key} className="h-12 text-base" type={"type" in f ? f.type : "text"}
                value={form[f.key] ?? ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
            </Field>
          ))}
          <div className="flex flex-wrap justify-between gap-2 sm:col-span-2">
            <Button type="button" variant="ghost" onClick={async () => { qc.clear(); await supabase.auth.signOut(); navigate({ to: "/auth" }); }}>Sign out</Button>
            <Button type="submit" size="lg" disabled={busy}>{busy ? "Registering…" : "Register business"}</Button>
          </div>
        </form>
      </div>
    </main>
  );
}
