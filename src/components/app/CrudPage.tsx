import { useRef, useState, type ReactNode } from "react";
import { Pencil, Plus, Power } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataTable, Empty, Field, PageHeader, Panel, StatusBadge } from "./ui";
import { db, errMsg, useBusinessId, useInvalidateAll, useMasterPage, useUserNames } from "@/lib/data";

export type CrudField = {
  key: string; label: string; type?: "text" | "number" | "date" | "textarea" | "bool" | "email" | "tel";
  required?: boolean; placeholder?: string; defaultValue?: unknown; min?: number;
};

type Row = Record<string, unknown> & {
  id: number; is_active: boolean;
  created_at?: string | null; created_by?: string | null; updated_at?: string | null; updated_by?: string | null;
};

const PAGE = 25;
export const fmtDateTime = (s?: string | null) => (s ? new Date(s).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—");

/** Master CRUD: server-paged, business-scoped, audit-aware. id and audit fields come from the database only. Soft-deactivate instead of delete. */
export function CrudPage<T extends Row>({
  title, subtitle, table, singular, fields, columns, uniqueLabel,
}: {
  title: string; subtitle?: string; table: string; singular: string; fields: CrudField[];
  columns: { label: string; render: (r: T) => ReactNode; className?: string }[];
  uniqueLabel?: string;
}) {
  const [page, setPage] = useState(0);
  const { data, isLoading, isFetching } = useMasterPage<T>(table, page, PAGE);
  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const { data: names } = useUserNames(rows.flatMap((r) => [r.created_by, r.updated_by]));
  const who = (id?: string | null) => (!id ? "System/Existing" : names?.[id] ?? "User");

  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [saving, setSaving] = useState(false);
  const lock = useRef(false);
  const [toggling, setToggling] = useState<number | null>(null);
  const invalidate = useInvalidateAll();
  const bid = useBusinessId();

  const blank = () => Object.fromEntries(fields.map((f) => [f.key, f.defaultValue ?? (f.type === "bool" ? true : "")]));

  async function save() {
    if (!editing || !bid || lock.current) return;
    for (const f of fields) {
      const v = editing[f.key];
      if (f.required && (v == null || String(v).trim() === "")) { toast.error(`${f.label} is required`); return; }
      if (f.type === "number" && v !== "" && v != null) {
        const n = Number(v);
        if (Number.isNaN(n)) { toast.error(`${f.label} must be a number`); return; }
        if (f.min != null && n < f.min) { toast.error(`${f.label} cannot be negative`); return; }
      }
    }
    const payload: Record<string, unknown> = {};
    for (const f of fields) {
      const v = editing[f.key];
      payload[f.key] = f.type === "number" ? Number(v || 0) : f.type === "bool" ? !!v : typeof v === "string" ? (v.trim() || null) : v ?? null;
    }
    lock.current = true; setSaving(true);
    try {
      const { error } = editing["id"]
        ? await db.from(table).update(payload).eq("id", editing["id"]).eq("business_id", bid)
        : await db.from(table).insert({ ...payload, business_id: bid });
      if (error) { toast.error(error.code === "23505" ? `That ${uniqueLabel ?? "value"} already exists` : errMsg(error)); return; }
      toast.success(`${singular} ${editing["id"] ? "updated" : "added"}`);
      if (!editing["id"]) setPage(0);
      setEditing(null);
      invalidate();
    } catch (e) { toast.error(errMsg(e)); }
    finally { lock.current = false; setSaving(false); }
  }

  async function toggleActive(r: T) {
    if (toggling) return;
    const next = !r.is_active;
    if (!confirm(`${next ? "Reactivate" : "Deactivate"} ${singular.toLowerCase()} ${r.id}?${next ? "" : " It will no longer appear in new entries; past records are kept."}`)) return;
    setToggling(r.id);
    try {
      const { error } = await db.from(table).update({ is_active: next }).eq("id", r.id).eq("business_id", bid);
      if (error) { toast.error(errMsg(error)); return; }
      toast.success(`${singular} ${next ? "reactivated" : "deactivated"}`);
      invalidate();
    } finally { setToggling(null); }
  }

  const audit = editing?.["id"] ? (editing as Row) : null;

  return (
    <>
      <PageHeader title={title} subtitle={subtitle}
        actions={<Button size="lg" onClick={() => setEditing(blank())}><Plus /> Add {singular}</Button>} />
      <Panel>
        {isLoading ? <Empty>Loading…</Empty> : !rows.length ? <Empty>No records yet.</Empty> : (
          <>
            <DataTable head={<tr><th className="w-20">No.</th>{columns.map((c) => <th key={c.label} className={c.className}>{c.label}</th>)}<th>Status</th><th>Created at</th><th>Created by</th><th className="w-24" /></tr>}>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="num">{r.id}</td>
                  {columns.map((c) => <td key={c.label} className={c.className}>{c.render(r)}</td>)}
                  <td><StatusBadge status={r.is_active ? "Active" : "Inactive"} /></td>
                  <td className="whitespace-nowrap text-xs">{fmtDateTime(r.created_at)}</td>
                  <td className="whitespace-nowrap text-xs">{who(r.created_by)}</td>
                  <td className="whitespace-nowrap text-right">
                    <Button variant="ghost" size="icon" onClick={() => setEditing({ ...r })} aria-label="Edit"><Pencil /></Button>
                    <Button variant="ghost" size="icon" disabled={toggling === r.id} onClick={() => toggleActive(r)}
                      aria-label={r.is_active ? "Deactivate" : "Reactivate"} title={r.is_active ? "Deactivate" : "Reactivate"}>
                      <Power className={r.is_active ? "text-destructive" : "text-success"} />
                    </Button>
                  </td>
                </tr>
              ))}
            </DataTable>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
              <span>Showing {page * PAGE + 1}–{page * PAGE + rows.length} of {total} · Page {page + 1} of {pages}</span>
              <div className="flex gap-2">
                <Button variant="outline" disabled={page === 0 || isFetching} onClick={() => setPage(page - 1)}>Previous</Button>
                <Button variant="outline" disabled={page + 1 >= pages || isFetching} onClick={() => setPage(page + 1)}>Next</Button>
              </div>
            </div>
          </>
        )}
      </Panel>

      <Dialog open={!!editing} onOpenChange={(o) => !o && !saving && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{audit ? `Edit ${singular} ${audit.id}` : `Add ${singular}`}</DialogTitle></DialogHeader>
          {editing && (
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
              {audit && (
                <div className="grid gap-1 rounded-md border px-3 py-2 text-xs text-muted-foreground sm:grid-cols-2">
                  <span>Created: {fmtDateTime(audit.created_at)} · {who(audit.created_by)}</span>
                  <span>Updated: {audit.updated_at ? `${fmtDateTime(audit.updated_at)} · ${who(audit.updated_by)}` : "—"}</span>
                </div>
              )}
              {fields.map((f) => (
                <Field key={f.key} label={f.label} htmlFor={f.key} required={!!f.required}>
                  {f.type === "bool" ? (
                    <div className="flex h-11 items-center gap-3">
                      <Switch id={f.key} checked={!!editing[f.key]} onCheckedChange={(v) => setEditing({ ...editing, [f.key]: v })} />
                      <span className="text-sm">{editing[f.key] ? "Active" : "Inactive"}</span>
                    </div>
                  ) : f.type === "textarea" ? (
                    <Textarea id={f.key} required={f.required} value={String(editing[f.key] ?? "")} onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })} />
                  ) : (
                    <Input id={f.key} className="h-12 text-base" type={f.type ?? "text"} required={f.required}
                      step={f.type === "number" ? "0.01" : undefined} min={f.min}
                      inputMode={f.type === "number" ? "decimal" : undefined} placeholder={f.placeholder}
                      value={String(editing[f.key] ?? "")} onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })} />
                  )}
                </Field>
              ))}
              <DialogFooter>
                <Button type="button" variant="outline" size="lg" disabled={saving} onClick={() => setEditing(null)}>Cancel</Button>
                <Button type="submit" size="lg" disabled={saving} aria-busy={saving}>{saving ? (audit ? "Updating…" : "Saving…") : (audit ? "Update" : "Save")}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
