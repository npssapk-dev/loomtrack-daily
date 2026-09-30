// Single place that decides which Supabase project the app talks to.
// External LoomTrack project is used when VITE_EXTERNAL_SUPABASE_URL and
// VITE_EXTERNAL_SUPABASE_ANON_KEY are set (publishable values only — never the service-role key).
// Otherwise it falls back to the built-in Lovable Cloud client so the app keeps working.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabase as cloudClient } from "@/integrations/supabase/client";

// Browser-safe public values for the external LoomTrack project (publishable key only).
const PUBLIC_EXT_URL = "https://ahkzbgrkyncdqmsfkmng.supabase.co";
const PUBLIC_EXT_KEY = "sb_publishable_vbMm_nv3WW-YQo9FZ48IXA_Fhh2sAXf";
const EXT_URL = (import.meta.env["VITE_EXTERNAL_SUPABASE_URL"] as string | undefined) || PUBLIC_EXT_URL;
const EXT_KEY = (import.meta.env["VITE_EXTERNAL_SUPABASE_ANON_KEY"] as string | undefined) || PUBLIC_EXT_KEY;

// Publishable keys are opaque (not JWTs): send as apikey, never as a Bearer token.
const extFetch: typeof fetch = (input, init) => {
  const h = new Headers(init?.headers);
  if (h.get("Authorization") === `Bearer ${EXT_KEY}`) h.delete("Authorization");
  h.set("apikey", EXT_KEY);
  return fetch(input, { ...init, headers: h });
};

export const backendSource: "external" | "cloud" = EXT_URL && EXT_KEY ? "external" : "cloud";

let ext: SupabaseClient | undefined;
function external(): SupabaseClient {
  if (!ext) {
    ext = createClient(EXT_URL!, EXT_KEY!, {
      global: { fetch: extFetch },
      auth: { persistSession: true, autoRefreshToken: true, storageKey: "loomtrack-ext-auth" },
    });
  }
  return ext;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase: SupabaseClient<any> =
  backendSource === "external"
    ? new Proxy({} as SupabaseClient, { get: (_, p) => Reflect.get(external(), p) })
    : (cloudClient as unknown as SupabaseClient);

export type HealthResult = {
  source: typeof backendSource;
  host: string | null;
  config: "ok" | "missing";
  network: "ok" | "failed" | "skipped";
  auth: "ok" | "failed" | "skipped";
  detail?: string;
};

// Non-destructive check: pings the auth health endpoint and reads the session. No table access.
export async function checkBackend(): Promise<HealthResult> {
  const url = backendSource === "external" ? EXT_URL : (import.meta.env["VITE_SUPABASE_URL"] as string | undefined);
  const key = backendSource === "external" ? EXT_KEY : (import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined);
  const base: HealthResult = { source: backendSource, host: url ? new URL(url).host : null, config: url && key ? "ok" : "missing", network: "skipped", auth: "skipped" };
  if (!url || !key) return base;
  try {
    const r = await fetch(`${url}/auth/v1/health`, { headers: { apikey: key } });
    base.network = r.ok ? "ok" : "failed";
    if (!r.ok) base.detail = `Auth service replied ${r.status}`;
  } catch (e) {
    base.network = "failed";
    base.detail = e instanceof Error ? e.message : "Network error";
    return base;
  }
  const { error } = await supabase.auth.getSession();
  base.auth = error ? "failed" : "ok";
  if (error) base.detail = error.message;
  return base;
}
