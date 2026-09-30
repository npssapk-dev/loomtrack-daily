import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { checkBackend, type HealthResult } from "@/lib/backend";

export const Route = createFileRoute("/status")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Connection status — LoomTrack" },
      { name: "description", content: "Check whether LoomTrack can reach its database." },
      { property: "og:title", content: "Connection status — LoomTrack" },
      { property: "og:description", content: "Check whether LoomTrack can reach its database." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StatusPage,
});

function StatusPage() {
  const [r, setR] = useState<HealthResult | null>(null);
  useEffect(() => { checkBackend().then(setR); }, []);
  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="font-display text-2xl font-semibold">Connection status</h1>
      {!r ? <p className="mt-4 text-muted-foreground">Checking…</p> : (
        <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <dt>Database</dt><dd>{r.source === "external" ? "Your LoomTrack project" : "Lovable Cloud (fallback)"}</dd>
          <dt>Host</dt><dd>{r.host ?? "—"}</dd>
          <dt>Settings</dt><dd>{r.config}</dd>
          <dt>Network</dt><dd>{r.network}</dd>
          <dt>Sign-in service</dt><dd>{r.auth}</dd>
          {r.detail && <><dt>Detail</dt><dd>{r.detail}</dd></>}
        </dl>
      )}
    </div>
  );
}
