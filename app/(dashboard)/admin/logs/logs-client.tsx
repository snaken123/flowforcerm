"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2, RefreshCw } from "lucide-react";
import { SortableHeader } from "@/components/ui/sortable-header";
import { format } from "date-fns";

interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId?: string;
  entityName?: string;
  description: string;
  metadata?: any;
  createdAt: string;
  user: { id: string; name?: string; email?: string };
}

interface User {
  id: string;
  name?: string | null;
  email?: string | null;
}

interface ServicePackage {
  id: string;
  name: string;
  sessions: number | null;
  validDays: number;
  memberPrice: number | null;
  nonMemberPrice: number | null;
}

interface Service {
  id: string;
  name: string;
  packages: ServicePackage[];
}

const ACTION_COLORS: Record<string, string> = {
  FREEZE_MEMBER: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  UNFREEZE_MEMBER: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  ASSIGN_MEMBERSHIP: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  EDIT_MEMBERSHIP: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  DELETE_MEMBERSHIP: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  CREATE_MEMBER: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  UPDATE_MEMBER: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  DELETE_MEMBER: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  CREATE_SCHEDULE: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  UPDATE_SCHEDULE: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  DELETE_SCHEDULE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  CANCEL_SCHEDULE_SESSION: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  END_SCHEDULE: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  CREATE_EMPLOYEE: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  UPDATE_EMPLOYEE: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
};

const ACTION_LABELS: Record<string, string> = {
  FREEZE_MEMBER: "Freeze",
  UNFREEZE_MEMBER: "Unfreeze",
  ASSIGN_MEMBERSHIP: "Assign Membership",
  EDIT_MEMBERSHIP: "Edit Membership",
  DELETE_MEMBERSHIP: "Delete Membership",
  CREATE_MEMBER: "Add Member",
  UPDATE_MEMBER: "Edit Member",
  DELETE_MEMBER: "Delete Member",
  CREATE_SCHEDULE: "Create Schedule",
  UPDATE_SCHEDULE: "Edit Schedule",
  DELETE_SCHEDULE: "Delete Schedule",
  CANCEL_SCHEDULE_SESSION: "Cancel Session",
  END_SCHEDULE: "End Schedule",
  CREATE_EMPLOYEE: "Add Employee",
  UPDATE_EMPLOYEE: "Edit Employee",
};

const PAYMENT_METHODS = [
  "Cash",
  "GCash",
  "Maya",
  "Card",
  "Bank Transfer - BDO",
  "Bank Transfer - BPI",
  "Class Pass",
];

const REASON_OPTIONS = ["Admin entry error", "Customer request", "Others"];

export function LogsClient({ users, services }: { users: User[]; services: Service[] }) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const LIMIT = 50;

  const [filterUser, setFilterUser] = useState("all");
  const [filterAction, setFilterAction] = useState("all");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  // Edit membership dialog state
  const [editLog, setEditLog] = useState<AuditLog | null>(null);
  const [editPackageId, setEditPackageId] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState("");
  const [editReason, setEditReason] = useState("");
  const [editOtherReason, setEditOtherReason] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchLogs = useCallback(async (off = 0) => {
    setLoading(true);
    const params = new URLSearchParams({ limit: String(LIMIT), offset: String(off) });
    if (filterUser && filterUser !== "all") params.set("userId", filterUser);
    if (filterAction && filterAction !== "all") params.set("action", filterAction);
    if (appliedSearch) params.set("search", appliedSearch);
    if (filterFrom) params.set("from", new Date(filterFrom).toISOString());
    if (filterTo) {
      const to = new Date(filterTo);
      to.setHours(23, 59, 59, 999);
      params.set("to", to.toISOString());
    }
    try {
      const res = await fetch(`/api/audit-logs?${params}`);
      const data = await res.json();
      setLogs(data.logs ?? []);
      setTotal(data.total ?? 0);
      setOffset(off);
    } finally {
      setLoading(false);
    }
  }, [filterUser, filterAction, filterFrom, filterTo, appliedSearch]);

  useEffect(() => {
    fetchLogs(0);
  }, [fetchLogs]);

  function openEdit(log: AuditLog) {
    const meta = (log.metadata ?? {}) as Record<string, any>;
    setEditLog(log);

    // Pre-select the package: match by serviceId + sessionsTotal, fall back to first package of that service
    const svc = services.find((s) => s.id === meta.serviceId);
    const matchedPkg =
      svc?.packages.find((p) => p.sessions === (meta.sessionsTotal ?? null)) ??
      svc?.packages[0] ??
      null;
    setEditPackageId(matchedPkg?.id ?? "");

    setEditAmount(String(meta.price ?? ""));
    setEditPaymentMethod(meta.paymentMethod ?? "");
    setEditReason("");
    setEditOtherReason("");
    setSaving(false);
  }

  async function saveEdit() {
    if (!editLog) return;
    setSaving(true);
    const finalReason = editReason === "Others" ? editOtherReason.trim() : editReason;
    try {
      const res = await fetch(`/api/audit-logs/${editLog.id}/edit-membership`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: editPackageId,
          amount: parseFloat(editAmount),
          paymentMethod: editPaymentMethod,
          reason: finalReason,
        }),
      });
      if (res.ok) {
        setEditLog(null);
        fetchLogs(offset);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error ?? "Failed to save.");
      }
    } finally {
      setSaving(false);
    }
  }

  const MEMBER_ACTIONS = new Set(["FREEZE_MEMBER", "UNFREEZE_MEMBER", "ASSIGN_MEMBERSHIP", "EDIT_MEMBERSHIP", "DELETE_MEMBERSHIP", "CREATE_MEMBER", "UPDATE_MEMBER", "DELETE_MEMBER"]);

  function getMemberName(log: AuditLog): string {
    if (!MEMBER_ACTIONS.has(log.action) || !log.entityName) return "—";
    return log.entityName.split(" — ")[0] || "—";
  }

  function runSearch() {
    setAppliedSearch(searchInput.trim());
  }

  const isSaveDisabled =
    !editPackageId ||
    !editAmount ||
    !editPaymentMethod ||
    !editReason ||
    (editReason === "Others" && !editOtherReason.trim()) ||
    saving;

  const allActions = Object.keys(ACTION_LABELS);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="w-48">
          <label className="text-xs text-muted-foreground mb-1 block">Staff / Admin</label>
          <Select value={filterUser} onValueChange={setFilterUser}>
            <SelectTrigger>
              <SelectValue placeholder="All users" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All users</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name ?? u.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-52">
          <label className="text-xs text-muted-foreground mb-1 block">Action</label>
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger>
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {allActions.map((a) => (
                <SelectItem key={a} value={a}>
                  {ACTION_LABELS[a] ?? a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">From</label>
          <Input
            type="date"
            className="w-40"
            value={filterFrom}
            onChange={(e) => setFilterFrom(e.target.value)}
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">To</label>
          <Input
            type="date"
            className="w-40"
            value={filterTo}
            onChange={(e) => setFilterTo(e.target.value)}
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Search Member</label>
          <div className="flex gap-2">
            <Input
              className="w-48"
              placeholder="Member name…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") runSearch(); }}
            />
            <Button size="sm" onClick={runSearch}>Search</Button>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchLogs(0)}
          className="gap-2"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* Count */}
      <p className="text-sm text-muted-foreground">
        {loading ? "Loading…" : `${total} log${total !== 1 ? "s" : ""} found`}
      </p>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                  <SortableHeader label="Date & Time" direction={sortDir} onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))} />
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">By</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Member</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Action</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground">
                    No logs found.
                  </td>
                </tr>
              ) : (
                [...logs].sort((a, b) => {
                  const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                  return sortDir === "asc" ? diff : -diff;
                }).map((log) => (
                  <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground font-mono text-xs">
                      {format(new Date(log.createdAt), "MMM d, yyyy")}
                      <br />
                      {format(new Date(log.createdAt), "h:mm:ss a")}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-medium">
                      {log.userName}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {getMemberName(log)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {log.action === "ASSIGN_MEMBERSHIP" ? (
                        <button
                          onClick={() => openEdit(log)}
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium underline cursor-pointer ${ACTION_COLORS[log.action]}`}
                        >
                          {ACTION_LABELS[log.action]}
                        </button>
                      ) : (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            ACTION_COLORS[log.action] ?? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                          }`}
                        >
                          {ACTION_LABELS[log.action] ?? log.action}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-lg">
                      <p className="text-sm text-foreground">{log.description}</p>
                      {log.entityName && (
                        <p className="text-xs text-muted-foreground mt-0.5">{log.entityType}: {log.entityName}</p>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {total > LIMIT && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {offset + 1}–{Math.min(offset + LIMIT, total)} of {total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={offset === 0}
              onClick={() => fetchLogs(Math.max(0, offset - LIMIT))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={offset + LIMIT >= total}
              onClick={() => fetchLogs(offset + LIMIT)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Edit Membership Dialog */}
      <Dialog open={!!editLog} onOpenChange={(open) => { if (!open) setEditLog(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Membership Transaction</DialogTitle>
            {editLog?.entityName && (
              <p className="text-sm text-muted-foreground pt-1">{editLog.entityName}</p>
            )}
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Package */}
            <div className="space-y-1.5">
              <Label>Package</Label>
              <Select value={editPackageId} onValueChange={setEditPackageId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a package" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((svc) =>
                    svc.packages.map((pkg) => (
                      <SelectItem key={pkg.id} value={pkg.id}>
                        {svc.name} — {pkg.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <Label>Amount (₱)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>

            {/* Payment Method */}
            <div className="space-y-1.5">
              <Label>Payment Method</Label>
              <Select value={editPaymentMethod} onValueChange={setEditPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Select value={editReason} onValueChange={setEditReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {REASON_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editReason === "Others" && (
                <Input
                  className="mt-2"
                  placeholder="Please specify…"
                  value={editOtherReason}
                  onChange={(e) => setEditOtherReason(e.target.value)}
                />
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditLog(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={saveEdit} disabled={isSaveDisabled}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
