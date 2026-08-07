"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Plus, GraduationCap, Loader2, Pencil, Trash2, ChevronDown, ChevronUp, ChevronsUpDown, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { LocationSelect } from "@/components/location-select";
import { toast } from "@/lib/use-toast";

const sessionSchema = z.object({
  name: z.string().min(1, "Required"),
  color: z.string().default("#3B82F6"),
  location: z.string().optional(),
  notes: z.string().optional(),
});

type SessionFormData = z.infer<typeof sessionSchema>;

function MembershipDropdown({
  services,
  selectedIds,
  onToggle,
}: {
  services: any[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selectedNames = services.filter((s) => selectedIds.includes(s.id)).map((s) => s.name);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className={selectedNames.length === 0 ? "text-muted-foreground" : ""}>
          {selectedNames.length === 0
            ? "Select memberships..."
            : selectedNames.join(", ")}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-white dark:bg-zinc-900 shadow-md">
          <div className="max-h-52 overflow-y-auto py-1">
            {services.map((s) => {
              const checked = selectedIds.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onToggle(s.id)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left"
                >
                  <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${checked ? "bg-primary border-primary" : "border-border"}`}>
                    {checked && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>
                  {s.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SessionForm({
  form,
  services,
  allowedServiceIds,
  onToggleService,
  onSubmit,
  onCancel,
  submitLabel,
  loading,
}: {
  form: any;
  services: any[];
  allowedServiceIds: string[];
  onToggleService: (id: string) => void;
  onSubmit: (d: SessionFormData) => void;
  onCancel: () => void;
  submitLabel: string;
  loading: boolean;
}) {
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label>Class Name</Label>
        <Input placeholder="e.g. BJJ Open Mats" {...form.register("name")} />
        {form.formState.errors.name && (
          <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label>Color</Label>
        <div className="flex flex-wrap gap-2">
          {["#3B82F6","#6366F1","#8B5CF6","#EC4899","#EF4444","#F59E0B","#10B981","#14B8A6","#0EA5E9","#64748B"].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => form.setValue("color", c)}
              className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
              style={{ backgroundColor: c, borderColor: form.watch("color") === c ? "#000" : "transparent" }}
            />
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <Label>Location</Label>
        <LocationSelect
          value={form.watch("location") ?? ""}
          onChange={(v) => form.setValue("location", v)}
        />
      </div>

      <div className="space-y-2">
        <Label>Allowed Memberships</Label>
        <MembershipDropdown
          services={services}
          selectedIds={allowedServiceIds}
          onToggle={onToggleService}
        />
      </div>

      <div className="space-y-1">
        <Label>Notes</Label>
        <Input placeholder="Optional notes..." {...form.register("notes")} />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function ClassesClient({
  sessions: initial,
  services,
  isAdmin,
}: {
  sessions: any[];
  services: any[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [editSession, setEditSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [addAllowedIds, setAddAllowedIds] = useState<string[]>([]);
  const [editAllowedIds, setEditAllowedIds] = useState<string[]>([]);
  const [sortCol, setSortCol] = useState<string>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const addForm = useForm<SessionFormData>({ resolver: zodResolver(sessionSchema) });
  const editForm = useForm<SessionFormData>({ resolver: zodResolver(sessionSchema) });

  function toggleSort(col: string) {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(col); setSortDir("asc"); }
  }

  function SortIcon({ col }: { col: string }) {
    if (sortCol !== col) return <ChevronsUpDown className="h-3.5 w-3.5 ml-1 text-muted-foreground/50" />;
    return sortDir === "asc"
      ? <ChevronUp className="h-3.5 w-3.5 ml-1" />
      : <ChevronDown className="h-3.5 w-3.5 ml-1" />;
  }

  const sorted = [...initial].sort((a, b) => {
    let aVal: any, bVal: any;
    if (sortCol === "name") { aVal = a.name?.toLowerCase() ?? ""; bVal = b.name?.toLowerCase() ?? ""; }
    else if (sortCol === "location") { aVal = a.location?.toLowerCase() ?? ""; bVal = b.location?.toLowerCase() ?? ""; }
    else { aVal = ""; bVal = ""; }
    if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  function toggleAdd(id: string) {
    setAddAllowedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function toggleEdit(id: string) {
    setEditAllowedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function openEdit(s: any) {
    setEditSession(s);
    setEditAllowedIds((s.allowedServices ?? []).map((a: any) => a.serviceId));
    editForm.reset({
      name: s.name,
      color: s.color ?? "#3B82F6",
      location: s.location ?? "",
      notes: s.notes ?? "",
    });
  }

  function openCopy(s: any) {
    setAddAllowedIds((s.allowedServices ?? []).map((a: any) => a.serviceId));
    addForm.reset({
      name: s.name + " (Copy)",
      color: s.color ?? "#3B82F6",
      location: s.location ?? "",
      notes: s.notes ?? "",
    });
    setShowAdd(true);
  }

  async function onAdd(data: SessionFormData) {
    setLoading(true);
    try {
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, allowedServiceIds: addAllowedIds }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Class created" });
      addForm.reset();
      setAddAllowedIds([]);
      setShowAdd(false);
      router.refresh();
    } catch {
      toast({ variant: "destructive", title: "Could not create class" });
    } finally {
      setLoading(false);
    }
  }

  async function onEdit(data: SessionFormData) {
    if (!editSession) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/classes/${editSession.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, allowedServiceIds: editAllowedIds }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Class updated" });
      setEditSession(null);
      router.refresh();
    } catch {
      toast({ variant: "destructive", title: "Could not update class" });
    } finally {
      setLoading(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this class?")) return;
    try {
      const res = await fetch(`/api/classes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast({ title: "Class deleted" });
      setEditSession(null);
      router.refresh();
    } catch {
      toast({ variant: "destructive", title: "Could not delete class" });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Classes</h1>
        {isAdmin && (
          <Button onClick={() => { setAddAllowedIds([]); addForm.reset({ color: "#3B82F6" }); setShowAdd(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Class
          </Button>
        )}
      </div>

      {initial.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <GraduationCap className="mx-auto h-10 w-10 mb-3 opacity-30" />
          <p>No classes yet. Add your first one.</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort("name")}>
                  <span className="inline-flex items-center">Class Name<SortIcon col="name" /></span>
                </th>
                <th className="px-4 py-3 text-left font-medium cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort("location")}>
                  <span className="inline-flex items-center">Location<SortIcon col="location" /></span>
                </th>
                <th className="px-4 py-3 text-left font-medium">Allowed Memberships</th>
                <th className="px-4 py-3 text-left font-medium">Notes</th>
                {isAdmin && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {sorted.map((s, i) => {
                const membershipNames = (s.allowedServices ?? []).map((a: any) => a.service?.name).filter(Boolean);
                return (
                  <tr key={s.id} className={`border-b last:border-0 ${i % 2 === 0 ? "" : "bg-muted/20"}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: s.color ?? "#3B82F6" }} />
                        <span className="font-medium">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{s.location ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {membershipNames.length > 0
                          ? membershipNames.map((n: string) => (
                              <Badge key={n} variant="secondary" className="text-[10px] py-0 px-1.5">{n}</Badge>
                            ))
                          : <span className="text-muted-foreground">—</span>
                        }
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground italic">{s.notes ?? "—"}</td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Duplicate" onClick={() => openCopy(s)}>
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit" onClick={() => openEdit(s)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={(o) => !o && setShowAdd(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Class</DialogTitle>
          </DialogHeader>
          <SessionForm
            form={addForm}
            services={services}
            allowedServiceIds={addAllowedIds}
            onToggleService={toggleAdd}
            onSubmit={onAdd}
            onCancel={() => setShowAdd(false)}
            submitLabel="Create Class"
            loading={loading}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editSession} onOpenChange={(o) => !o && setEditSession(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Class</DialogTitle>
          </DialogHeader>
          <SessionForm
            form={editForm}
            services={services}
            allowedServiceIds={editAllowedIds}
            onToggleService={toggleEdit}
            onSubmit={onEdit}
            onCancel={() => setEditSession(null)}
            submitLabel="Save Changes"
            loading={loading}
          />
          <div className="px-6 pb-4 -mt-2">
            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={() => editSession && onDelete(editSession.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Class
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
