"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Dumbbell, Users, Loader2, Pencil, ToggleLeft, ToggleRight, Trash2, ChevronDown, ChevronRight, Save, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, DAY_NAMES, formatTimeSlot } from "@/lib/utils";
import { toast } from "@/lib/use-toast";

const serviceSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().min(1),
  color: z.string(),
  monthlyPrice: z.coerce.number().min(0).optional(),
  dropInPrice: z.coerce.number().min(0).optional(),
});

const packageSchema = z.object({
  name: z.string().min(1, "Required"),
  sessionsType: z.enum(["fixed", "unlimited"]),
  sessions: z.coerce.number().int().positive().optional().or(z.literal("").transform(() => undefined)),
  validDays: z.coerce.number().int().positive("Required"),
  memberPrice: z.preprocess(
    (v) => {
      if (v === "" || v === "-" || v === null || v === undefined) return null;
      const n = Number(v);
      return isNaN(n) ? null : n;
    },
    z.number().min(0).nullable()
  ),
  nonMemberPrice: z.preprocess(
    (v) => {
      if (v === "" || v === "-" || v === null || v === undefined) return null;
      const n = Number(v);
      return isNaN(n) ? null : n;
    },
    z.number().min(0).nullable()
  ),
});

type ServiceFormData = z.infer<typeof serviceSchema>;
type PackageFormData = z.infer<typeof packageSchema>;

function CollapsibleSection({ label, count, children, extra }: { label: string; count?: number; children: React.ReactNode; extra?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t pt-2">
      <button
        type="button"
        className="flex w-full items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="flex items-center gap-1">
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          {label}
          {count !== undefined && <span className="ml-1 font-normal normal-case">({count})</span>}
        </span>
        {extra && <span onClick={(e) => e.stopPropagation()}>{extra}</span>}
      </button>
      {open && <div className="mt-2 space-y-1">{children}</div>}
    </div>
  );
}

function ExpandableDescription({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > 100;
  return (
    <div className="text-sm text-muted-foreground">
      <p className={!expanded && isLong ? "line-clamp-2" : undefined}>{text}</p>
      {isLong && (
        <button type="button" className="text-xs text-primary mt-0.5 hover:underline" onClick={() => setExpanded((e) => !e)}>
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}

export function ServicesClient({ services: initial }: { services: any[] }) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [editService, setEditService] = useState<any | null>(null);
  const [addPackageFor, setAddPackageFor] = useState<any | null>(null);
  const [editingPkg, setEditingPkg] = useState<{ serviceId: string; pkg: any } | null>(null);
  const [loading, setLoading] = useState(false);

  const addForm = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: { color: "#3B82F6", category: "Martial Arts" },
  });

  const editForm = useForm<ServiceFormData>({ resolver: zodResolver(serviceSchema) });

  const pkgForm = useForm<PackageFormData>({
    resolver: zodResolver(packageSchema),
    defaultValues: { sessionsType: "fixed", validDays: 30 },
  });

  function openEdit(service: any) {
    setEditService(service);
    editForm.reset({
      name: service.name,
      description: service.description ?? "",
      category: service.category,
      color: service.color,
      monthlyPrice: service.monthlyPrice ?? undefined,
      dropInPrice: service.dropInPrice ?? undefined,
    });
  }

  async function onAdd(data: ServiceFormData) {
    setLoading(true);
    try {
      const res = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "Service created" });
      addForm.reset();
      setShowAdd(false);
      router.refresh();
    } catch {
      toast({ variant: "destructive", title: "Could not create service" });
    } finally {
      setLoading(false);
    }
  }

  async function onEdit(data: ServiceFormData) {
    if (!editService) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/services/${editService.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "Service updated" });
      setEditService(null);
      router.refresh();
    } catch {
      toast({ variant: "destructive", title: "Could not update service" });
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(service: any) {
    try {
      await fetch(`/api/services/${service.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !service.isActive }),
      });
      toast({ title: service.isActive ? "Service deactivated" : "Service activated" });
      router.refresh();
    } catch {
      toast({ variant: "destructive", title: "Error" });
    }
  }

  async function toggleFreeTrial(service: any) {
    try {
      await fetch(`/api/services/${service.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ freeTrialEnabled: !service.freeTrialEnabled }),
      });
      toast({ title: service.freeTrialEnabled ? "Free trial disabled" : "Free trial enabled" });
      router.refresh();
    } catch {
      toast({ variant: "destructive", title: "Error" });
    }
  }

  async function onAddPackage(data: PackageFormData) {
    if (!addPackageFor) return;
    setLoading(true);
    try {
      const payload = {
        name: data.name,
        sessions: data.sessionsType === "unlimited" ? null : (Number(data.sessions) || null),
        validDays: Number(data.validDays),
        memberPrice: data.memberPrice,
        nonMemberPrice: data.nonMemberPrice,
      };
      const res = await fetch(`/api/services/${addPackageFor.id}/packages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "Package added" });
      pkgForm.reset({ sessionsType: "fixed", validDays: 30 });
      setAddPackageFor(null);
      router.refresh();
    } catch {
      toast({ variant: "destructive", title: "Could not add package" });
    } finally {
      setLoading(false);
    }
  }

  async function deletePackage(serviceId: string, pkgId: string) {
    try {
      await fetch(`/api/services/${serviceId}/packages/${pkgId}`, { method: "DELETE" });
      toast({ title: "Package deleted" });
      setEditingPkg(null);
      router.refresh();
    } catch {
      toast({ variant: "destructive", title: "Error" });
    }
  }

  async function savePackage(data: PackageFormData) {
    if (!editingPkg) return;
    setLoading(true);
    try {
      const payload = {
        name: data.name,
        sessions: data.sessionsType === "unlimited" ? null : (Number(data.sessions) || null),
        validDays: Number(data.validDays),
        memberPrice: data.memberPrice,
        nonMemberPrice: data.nonMemberPrice,
      };
      const res = await fetch(`/api/services/${editingPkg.serviceId}/packages/${editingPkg.pkg.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "Package updated" });
      setEditingPkg(null);
      router.refresh();
    } catch {
      toast({ variant: "destructive", title: "Could not update package" });
    } finally {
      setLoading(false);
    }
  }

  const editPkgForm = useForm<PackageFormData>({ resolver: zodResolver(packageSchema) });

  function openEditPkg(serviceId: string, pkg: any) {
    setEditingPkg({ serviceId, pkg });
    editPkgForm.reset({
      name: pkg.name,
      sessionsType: pkg.sessions === null ? "unlimited" : "fixed",
      sessions: pkg.sessions ?? undefined,
      validDays: pkg.validDays,
      memberPrice: pkg.memberPrice?.toString() ?? "",
      nonMemberPrice: pkg.nonMemberPrice?.toString() ?? "",
    });
  }

  const ServiceForm = ({ form, onSubmit, submitLabel }: { form: any; onSubmit: (d: ServiceFormData) => void; submitLabel: string }) => (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label>Name</Label>
        <Input placeholder="Brazilian Jiu-Jitsu" {...form.register("name")} />
        {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
      </div>
      <div className="space-y-1">
        <Label>Description</Label>
        <Input placeholder="Short description..." {...form.register("description")} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Category</Label>
          <Select defaultValue={form.getValues("category") || "Martial Arts"} onValueChange={(v) => form.setValue("category", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Martial Arts">Martial Arts</SelectItem>
              <SelectItem value="Kids">Kids</SelectItem>
              <SelectItem value="Fitness">Fitness</SelectItem>
              <SelectItem value="Self-Defense">Self-Defense</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Color</Label>
          <div className="flex gap-2 items-center">
            <input type="color" {...form.register("color")} className="h-10 w-14 rounded border cursor-pointer" />
            <span className="text-xs text-muted-foreground">{form.watch("color")}</span>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => { setShowAdd(false); setEditService(null); }}>Cancel</Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );

  const sessionsType = pkgForm.watch("sessionsType");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Memberships</h1>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="mr-2 h-4 w-4" />Add Service
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {initial.map((service) => (
          <Card key={service.id} className="overflow-hidden">
            <div className="h-2" style={{ backgroundColor: service.color }} />
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{service.name}</CardTitle>
                  <Badge variant="secondary" className="mt-1 text-xs">{service.category}</Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(service)} title="Edit">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => toggleFreeTrial(service)}
                    title={service.freeTrialEnabled ? "Disable free trial" : "Enable free trial"}
                  >
                    <FlaskConical className={`h-3.5 w-3.5 ${service.freeTrialEnabled ? "text-blue-500" : "text-muted-foreground"}`} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleActive(service)} title={service.isActive ? "Deactivate" : "Activate"}>
                    {service.isActive
                      ? <ToggleRight className="h-4 w-4 text-green-600" />
                      : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {service.description && (
                <ExpandableDescription text={service.description} />
              )}
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                <span>{service._count.subscriptions} subscribed</span>
              </div>

              {/* Packages — collapsible */}
              <CollapsibleSection
                label="Packages"
                count={service.packages.length}
                extra={
                  <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={(e) => { e.stopPropagation(); setAddPackageFor(service); pkgForm.reset({ sessionsType: "fixed", validDays: 30 }); }}>
                    <Plus className="h-3 w-3 mr-1" />Add
                  </Button>
                }
              >
                {service.packages.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No packages yet.</p>
                ) : (
                  <div className="space-y-0.5">
                    {/* Header */}
                    <div className="flex items-center text-xs font-medium text-muted-foreground px-2 pb-1">
                      <span className="flex-1">Package</span>
                      <span className="w-24 text-right">Member</span>
                      <span className="w-24 text-right">Non-member</span>
                      <span className="w-6" />
                    </div>
                    {service.packages.map((pkg: any) => (
                      <div key={pkg.id} className="flex items-center rounded-md bg-muted/40 px-2 py-1.5 text-xs">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{pkg.name}</p>
                          <p className="text-muted-foreground">
                            {pkg.sessions ? `${pkg.sessions} session${pkg.sessions > 1 ? "s" : ""}` : "Unlimited"} · {pkg.validDays}d
                          </p>
                        </div>
                        <span className="w-24 text-right font-medium text-green-700">
                          {pkg.memberPrice === null ? "—" : pkg.memberPrice === 0 ? "FREE" : formatCurrency(pkg.memberPrice)}
                        </span>
                        <span className="w-24 text-right text-muted-foreground">
                          {pkg.nonMemberPrice === null ? "" : pkg.nonMemberPrice === 0 ? "FREE" : formatCurrency(pkg.nonMemberPrice)}
                        </span>
                        <Button variant="ghost" size="icon" className="w-6 h-6 ml-1 shrink-0 text-muted-foreground hover:text-foreground" onClick={() => openEditPkg(service.id, pkg)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CollapsibleSection>

            </CardContent>
          </Card>
        ))}
        {initial.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <Dumbbell className="mx-auto h-10 w-10 mb-3 opacity-30" />
            <p>No services yet. Add your first one.</p>
          </div>
        )}
      </div>

      {/* Add Service dialog */}
      <Dialog open={showAdd} onOpenChange={(o) => !o && setShowAdd(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add New Service</DialogTitle></DialogHeader>
          <ServiceForm form={addForm} onSubmit={onAdd} submitLabel="Create Service" />
        </DialogContent>
      </Dialog>

      {/* Edit Service dialog */}
      <Dialog open={!!editService} onOpenChange={(o) => !o && setEditService(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Service — {editService?.name}</DialogTitle></DialogHeader>
          <ServiceForm form={editForm} onSubmit={onEdit} submitLabel="Save Changes" />
        </DialogContent>
      </Dialog>

      {/* Edit Package dialog */}
      <Dialog open={!!editingPkg} onOpenChange={(o) => !o && setEditingPkg(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Package</DialogTitle>
          </DialogHeader>
          <form onSubmit={editPkgForm.handleSubmit(savePackage)} className="space-y-4">
            <div className="space-y-1">
              <Label>Package Name</Label>
              <Input placeholder="e.g. 4 Sessions / Monthly Unlimited" {...editPkgForm.register("name")} />
              {editPkgForm.formState.errors.name && <p className="text-xs text-destructive">{editPkgForm.formState.errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Session Type</Label>
                <Select value={editPkgForm.watch("sessionsType")} onValueChange={(v) => editPkgForm.setValue("sessionsType", v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed sessions</SelectItem>
                    <SelectItem value="unlimited">Unlimited</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editPkgForm.watch("sessionsType") === "fixed" && (
                <div className="space-y-1">
                  <Label>No. of Sessions</Label>
                  <Input type="number" min="1" placeholder="4" {...editPkgForm.register("sessions")} />
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label>Valid for (days)</Label>
              <Input type="number" min="1" placeholder="30" {...editPkgForm.register("validDays")} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Member Price (₱)</Label>
                <Input type="text" placeholder="0.00 or leave blank" {...editPkgForm.register("memberPrice")} />
              </div>
              <div className="space-y-1">
                <Label>Non-Member Price (₱)</Label>
                <Input type="text" placeholder="0.00 or leave blank" {...editPkgForm.register("nonMemberPrice")} />
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="destructive"
                className="sm:mr-auto"
                onClick={() => editingPkg && deletePackage(editingPkg.serviceId, editingPkg.pkg.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Package
              </Button>
              <Button type="button" variant="outline" onClick={() => setEditingPkg(null)}>Cancel</Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Package dialog */}
      <Dialog open={!!addPackageFor} onOpenChange={(o) => !o && setAddPackageFor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Package — {addPackageFor?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={pkgForm.handleSubmit(onAddPackage)} className="space-y-4">
            <div className="space-y-1">
              <Label>Package Name</Label>
              <Input placeholder="e.g. 4 Sessions / Monthly Unlimited" {...pkgForm.register("name")} />
              {pkgForm.formState.errors.name && <p className="text-xs text-destructive">{pkgForm.formState.errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Session Type</Label>
                <Select defaultValue="fixed" onValueChange={(v) => pkgForm.setValue("sessionsType", v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed sessions</SelectItem>
                    <SelectItem value="unlimited">Unlimited</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {sessionsType === "fixed" && (
                <div className="space-y-1">
                  <Label>No. of Sessions</Label>
                  <Input type="number" min="1" placeholder="4" {...pkgForm.register("sessions")} />
                  {pkgForm.formState.errors.sessions && <p className="text-xs text-destructive">{pkgForm.formState.errors.sessions.message}</p>}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label>Valid for (days)</Label>
              <Input type="number" min="1" placeholder="30" {...pkgForm.register("validDays")} />
              {pkgForm.formState.errors.validDays && <p className="text-xs text-destructive">{pkgForm.formState.errors.validDays.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Member Price (₱)</Label>
                <Input type="text" placeholder="0.00 or leave blank" {...pkgForm.register("memberPrice")} />
                {pkgForm.formState.errors.memberPrice && <p className="text-xs text-destructive">{pkgForm.formState.errors.memberPrice.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Non-Member Price (₱)</Label>
                <Input type="text" placeholder="0.00 or leave blank" {...pkgForm.register("nonMemberPrice")} />
                {pkgForm.formState.errors.nonMemberPrice && <p className="text-xs text-destructive">{pkgForm.formState.errors.nonMemberPrice.message}</p>}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddPackageFor(null)}>Cancel</Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Package
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
