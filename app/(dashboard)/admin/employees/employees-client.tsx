"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Loader2, Mail, Phone, Calendar, Pencil, Send, ChevronDown, Check, Award, BookOpen, Cake, Plus, Trash2, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate, getInitials } from "@/lib/utils";
import { PhotoCropDialog } from "@/components/photo-crop-dialog";
import { toast } from "@/lib/use-toast";
import { useTenantTimezone } from "@/components/tenant-timezone-provider";
import { SortableHeader } from "@/components/ui/sortable-header";

const TYPE_LABELS: Record<string, string> = { ADMIN: "Admin", STAFF: "Staff", COACH: "Coach" };
const TYPE_COLORS: Record<string, string> = {
  ADMIN: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  STAFF: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  COACH: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
};
const ALL_TYPES = ["STAFF", "COACH", "ADMIN"] as const;

type Credential = { sport: string; belt: string; awarded: string };

function parseCredentials(raw: string | null | undefined): Credential[] {
  if (!raw) return [];
  try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; }
  catch { return []; }
}

// Multi-checkbox dropdown for employee types
function TypeCheckDropdown({ selected, onChange }: {
  selected: string[]; onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  function toggle(t: string) {
    onChange(selected.includes(t) ? selected.filter((x) => x !== t) : [...selected, t]);
  }
  const label = selected.length === 0 ? "Select type…" : selected.map((t) => TYPE_LABELS[t]).join(", ");
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm">
        <span className={selected.length === 0 ? "text-muted-foreground" : ""}>{label}</span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-white dark:bg-zinc-900 shadow-md py-1">
          {ALL_TYPES.map((t) => (
            <button key={t} type="button" onClick={() => toggle(t)}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent">
              <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${selected.includes(t) ? "bg-primary border-primary" : "border-border"}`}>
                {selected.includes(t) && <Check className="h-3 w-3 text-primary-foreground" />}
              </div>
              <span>{TYPE_LABELS[t]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Multi-checkbox dropdown for services
function ServiceCheckDropdown({ services, selected, onChange }: {
  services: any[]; selected: string[]; onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  }
  const selectedNames = services.filter((s) => selected.includes(s.id)).map((s) => s.name);
  const label = selected.length === 0 ? "Select classes…" : selected.length === 1 ? selectedNames[0] : `${selected.length} selected`;
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm">
        <span className={selected.length === 0 ? "text-muted-foreground" : "truncate"}>{label}</span>
        <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-white dark:bg-zinc-900 shadow-md py-1 max-h-52 overflow-y-auto">
          {services.map((s) => (
            <button key={s.id} type="button" onClick={() => toggle(s.id)}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent">
              <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${selected.includes(s.id) ? "bg-primary border-primary" : "border-border"}`}>
                {selected.includes(s.id) && <Check className="h-3 w-3 text-primary-foreground" />}
              </div>
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
              <span className="truncate">{s.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function toDateInput(val: string | Date | null | undefined, timeZone: string = "Asia/Manila"): string {
  if (!val) return "";
  const d = typeof val === "string" ? new Date(val) : val;
  return d.toLocaleDateString("en-CA", { timeZone });
}

function fmtBirthday(val: string | Date | null | undefined, timeZone: string = "Asia/Manila"): string {
  if (!val) return "";
  const d = typeof val === "string" ? new Date(val) : val;
  return d.toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric", timeZone });
}

function calcAge(val: string | Date | null | undefined): number | null {
  if (!val) return null;
  const d = typeof val === "string" ? new Date(val) : val;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

// ── Coach credentials form (module-level to avoid remount on every keystroke) ──
function CoachFields({ form, setForm, services }: {
  form: any; setForm: (fn: (f: any) => any) => void; services: any[];
}) {
  function addRow() {
    setForm((f: any) => ({ ...f, credentials: [...f.credentials, { sport: "", belt: "", awarded: "" }] }));
  }
  function removeRow(i: number) {
    setForm((f: any) => ({ ...f, credentials: f.credentials.filter((_: any, idx: number) => idx !== i) }));
  }
  function updateRow(i: number, field: keyof Credential, value: string) {
    setForm((f: any) => {
      const next = [...f.credentials];
      next[i] = { ...next[i], [field]: value };
      return { ...f, credentials: next };
    });
  }
  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/20 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Coach Credentials</p>
        <button type="button" onClick={addRow}
          className="flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400 hover:underline">
          <Plus className="h-3.5 w-3.5" />Add
        </button>
      </div>

      {form.credentials.length === 0 && (
        <p className="text-xs text-muted-foreground italic">No credentials yet. Click Add to enter a discipline.</p>
      )}

      {form.credentials.map((cred: Credential, i: number) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
          <div className="space-y-1">
            {i === 0 && <Label className="text-xs">Sport / Discipline</Label>}
            <Input
              placeholder="e.g. Judo"
              value={cred.sport}
              onChange={(e) => updateRow(i, "sport", e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1">
            {i === 0 && <Label className="text-xs">Belt / Level</Label>}
            <Input
              placeholder="e.g. Black Belt"
              value={cred.belt}
              onChange={(e) => updateRow(i, "belt", e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1">
            {i === 0 && <Label className="text-xs">Awarded</Label>}
            <Input
              placeholder="e.g. 2018"
              value={cred.awarded}
              onChange={(e) => updateRow(i, "awarded", e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div className={i === 0 ? "pt-5" : ""}>
            <button type="button" onClick={() => removeRow(i)}
              className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}

      <div className="space-y-1 pt-1 border-t border-emerald-200 dark:border-emerald-800">
        <Label className="text-xs">Classes Taught</Label>
        <ServiceCheckDropdown
          services={services}
          selected={form.taughtServiceIds}
          onChange={(v) => setForm((f: any) => ({ ...f, taughtServiceIds: v }))}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export function EmployeesClient({ employees, services }: { employees: any[]; services: any[] }) {
  const router = useRouter();
  const timeZone = useTenantTimezone();
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingEmp, setEditingEmp] = useState<any | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // ── Add form state ───────────────────────────────────────────────────────────
  const [addForm, setAddForm] = useState({
    firstName: "", lastName: "", email: "", phone: "", title: "",
    employeeTypes: ["STAFF"] as string[],
    hireDate: toDateInput(new Date(), timeZone), dateOfBirth: "",
    credentials: [] as Credential[], taughtServiceIds: [] as string[],
  });

  // ── Edit form state ──────────────────────────────────────────────────────────
  const [editForm, setEditForm] = useState({
    firstName: "", lastName: "", email: "", phone: "", title: "",
    employeeTypes: ["STAFF"] as string[], isActive: true,
    hireDate: "", dateOfBirth: "",
    credentials: [] as Credential[], taughtServiceIds: [] as string[],
  });

  function openEdit(emp: any) {
    setEditingEmp(emp);
    setPhotoPreview(null);
    setPhotoFile(null);
    setCropSrc(null);
    const types: string[] = emp.employeeTypes?.length ? emp.employeeTypes : [emp.employeeType ?? "STAFF"];
    setEditForm({
      firstName: emp.firstName,
      lastName: emp.lastName,
      email: emp.user?.email ?? "",
      phone: emp.phone ?? "",
      title: emp.title ?? "",
      employeeTypes: types,
      isActive: emp.isActive,
      hireDate: toDateInput(emp.hireDate, timeZone),
      dateOfBirth: toDateInput(emp.dateOfBirth, timeZone),
      credentials: parseCredentials(emp.certifications),
      taughtServiceIds: emp.taughtServices?.map((ts: any) => ts.serviceId) ?? [],
    });
  }

  async function submitAdd() {
    if (!addForm.firstName || !addForm.lastName || !addForm.email || addForm.employeeTypes.length === 0) {
      toast({ variant: "destructive", title: "Please fill in all required fields" });
      return;
    }
    setLoading(true);
    try {
      const role = addForm.employeeTypes.includes("ADMIN") ? "ADMIN" : "STAFF";
      const { credentials, ...rest } = addForm;
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...rest, employeeType: addForm.employeeTypes[0], role, belt: null, certifications: JSON.stringify(credentials) }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Failed"); }
      toast({ title: "Employee added", description: "Activation email sent." });
      setAddForm({ firstName: "", lastName: "", email: "", phone: "", title: "", employeeTypes: ["STAFF"], hireDate: toDateInput(new Date(), timeZone), dateOfBirth: "", credentials: [], taughtServiceIds: [] });
      setShowAdd(false);
      router.refresh();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally { setLoading(false); }
  }

  async function submitEdit() {
    if (!editingEmp) return;
    if (editForm.employeeTypes.length === 0) {
      toast({ variant: "destructive", title: "Select at least one employee type" });
      return;
    }
    setLoading(true);
    try {
      // Upload photo first if one was selected
      if (photoFile && editingEmp) {
        setPhotoUploading(true);
        const fd = new FormData();
        fd.append("file", photoFile);
        fd.append("employeeId", editingEmp.id);
        const upRes = await fetch("/api/upload/employee", { method: "POST", body: fd });
        setPhotoUploading(false);
        if (!upRes.ok) throw new Error("Photo upload failed");
      }

      const role = editForm.employeeTypes.includes("ADMIN") ? "ADMIN" : "STAFF";
      const { credentials, ...editRest } = editForm;
      const res = await fetch(`/api/employees/${editingEmp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editRest, role, belt: null, certifications: JSON.stringify(credentials) }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Failed"); }
      toast({ title: "Employee updated" });
      setEditingEmp(null);
      setPhotoPreview(null);
      setPhotoFile(null);
      setCropSrc(null);
      router.refresh();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally { setLoading(false); }
  }

  async function resendActivation(emp: any) {
    setResendingId(emp.id);
    try {
      const res = await fetch(`/api/employees/${emp.id}/resend-activation`, { method: "POST" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Failed"); }
      toast({ title: "Activation email sent", description: `Sent to ${emp.user?.email}` });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally { setResendingId(null); }
  }

  const isCoach = (types: string[]) => types.includes("COACH");

  const [nameSortDir, setNameSortDir] = useState<"asc" | "desc">("asc");
  const sortedEmployees = [...employees].sort((a, b) => {
    const aName = `${a.lastName} ${a.firstName}`.toLowerCase();
    const bName = `${b.lastName} ${b.firstName}`.toLowerCase();
    return nameSortDir === "asc" ? aName.localeCompare(bName) : bName.localeCompare(aName);
  });

  // ── Cards ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Employees</h1>
          <p className="text-muted-foreground">{employees.length} team members</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <UserPlus className="mr-2 h-4 w-4" />Add Employee
        </Button>
      </div>

      <SortableHeader
        label="Sort by Name"
        direction={nameSortDir}
        onClick={() => setNameSortDir((d) => (d === "asc" ? "desc" : "asc"))}
        className="text-sm text-muted-foreground"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sortedEmployees.map((emp) => {
          const types: string[] = emp.employeeTypes?.length ? emp.employeeTypes : [emp.employeeType ?? "STAFF"];
          const age = calcAge(emp.dateOfBirth);
          return (
            <Card key={emp.id}>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={emp.photoUrl ?? ""} />
                    <AvatarFallback>{getInitials(`${emp.firstName} ${emp.lastName}`)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{emp.firstName} {emp.lastName}</p>
                      <Badge variant={emp.isActive ? "success" : "secondary"} className="text-xs">
                        {emp.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    {emp.employeeNumber && (
                      <p className="text-xs text-muted-foreground font-mono">{emp.employeeNumber}</p>
                    )}
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {types.map((t) => (
                        <span key={t} className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[t] ?? TYPE_COLORS.STAFF}`}>
                          {TYPE_LABELS[t] ?? t}
                        </span>
                      ))}
                      {emp.title && <p className="text-xs text-muted-foreground">{emp.title}</p>}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 text-sm">
                  {emp.user?.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-3.5 w-3.5 shrink-0" />{emp.user.email}
                    </div>
                  )}
                  {emp.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5 shrink-0" />{emp.phone}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />Hired {formatDate(emp.hireDate)}
                  </div>
                  {emp.dateOfBirth && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Cake className="h-3.5 w-3.5 shrink-0" />
                      {fmtBirthday(emp.dateOfBirth, timeZone)}{age !== null && ` (${age} yrs)`}
                    </div>
                  )}
                </div>

                {/* Coach credentials */}
                {types.includes("COACH") && (() => {
                  const creds = parseCredentials(emp.certifications);
                  if (creds.length === 0) return null;
                  return (
                    <div className="rounded-md bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 p-2.5 space-y-1.5 text-xs">
                      {creds.map((c, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                          <Award className="h-3.5 w-3.5 shrink-0" />
                          <span className="font-medium">{c.sport}</span>
                          {c.belt && <span className="text-emerald-600 dark:text-emerald-400">— {c.belt}</span>}
                          {c.awarded && <span className="text-emerald-500 dark:text-emerald-500 ml-auto">{c.awarded}</span>}
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {emp.taughtServices?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Teaches</p>
                    <div className="flex flex-wrap gap-1">
                      {emp.taughtServices.map((ts: any) => (
                        <span key={ts.serviceId} className="text-xs rounded-full px-2 py-0.5 text-white"
                          style={{ backgroundColor: ts.service.color }}>
                          {ts.service.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" asChild>
                    <a href={`/admin/employees/${emp.id}`}>View</a>
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(emp)}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />Edit
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1"
                    onClick={() => resendActivation(emp)} disabled={resendingId === emp.id}>
                    {resendingId === emp.id
                      ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      : <Send className="mr-1.5 h-3.5 w-3.5" />}
                    Resend Activation
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {employees.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">No employees yet.</div>
        )}
      </div>

      {/* ── Add Employee Dialog ────────────────────────────────────────────────── */}
      <Dialog open={showAdd} onOpenChange={(o) => !o && setShowAdd(false)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Employee</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>First Name <span className="text-destructive">*</span></Label>
                <Input value={addForm.firstName} onChange={(e) => setAddForm((f) => ({ ...f, firstName: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Last Name <span className="text-destructive">*</span></Label>
                <Input value={addForm.lastName} onChange={(e) => setAddForm((f) => ({ ...f, lastName: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Email <span className="text-destructive">*</span></Label>
              <Input type="email" value={addForm.email} onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input value={addForm.phone} onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Title</Label>
                <Input placeholder="Head Coach" value={addForm.title} onChange={(e) => setAddForm((f) => ({ ...f, title: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Date Hired</Label>
                <Input type="date" value={addForm.hireDate} onChange={(e) => setAddForm((f) => ({ ...f, hireDate: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Date of Birth</Label>
                <Input type="date" value={addForm.dateOfBirth} onChange={(e) => setAddForm((f) => ({ ...f, dateOfBirth: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Employee Type <span className="text-destructive">*</span></Label>
              <TypeCheckDropdown selected={addForm.employeeTypes} onChange={(v) => setAddForm((f) => ({ ...f, employeeTypes: v }))} />
            </div>
            {isCoach(addForm.employeeTypes) && (
              <CoachFields form={addForm} setForm={(fn) => setAddForm(fn as any)} services={services} />
            )}
            <p className="text-xs text-muted-foreground">An activation email will be sent so the employee can set their own password. Their Employee ID will be assigned once they activate.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={submitAdd} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Add Employee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Employee Dialog ───────────────────────────────────────────────── */}
      <Dialog open={!!editingEmp} onOpenChange={(o) => { if (!o) { setEditingEmp(null); setPhotoPreview(null); setPhotoFile(null); setCropSrc(null); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            {editingEmp?.employeeNumber && (
              <p className="text-sm text-muted-foreground font-mono">{editingEmp.employeeNumber}</p>
            )}
          </DialogHeader>
          <div className="space-y-4">
            {/* Photo upload */}
            <div className="flex flex-col items-center gap-2">
              <div className="relative group cursor-pointer" onClick={() => photoInputRef.current?.click()}>
                <Avatar className="h-20 w-20">
                  <AvatarImage src={photoPreview ?? editingEmp?.photoUrl ?? ""} />
                  <AvatarFallback className="text-lg">
                    {editingEmp ? getInitials(`${editingEmp.firstName} ${editingEmp.lastName}`) : ""}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="h-6 w-6 text-white" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Click photo to change</p>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setCropSrc(URL.createObjectURL(f));
                  // reset so the same file can be re-selected
                  e.target.value = "";
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>First Name</Label>
                <Input value={editForm.firstName} onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Last Name</Label>
                <Input value={editForm.lastName} onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Title</Label>
                <Input placeholder="Head Coach" value={editForm.title} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Date Hired</Label>
                <Input type="date" value={editForm.hireDate} onChange={(e) => setEditForm((f) => ({ ...f, hireDate: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Date of Birth</Label>
                <Input type="date" value={editForm.dateOfBirth} onChange={(e) => setEditForm((f) => ({ ...f, dateOfBirth: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Employee Type</Label>
                <TypeCheckDropdown selected={editForm.employeeTypes} onChange={(v) => setEditForm((f) => ({ ...f, employeeTypes: v }))} />
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={editForm.isActive ? "active" : "inactive"} onValueChange={(v) => setEditForm((f) => ({ ...f, isActive: v === "active" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {isCoach(editForm.employeeTypes) && (
              <CoachFields form={editForm} setForm={(fn) => setEditForm(fn as any)} services={services} />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingEmp(null)}>Cancel</Button>
            <Button onClick={submitEdit} disabled={loading}>
              {(loading || photoUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {photoUploading ? "Uploading photo…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Photo crop dialog ─────────────────────────────────────────────────── */}
      {cropSrc && (
        <PhotoCropDialog
          open={!!cropSrc}
          src={cropSrc}
          onConfirm={(blob) => {
            setPhotoFile(new File([blob], "photo.jpg", { type: "image/jpeg" }));
            setPhotoPreview(URL.createObjectURL(blob));
            setCropSrc(null);
          }}
          onCancel={() => setCropSrc(null)}
        />
      )}
    </div>
  );
}
