import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Empty, Field, PageHeader, Panel } from "@/components/app/ui";
import { db, errMsg, useMembership } from "@/lib/data";
import { supabase } from "@/lib/backend";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — LoomTrack" }, { name: "description", content: "Business profile and your account in LoomTrack." }, { property: "og:title", content: "Settings — LoomTrack" }, { property: "og:description", content: "Business profile and your account in LoomTrack." }] }),
  component: Settings,
});

const FIELDS = [
  { k: "company_name", l: "Business name", req: true, max: 150 },
  { k: "phone", l: "Phone", req: true, max: 30, type: "tel" },
  { k: "email", l: "Email", max: 255, type: "email" },
  { k: "city", l: "City", max: 100 },
  { k: "state", l: "State / Province", max: 100 },
  { k: "country", l: "Country", max: 100 },
  { k: "postal_code", l: "Postal code", max: 20 },
  { k: "tax_id", l: "Tax / Registration ID", max: 50 },
] as const;
type Form = Record<(typeof FIELDS)[number]["k"] | "address", string>;

function Settings() {
  const qc = useQueryClient();
  const { data: m } = useMembership();
  const b = m?.businesses as Record<string, unknown> | undefined;
  const [form, setForm] = useState<Form | null>(null);
  const [errs, setErrs] = useState<Partial<Form>>({});
  const [saving, setSaving] = useState(false);
  const lock = useRef(false);

  useEffect(() => {
    if (b && !form) {
      const f = { address: String(b["address"] ?? "") } as Form;
      FIELDS.forEach((x) => (f[x.k] = String(b[x.k] ?? "")));
      setForm(f);
    }
  }, [b, form]);

  const me = useQuery({
    queryKey: ["me-profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await db.from("profiles").select("full_name,email").eq("user_id", u.user.id).maybeSingle();
      return { email: u.user.email ?? data?.email ?? "", name: data?.full_name ?? "" };
    },
  });

  const save = async () => {
    if (!form || !m || lock.current) return;
    const e: Partial<Form> = {};
    if (!form.company_name.trim()) e.company_name = "Business name is required";
    if (!form.address.trim()) e.address = "Address is required";
    if (!form.phone.trim()) e.phone = "Phone is required";
    else if (!/^[0-9+()\-\s]{5,30}$/.test(form.phone.trim())) e.phone = "Enter a valid phone number";
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = "Enter a valid email";
    setErrs(e);
    if (Object.keys(e).length) return;
    lock.current = true; setSaving(true);
    try {
      const patch: Record<string, string | null> = {};
      (Object.keys(form) as (keyof Form)[]).forEach((k) => { const v = form[k].trim(); patch[k] = v || null; });
      const { data, error } = await db.from("businesses").update(patch).eq("id", m.business_id).select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("You don't have permission to change the business profile.");
      await qc.invalidateQueries({ queryKey: ["membership"] });
      toast.success("Business profile saved");
    } catch (err) { toast.error(errMsg(err)); }
    finally { lock.current = false; setSaving(false); }
  };

  const set = (k: keyof Form, v: string) => setForm((f) => (f ? { ...f, [k]: v } : f));

  return (
    <>
      <PageHeader title="Settings" />
      <div className="space-y-5">
        <Panel title="Business profile">
          {form ? (
            <form className="grid gap-3 sm:grid-cols-2" onSubmit={(ev) => { ev.preventDefault(); void save(); }} noValidate>
              {FIELDS.slice(0, 2).map((x) => (
                <Field key={x.k} label={x.l} htmlFor={`s-${x.k}`} required={"req" in x} error={errs[x.k]}>
                  <Input id={`s-${x.k}`} type={"type" in x ? x.type : "text"} maxLength={x.max} required={"req" in x} aria-required={"req" in x} value={form[x.k]} onChange={(ev) => set(x.k, ev.target.value)} />
                </Field>
              ))}
              <Field label="Address" htmlFor="s-address" required error={errs.address} className="sm:col-span-2">
                <Textarea id="s-address" rows={2} maxLength={500} required aria-required value={form.address} onChange={(ev) => set("address", ev.target.value)} />
              </Field>
              {FIELDS.slice(2).map((x) => (
                <Field key={x.k} label={x.l} htmlFor={`s-${x.k}`} error={errs[x.k]}>
                  <Input id={`s-${x.k}`} type={"type" in x ? x.type : "text"} maxLength={x.max} value={form[x.k]} onChange={(ev) => set(x.k, ev.target.value)} />
                </Field>
              ))}
              <div className="flex items-center justify-between gap-3 sm:col-span-2">
                <span className="text-sm text-muted-foreground">Business No. {m?.business_id}</span>
                <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
              </div>
            </form>
          ) : <Empty>Loading…</Empty>}
        </Panel>
        <Panel title="Your account">
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {[["Name", me.data?.name], ["Email", me.data?.email], ["Role", m?.role]].map(([k, v]) => (
              <div key={String(k)} className="flex justify-between gap-3 border-b py-1.5"><dt className="text-muted-foreground">{k}</dt><dd className="min-w-0 truncate text-right font-medium">{v || "—"}</dd></div>
            ))}
          </dl>
        </Panel>
        <Panel title="Payment types">
          <p className="text-sm">Add, edit or deactivate payment types on the <Link to="/payment-types" className="font-semibold underline">Payment Types</Link> page.</p>
        </Panel>
      </div>
    </>
  );
}
