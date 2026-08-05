"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, UserPlus, Filter, Trash2, CheckCircle2, Clock, ChevronUp, ChevronDown, ChevronsUpDown, Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, timeAgo, getInitials } from "@/lib/utils";
import { toast } from "@/lib/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AddMemberDialog } from "./add-member-dialog";

const STATUS_COLORS: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  ACTIVE: "success",
  FROZEN: "warning",
  INACTIVE: "secondary",
  CANCELLED: "destructive",
};

export function MembersClient({
  members,
  isAdmin,
  isStaff,
  bouncedEmails = [],
  page,
  total,
  pageSize,
  freeTrialCount = 0,
}: {
  members: any[];
  isAdmin: boolean;
  isStaff?: boolean;
  bouncedEmails?: string[];
  page: number;
  total: number;
  pageSize: number;
  freeTrialCount?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const bouncedSet = new Set(bouncedEmails.map((e) => e.toLowerCase()));
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") ?? "ALL");

  const pushParams = useCallback((updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v && v !== "ALL") params.set(k, v); else params.delete(k);
    });
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }, [pathname, router, searchParams]);

  useEffect(() => {
    const timer = setTimeout(() => pushParams({ search }), 300);
    return () => clearTimeout(timer);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleStatusChange(val: string) {
    setStatusFilter(val);
    pushParams({ status: val, search });
  }
  const [showAdd, setShowAdd] = useState(false);
  const [membersList, setMembersList] = useState(members);
  useEffect(() => { setMembersList(members); }, [members]);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [deleteReason, setDeleteReason] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [sortCol, setSortCol] = useState<string>("lastName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [confirmResend, setConfirmResend] = useState<{ id: string; email: string; name: string } | null>(null);

  async function resendActivation(memberId: string, email: string) {
    setResendingId(memberId);
    setConfirmResend(null);
    try {
      const res = await fetch(`/api/members/${memberId}/resend-activation`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast({ title: "Activation email sent", description: `An account setup link was sent to ${email}.` });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Email failed", description: err.message });
    } finally {
      setResendingId(null);
    }
  }

  function toggleSort(col: string) {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  }

  function SortIcon({ col }: { col: string }) {
    if (sortCol !== col) return <ChevronsUpDown className="h-3.5 w-3.5 ml-1 text-muted-foreground/50" />;
    return sortDir === "asc"
      ? <ChevronUp className="h-3.5 w-3.5 ml-1" />
      : <ChevronDown className="h-3.5 w-3.5 ml-1" />;
  }

  async function handleDelete() {
    if (!deleteReason.trim()) { setDeleteError("Please provide a reason."); return; }
    if (!adminPassword.trim()) { setDeleteError("Please enter your admin password."); return; }
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/members/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: deleteReason, adminPassword }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setDeleteError(data.error ?? "Failed to delete. Check your password.");
        setDeleting(false);
        return;
      }
      setMembersList((prev) => prev.filter((m) => m.id !== deleteTarget.id));
      setDeleteTarget(null);
      setDeleteReason("");
      setAdminPassword("");
    } catch {
      setDeleteError("An error occurred.");
    }
    setDeleting(false);
  }

  const filtered = membersList.sort((a, b) => {
    let aVal: any, bVal: any;
    if (sortCol === "lastName") { aVal = `${a.lastName} ${a.firstName}`.toLowerCase(); bVal = `${b.lastName} ${b.firstName}`.toLowerCase(); }
    else if (sortCol === "status") { aVal = a.status; bVal = b.status; }
    else if (sortCol === "joinDate") { aVal = new Date(a.joinDate).getTime(); bVal = new Date(b.joinDate).getTime(); }
    else if (sortCol === "activatedAt") { aVal = a.activatedAt ? new Date(a.activatedAt).getTime() : 0; bVal = b.activatedAt ? new Date(b.activatedAt).getTime() : 0; }
    else if (sortCol === "lastCheckIn") { aVal = a.checkIns[0] ? new Date(a.checkIns[0].checkedInAt).getTime() : 0; bVal = b.checkIns[0] ? new Date(b.checkIns[0].checkedInAt).getTime() : 0; }
    else { aVal = ""; bVal = ""; }
    if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Athletes</h1>
          <p className="text-muted-foreground">{total} total athletes</p>
        </div>
        <div className="flex gap-2">
{isAdmin && (
            <Button onClick={() => setShowAdd(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Athlete
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-48">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Athletes</SelectItem>
            <SelectItem value="FREE_TRIAL">🎯 Free Trial Leads</SelectItem>
            <SelectItem value="ACTIVATED">App Activated</SelectItem>
            <SelectItem value="NOT_ACTIVATED">Not Activated</SelectItem>
            <SelectItem value="ACTIVE">Status: Active</SelectItem>
            <SelectItem value="FROZEN">Status: Frozen</SelectItem>
            <SelectItem value="INACTIVE">Status: Inactive</SelectItem>
            <SelectItem value="CANCELLED">Status: Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Members table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort("lastName")}>
                    <span className="inline-flex items-center">Athlete<SortIcon col="lastName" /></span>
                  </th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort("status")}>
                    <span className="inline-flex items-center">Status<SortIcon col="status" /></span>
                  </th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Subscriptions</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Email</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort("joinDate")}>
                    <span className="inline-flex items-center">Joined<SortIcon col="joinDate" /></span>
                  </th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort("activatedAt")}>
                    <span className="inline-flex items-center">App Activated<SortIcon col="activatedAt" /></span>
                  </th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort("lastCheckIn")}>
                    <span className="inline-flex items-center">Last Check-in<SortIcon col="lastCheckIn" /></span>
                  </th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((member) => (
                  <tr key={member.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={member.photoUrl ?? ""} />
                          <AvatarFallback className="text-xs">
                            {getInitials(`${member.firstName} ${member.lastName}`)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <Link href={`/admin/members/${member.id}`} className="font-medium text-foreground hover:underline">
                              {member.firstName} {member.lastName}
                            </Link>
                            {member.activatedAt && member.memberNumber && (
                              <span className="text-xs font-mono px-1.5 py-0.5 rounded border bg-muted text-muted-foreground">
                                {member.memberNumber}
                              </span>
                            )}
                          </div>
                          {member.user?.email && !member.user.email.endsWith("@northsouth.local") && (
                            <p className="text-xs text-muted-foreground">{member.user.email}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <Badge variant={STATUS_COLORS[member.status] ?? "secondary"}>
                        {member.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex flex-wrap gap-x-2 gap-y-1.5">
                        {member.subscriptions.length === 0 ? (
                          <span className="text-muted-foreground">None</span>
                        ) : (
                          member.subscriptions.map((sub: any) => {
                            const isSessionBased = sub.sessionsTotal !== null;
                            const sessionsLeft = isSessionBased ? sub.sessionsTotal - sub.sessionsUsed : null;
                            const daysLeft = !isSessionBased && sub.endDate
                              ? Math.max(0, Math.ceil((new Date(sub.endDate).getTime() - Date.now()) / 86400000))
                              : null;
                            return (
                              <div key={sub.id} className="flex flex-col items-center">
                                <span
                                  className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white"
                                  style={{ backgroundColor: sub.service.color }}
                                >
                                  {sub.service.name}
                                </span>
                                {isSessionBased && sessionsLeft !== null && (
                                  <span className={`text-[10px] mt-0.5 ${sessionsLeft === 0 ? "text-destructive" : sessionsLeft <= 2 ? "text-yellow-600" : "text-muted-foreground"}`}>
                                    {sessionsLeft} session{sessionsLeft !== 1 ? "s" : ""} left
                                  </span>
                                )}
                                {daysLeft !== null && (
                                  <span className={`text-[10px] mt-0.5 ${daysLeft === 0 ? "text-destructive" : daysLeft <= 7 ? "text-yellow-600" : "text-muted-foreground"}`}>
                                    {daysLeft === 0 ? "Expires today" : `${daysLeft}d left`}
                                  </span>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {(() => {
                        const email = member.user?.email;
                        const isLocal = !email || email.endsWith("@northsouth.local");
                        if (isLocal) return <span className="text-muted-foreground text-xs">—</span>;
                        const isBadFormat = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
                        const isBounced = bouncedSet.has(email.toLowerCase());
                        const isBad = isBadFormat || isBounced;
                        return (
                          <span className={`text-xs ${isBad ? "text-red-500" : ""}`} title={isBounced ? "Bounced" : isBadFormat ? "Invalid format" : ""}>
                            {email}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                      {formatDate(member.joinDate)}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {member.activatedAt ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {formatDate(member.activatedAt)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                      {member.checkIns[0] ? timeAgo(member.checkIns[0].checkedInAt) : "Never"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/admin/members/${member.id}`}>View</Link>
                        </Button>
                        {(isAdmin || isStaff) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-blue-600 hover:bg-blue-50"
                            title="Resend activation email"
                            disabled={resendingId === member.id}
                            onClick={() => setConfirmResend({ id: member.id, email: member.user?.email ?? "", name: `${member.firstName} ${member.lastName}` })}
                          >
                            {resendingId === member.id
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <Mail className="h-4 w-4" />
                            }
                          </Button>
                        )}
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => { setDeleteTarget(member); setDeleteStep(1); setDeleteReason(""); setAdminPassword(""); setDeleteError(""); }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                      No athletes found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {total > pageSize && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total} athletes
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => router.push(`${pathname}?page=${page - 1}`)}
              className="px-3 py-1.5 rounded border bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              disabled={page * pageSize >= total}
              onClick={() => router.push(`${pathname}?page=${page + 1}`)}
              className="px-3 py-1.5 rounded border bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <AddMemberDialog open={showAdd} onClose={() => setShowAdd(false)} />

      {/* Resend activation confirmation */}
      <Dialog open={!!confirmResend} onOpenChange={(o) => { if (!o) setConfirmResend(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Send Activation Email?</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground space-y-2 py-1">
            <p>This will send an account setup link to:</p>
            <p className="font-medium text-foreground">{confirmResend?.name}</p>
            {confirmResend?.email && (
              <p className="text-xs">{confirmResend.email}</p>
            )}
            <p className="pt-1">Their current password will <strong>not</strong> be changed. The link simply lets them set a new password if they haven't already.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmResend(null)}>Cancel</Button>
            <Button
              disabled={resendingId === confirmResend?.id}
              onClick={() => confirmResend && resendActivation(confirmResend.id, confirmResend.email)}
            >
              {resendingId === confirmResend?.id ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending…</> : "Send Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Athlete</DialogTitle>
          </DialogHeader>

          {deleteStep === 1 && deleteTarget && (() => {
            const subs = deleteTarget.subscriptions ?? [];
            const lastCheckIn = deleteTarget.checkIns?.[0];
            const warnings: { label: string; detail: string }[] = [];

            subs.forEach((sub: any) => {
              const daysLeft = sub.endDate
                ? Math.max(0, Math.ceil((new Date(sub.endDate).getTime() - Date.now()) / 86400000))
                : null;
              const sessionsLeft = sub.sessionsTotal !== null ? sub.sessionsTotal - sub.sessionsUsed : null;
              warnings.push({
                label: "Active Membership",
                detail: `${sub.service.name}${daysLeft !== null ? ` — ${daysLeft}d remaining` : ""}${sessionsLeft !== null ? ` — ${sessionsLeft} sessions left` : ""}`,
              });
            });

            if (lastCheckIn) {
              warnings.push({
                label: "Check-in History",
                detail: `Last checked in ${timeAgo(lastCheckIn.checkedInAt)}`,
              });
            }

            return (
              <div className="space-y-4">
                <p className="text-sm">
                  <span className="font-semibold">{deleteTarget.firstName} {deleteTarget.lastName}</span> has the following active records that will be permanently deleted:
                </p>
                {warnings.length > 0 ? (
                  <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 space-y-2">
                    {warnings.map((w, i) => (
                      <div key={i} className="text-sm">
                        <span className="font-semibold text-destructive">⚠ {w.label}:</span>{" "}
                        <span className="text-muted-foreground">{w.detail}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No active memberships or check-ins found.</p>
                )}
                <p className="text-sm font-semibold text-destructive">Are you sure you want to delete this athlete? This cannot be undone.</p>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
                  <Button variant="destructive" onClick={() => setDeleteStep(2)}>Yes, Continue</Button>
                </DialogFooter>
              </div>
            );
          })()}

          {deleteStep === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Provide a reason and your admin password to confirm deletion of{" "}
                <span className="font-semibold text-foreground">{deleteTarget?.firstName} {deleteTarget?.lastName}</span>.
              </p>
              <div className="space-y-1.5">
                <Label>Reason for deletion</Label>
                <Textarea
                  placeholder="Enter reason..."
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Admin password</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                />
              </div>
              {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteStep(1)}>Back</Button>
                <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                  {deleting ? "Deleting..." : "Delete Athlete"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
