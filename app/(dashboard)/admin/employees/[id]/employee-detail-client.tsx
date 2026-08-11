"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeft, User, CreditCard, CheckCircle2, Clock, XCircle, Users, Pencil, Plus, X, Loader2 } from "lucide-react";
import Link from "next/link";
import { SortableHeader } from "@/components/ui/sortable-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/use-toast";

const STATUS_STYLES: Record<string, { label: string; icon: any; className: string }> = {
  ACTIVE: { label: "Active", icon: CheckCircle2, className: "bg-green-100 text-green-800 border-green-200" },
  PAUSED: { label: "Paused", icon: Clock, className: "bg-amber-100 text-amber-800 border-amber-200" },
  EXPIRED: { label: "Expired", icon: XCircle, className: "bg-gray-100 text-gray-600 border-gray-200" },
  CANCELLED: { label: "Cancelled", icon: XCircle, className: "bg-red-100 text-red-700 border-red-200" },
};

export function EmployeeDetailClient({ employee, isAdmin }: { employee: any; isAdmin: boolean }) {
  const router = useRouter();
  const [tab, setTab] = useState("info");
  const [historySortDir, setHistorySortDir] = useState<"asc" | "desc">("desc");

  // Guardian linking
  const [showGuardianDialog, setShowGuardianDialog] = useState(false);
  const [guardianSearch, setGuardianSearch] = useState("");
  const [guardianResults, setGuardianResults] = useState<any[]>([]);
  const [guardianSearching, setGuardianSearching] = useState(false);
  const [guardianMode, setGuardianMode] = useState<"search" | "create">("search");
  const [newGuardianName, setNewGuardianName] = useState("");
  const [newGuardianEmail, setNewGuardianEmail] = useState("");
  const [savingGuardian, setSavingGuardian] = useState(false);
  const [currentGuardian, setCurrentGuardian] = useState<{ id: string; name: string | null; email: string } | null>(
    employee.guardian ?? null
  );

  async function searchGuardians(q: string) {
    setGuardianSearch(q);
    if (!q.trim()) { setGuardianResults([]); return; }
    setGuardianSearching(true);
    try {
      const res = await fetch(`/api/guardian?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setGuardianResults(data);
    } finally {
      setGuardianSearching(false);
    }
  }

  async function linkGuardian(userId: string) {
    setSavingGuardian(true);
    try {
      const res = await fetch(`/api/employees/${employee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guardianUserId: userId }),
      });
      if (!res.ok) throw new Error("Failed to link guardian");
      const found = guardianResults.find((u) => u.id === userId);
      if (found) setCurrentGuardian({ id: found.id, name: found.name, email: found.email });
      setShowGuardianDialog(false);
      toast({ title: "Guardian linked successfully" });
    } catch {
      toast({ title: "Failed to link guardian", variant: "destructive" });
    } finally {
      setSavingGuardian(false);
    }
  }

  async function createAndLinkGuardian() {
    if (!newGuardianName.trim() || !newGuardianEmail.trim()) return;
    setSavingGuardian(true);
    try {
      const res = await fetch("/api/guardian", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newGuardianName, email: newGuardianEmail }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to create guardian");
      }
      const { user, tempPassword } = await res.json();
      await linkGuardian(user.id);
      toast({ title: `Guardian account created`, description: `Temp password: ${tempPassword}` });
      setNewGuardianName("");
      setNewGuardianEmail("");
      setGuardianMode("search");
    } catch (e: any) {
      toast({ title: e.message ?? "Failed to create guardian", variant: "destructive" });
    } finally {
      setSavingGuardian(false);
    }
  }

  async function removeGuardian() {
    setSavingGuardian(true);
    try {
      const res = await fetch(`/api/employees/${employee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guardianUserId: null }),
      });
      if (!res.ok) throw new Error("Failed to remove guardian");
      setCurrentGuardian(null);
      toast({ title: "Guardian removed" });
    } catch {
      toast({ title: "Failed to remove guardian", variant: "destructive" });
    } finally {
      setSavingGuardian(false);
    }
  }

  const activeSubscriptions = employee.subscriptions.filter((s: any) => s.status === "ACTIVE");
  const pastSubscriptions = employee.subscriptions.filter((s: any) => s.status !== "ACTIVE");
  const fullName = `${employee.firstName} ${employee.lastName}`;
  const types: string[] = employee.employeeTypes?.length ? employee.employeeTypes : [employee.employeeType ?? "STAFF"];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/employees"><ArrowLeft className="h-4 w-4 mr-1" />Employees</Link>
        </Button>
      </div>

      <div className="flex items-center gap-4">
        {employee.photoUrl ? (
          <img src={employee.photoUrl} alt={fullName} className="h-16 w-16 rounded-full object-cover border" />
        ) : (
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-xl font-semibold text-muted-foreground">
            {employee.firstName[0]}{employee.lastName[0]}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold">{fullName}</h1>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {types.map((t: string) => (
              <Badge key={t} variant="secondary" className="capitalize text-xs">{t.toLowerCase()}</Badge>
            ))}
            {employee.title && <span className="text-sm text-muted-foreground">· {employee.title}</span>}
          </div>
        </div>
      </div>

      {/* Guardian Account Card */}
      {isAdmin && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />Guardian Account
            </CardTitle>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowGuardianDialog(true)}>
              {currentGuardian ? <><Pencil className="h-3 w-3 mr-1" />Change</> : <><Plus className="h-3 w-3 mr-1" />Link Guardian</>}
            </Button>
          </CardHeader>
          <CardContent>
            {currentGuardian ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{currentGuardian.name ?? "—"}</p>
                  <p className="text-sm text-muted-foreground">{currentGuardian.email}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">This staff member&apos;s QR appears on the guardian&apos;s phone.</p>
                </div>
                <Button size="sm" variant="ghost" className="text-destructive h-7" onClick={removeGuardian} disabled={savingGuardian}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No guardian linked. Link one so a parent can access this staff member&apos;s QR code from their phone.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Guardian Dialog */}
      <Dialog open={showGuardianDialog} onOpenChange={setShowGuardianDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link Guardian Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button size="sm" variant={guardianMode === "search" ? "default" : "outline"} onClick={() => setGuardianMode("search")}>Find Existing</Button>
              <Button size="sm" variant={guardianMode === "create" ? "default" : "outline"} onClick={() => setGuardianMode("create")}>Create New</Button>
            </div>
            {guardianMode === "search" ? (
              <div className="space-y-2">
                <Label>Search by name or email</Label>
                <Input
                  placeholder="e.g. parent@email.com"
                  value={guardianSearch}
                  onChange={(e) => searchGuardians(e.target.value)}
                />
                {guardianSearching && <p className="text-xs text-muted-foreground">Searching…</p>}
                {guardianResults.length > 0 && (
                  <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
                    {guardianResults.map((u) => (
                      <button key={u.id} className="w-full text-left px-3 py-2 hover:bg-muted text-sm" onClick={() => linkGuardian(u.id)} disabled={savingGuardian}>
                        <p className="font-medium">{u.name ?? u.email}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </button>
                    ))}
                  </div>
                )}
                {!guardianSearching && guardianSearch && guardianResults.length === 0 && (
                  <p className="text-xs text-muted-foreground">No users found. Try creating a new guardian account.</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label>Parent / Guardian Name</Label>
                  <Input placeholder="Maria Santos" value={newGuardianName} onChange={(e) => setNewGuardianName(e.target.value)} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" placeholder="parent@email.com" value={newGuardianEmail} onChange={(e) => setNewGuardianEmail(e.target.value)} />
                </div>
                <p className="text-xs text-muted-foreground">A login will be created. The temp password will be shown after saving.</p>
                <Button className="w-full" onClick={createAndLinkGuardian} disabled={savingGuardian || !newGuardianName || !newGuardianEmail}>
                  {savingGuardian ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create & Link Guardian"}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="info" className="gap-2"><User className="h-4 w-4" />Info</TabsTrigger>
          <TabsTrigger value="memberships" className="gap-2">
            <CreditCard className="h-4 w-4" />Memberships
            {activeSubscriptions.length > 0 && (
              <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1">
                {activeSubscriptions.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* INFO TAB */}
        <TabsContent value="info" className="mt-4">
          <div className="rounded-lg border divide-y">
            {[
              { label: "Email", value: employee.user?.email ?? "—" },
              { label: "Phone", value: employee.phone ?? "—" },
              { label: "Employee #", value: employee.employeeNumber ?? "—" },
              { label: "Hire Date", value: employee.hireDate ? new Date(employee.hireDate).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" }) : "—" },
              { label: "Date of Birth", value: employee.dateOfBirth ? new Date(employee.dateOfBirth).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" }) : "—" },
              { label: "Belt", value: employee.belt ?? "—" },
              { label: "Status", value: employee.isActive ? "Active" : "Inactive" },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-start px-4 py-3 gap-4">
                <span className="text-sm font-medium text-muted-foreground w-32 shrink-0">{label}</span>
                <span className="text-sm">{value}</span>
              </div>
            ))}
            {employee.taughtServices?.length > 0 && (
              <div className="flex items-start px-4 py-3 gap-4">
                <span className="text-sm font-medium text-muted-foreground w-32 shrink-0">Classes Taught</span>
                <div className="flex flex-wrap gap-1.5">
                  {employee.taughtServices.map((ts: any) => (
                    <span key={ts.serviceId} className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: ts.service?.color ?? "#6b7280" }}>
                      {ts.service?.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* MEMBERSHIPS TAB */}
        <TabsContent value="memberships" className="mt-4 space-y-6">
          {employee.subscriptions.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
              No membership packages assigned yet.
            </div>
          ) : (
            <>
              {activeSubscriptions.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm mb-2">Active</h3>
                  <div className="rounded-md border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left px-4 py-2 font-medium">Service</th>
                          <th className="text-left px-4 py-2 font-medium">Status</th>
                          <th className="text-right px-4 py-2 font-medium">Sessions</th>
                          <th className="text-left px-4 py-2 font-medium">Expires</th>
                          <th className="text-right px-4 py-2 font-medium">Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {activeSubscriptions.map((sub: any) => {
                          const st = STATUS_STYLES[sub.status] ?? STATUS_STYLES.ACTIVE;
                          return (
                            <tr key={sub.id} className="hover:bg-muted/30">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: sub.service?.color ?? "#6b7280" }} />
                                  <span className="font-medium">{sub.service?.name}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${st.className}`}>
                                  <st.icon className="h-3 w-3" />{st.label}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                {sub.sessionsTotal == null
                                  ? "Unlimited"
                                  : `${sub.sessionsUsed} / ${sub.sessionsTotal}`}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {sub.endDate ? new Date(sub.endDate).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) : "No expiry"}
                              </td>
                              <td className="px-4 py-3 text-right font-medium">{formatCurrency(sub.price)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {pastSubscriptions.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm mb-2 text-muted-foreground">History</h3>
                  <div className="rounded-md border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left px-4 py-2 font-medium">Service</th>
                          <th className="text-left px-4 py-2 font-medium">Status</th>
                          <th className="text-right px-4 py-2 font-medium">Sessions</th>
                          <th className="text-left px-4 py-2 font-medium">
                            <SortableHeader label="Period" direction={historySortDir} onClick={() => setHistorySortDir((d) => (d === "asc" ? "desc" : "asc"))} />
                          </th>
                          <th className="text-right px-4 py-2 font-medium">Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {[...pastSubscriptions].sort((a: any, b: any) => {
                          const diff = new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
                          return historySortDir === "asc" ? diff : -diff;
                        }).map((sub: any) => {
                          const st = STATUS_STYLES[sub.status] ?? STATUS_STYLES.EXPIRED;
                          return (
                            <tr key={sub.id} className="hover:bg-muted/30 opacity-70">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span className="h-2.5 w-2.5 rounded-full shrink-0 bg-gray-400" />
                                  <span className="font-medium">{sub.service?.name}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${st.className}`}>
                                  <st.icon className="h-3 w-3" />{st.label}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                {sub.sessionsTotal == null ? "Unlimited" : `${sub.sessionsUsed} / ${sub.sessionsTotal}`}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground text-xs">
                                {new Date(sub.startDate).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                                {sub.endDate && ` — ${new Date(sub.endDate).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}`}
                              </td>
                              <td className="px-4 py-3 text-right font-medium">{formatCurrency(sub.price)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
