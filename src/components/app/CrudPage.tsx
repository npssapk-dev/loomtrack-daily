import { useState, type ReactNode } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataTable, Empty, Field, PageHeader, Panel, StatusBadge } from "./ui";
import { db, errMsg, useInvalidateAll } from "@/lib/data";

export type CrudField = {
  key: string; label: string; type?: "text" | "number" | "date" | "textarea" | "bool";
  required?: boolean; placeholder?: string; defaultValue?: unknown;
};

type Row = Record<string, unknown> & { id: string };

export function CrudPage<T extends Row>({
  title, subtitle, table, singular, fields, rows, loading, columns, children,
}: {
  title: string; subtitle?: string; table: string; singular: string; fields: CrudField[];
  rows?: T[]; loading?: boolean;
  columns: { label: string; render: (r: T) => ReactNode; className?: string }[];
  children?: ReactNode;
}) {
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [saving, setSaving] = useState(false);
  const invalidate = useInvalidateAll();

  const blank = () => Object.fromEntries(fields.map((f) => [f.key, f.defaultValue ?? (f.type === "bool" ? true : "")]));

  async function save() {
    if (!editing) return;
    for (const f of fields) {
      if (f.required && (editing[f.key] === "" || editing[f.key] == null)) {
        toast.error(`${f.label} is required`);
        return;
      }
    }
    const payload: Record<string, unknown> = {};
    for (const f of fields) {
      const v = editing[f.key];
      payload[f.key] = f.type === "number" ? Number(v || 0) : v === "" ? null : v;
    }
    setSaving(true);
    const q = editing["id"] ? db.from(table).update(payload).eq("id", editing["id"]) : db.from(table).insert(payload);
    const { error } = await q;
    setSaving(false);
    if (error) {
      toast.error(error.code === "23505" ? `That ${fields[1]?.label ?? "value"} already exists` : errMsg(error));
      return;
    }
    toast.success(`${singular} saved`);
    setEditing(null);
    invalidate();
  }

  async function remove(r: T) {
    if (!confirm(`Delete this ${singular.toLowerCase()}?`)) return;
    const { error } = await db.from(table).delete().eq("id", r.id);
    if (error) {
      toast.error(error.code === "23503" ? `This ${singular.toLowerCase()} is used in records. Mark it Inactive instead.` : errMsg(error));
      return;
    }
    toast.success(`${singular} deleted`);
    invalidate();
  }

  return (
    <>
      <PageHeader title={title} subtitle={subtitle}
        actions={<Button size="lg" onClick={() => setEditing(blank())}><Plus /> Add {singular}</Button>} />
      <Panel>
        {loading ? <Empty>Loading…</Empty> : !rows?.length ? <Empty>No records yet.</Empty> : (
          <DataTable head={<tr>{columns.map((c) => <th key={c.label} className={c.className}>{c.label}</th>)}<th className="w-24" /></tr>}>
            {rows.map((r) => (
              <tr key={r.id}>
                {columns.map((c) => <td key={c.label} className={c.className}>{c.render(r)}</td>)}
                <td className="whitespace-nowrap text-right">
                  <Button variant="ghost" size="icon" onClick={() => setEditing({ ...r })} aria-label="Edit"><Pencil /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(r)} aria-label="Delete"><Trash2 className="text-destructive" /></Button>
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </Panel>
      {children}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit" : "Add"} {singular}</DialogTitle></DialogHeader>
          {editing && (
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
              {fields.map((f) => (
                <Field key={f.key} label={f.label + (f.required ? " *" : "")} htmlFor={f.key}>
                  {f.type === "bool" ? (
                    <div className="flex h-11 items-center gap-3">
                      <Switch id={f.key} checked={!!editing[f.key]} onCheckedChange={(v) => setEditing({ ...editing, [f.key]: v })} />
                      <span className="text-sm">{editing[f.key] ? "Active" : "Inactive"}</span>
                    </div>
                  ) : f.type === "textarea" ? (
                    <Textarea id={f.key} value={String(editing[f.key] ?? "")} onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })} />
                  ) : (
                    <Input id={f.key} className="h-12 text-base" type={f.type ?? "text"} step={f.type === "number" ? "0.01" : undefined}
                      inputMode={f.type === "number" ? "decimal" : undefined} placeholder={f.placeholder}
                      value={String(editing[f.key] ?? "")} onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })} />
                  )}
                </Field>
              ))}
              <DialogFooter>
                <Button type="button" variant="outline" size="lg" onClick={() => setEditing(null)}>Cancel</Button>
                <Button type="submit" size="lg" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export const activeCol = <T extends { active: boolean }>() => ({
  label: "Status", render: (r: T) => <StatusBadge status={r.active ? "Active" : "Inactive"} />,
});
