"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, RefreshCw, ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "@/lib/use-toast";
import { AssignMembershipDialog } from "@/components/members/assign-membership-dialog";
import { useTenantTimezone } from "@/components/tenant-timezone-provider";
import { formatTime } from "@/lib/utils";

export { formatTime };

export interface LogbookEntry {
  id: string;
  status: string;
  createdAt: string;
  scheduledDate: string | null;
  notes: string | null;
  subscriptionId: string | null;
  member: {
    id: string;
    firstName: string;
    lastName: string;
    memberNumber: string | null;
    subscriptions: Array<{
      id: string;
      status: string;
      sessionsUsed: number;
      sessionsTotal: number | null;
      endDate: string | null;
      frozenUntil: string | null;
      serviceId: string;
      service: { id: string; name: string };
    }>;
  } | null;
  schedule: {
    startTime: string;
    classDef: { name: string };
  } | null;
  subscription: {
    id: string;
    sessionsUsed: number;
    sessionsTotal: number | null;
    endDate: string | null;
    service: { name: string };
  } | null;
}

export type SortKey = "dateBooked" | "athleteId" | "athlete" | "classTime" | "sessions" | "expiration" | "membership" | "attendance";
export type SortDir = "asc" | "desc";

export function formatDateShort(d: string | Date) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatDateTime(d: string | Date) {
  const dt = new Date(d);
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + ", " +
    dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function hasAnnualSub(member: LogbookEntry["member"]) {
  return member?.subscriptions?.some(
    (s) => s.status === "ACTIVE" && s.service.name.toLowerCase().includes("annual")
  ) ?? false;
}

export function getActiveSubs(member: LogbookEntry["member"]) {
  return member?.subscriptions?.filter((s) => s.status === "ACTIVE" || s.status === "PAUSED") ?? [];
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronUp className="h-3 w-3 opacity-20" />;
  return sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
}

interface ColFilter {
  athlete: string;
  athleteId: string;
  classTime: string;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export function LogbookCard() {
  const [entries, setEntries] = useState<LogbookEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("classTime");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [filters, setFilters] = useState<ColFilter>({ athlete: "", athleteId: "", classTime: "" });
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);
  const [cancelTarget, setCancelTarget] = useState<LogbookEntry | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [todaySchedules, setTodaySchedules] = useState<any[]>([]);
  const [assignTarget, setAssignTarget] = useState<LogbookEntry | null>(null);
  const [services, setServices] = useState<any[]>([]);
  const timeZone = useTenantTimezone();

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayLabel = formatDateShort(todayStr + "T00:00:00Z");

  // Today's active schedules, for the row-level class-time editor -- fetched here
  // (not just inside AddEntryDialog) so it's available whether or not that dialog is open.
  useEffect(() => {
    const todayDow = new Date().getDay();
    fetch("/api/schedules")
      .then((r) => r.json())
      .then((d) => setTodaySchedules(Array.isArray(d) ? d.filter((s: any) => s.isActive && s.dayOfWeek === todayDow) : []))
      .catch(() => {});
    fetch("/api/services?withPackages=true")
      .then((r) => r.json())
      .then((d) => setServices(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const r = await fetch(`/api/logbook?date=${todayStr}`);
      const data = await r.json();
      if (Array.isArray(data)) setEntries(data);
    } finally {
      setRefreshing(false);
      setLoaded(true);
    }
  }, [todayStr]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 60000);
    return () => clearInterval(interval);
  }, [refresh]);

  const handleSort = (col: SortKey) => {
    if (sortKey === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(col);
      setSortDir("asc");
    }
  };

  const [pendingAttendanceIds, setPendingAttendanceIds] = useState<Set<string>>(new Set());

  const handleAttendance = async (entry: LogbookEntry, checked: boolean) => {
    if (!checked) return; // cannot uncheck
    setPendingAttendanceIds((prev) => new Set(prev).add(entry.id));
    try {
      const r = await fetch(`/api/bookings/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ATTENDED" }),
      });
      if (r.ok) await refresh();
    } finally {
      setPendingAttendanceIds((prev) => {
        const next = new Set(prev);
        next.delete(entry.id);
        return next;
      });
    }
  };

  const handleNotesBlur = async (entry: LogbookEntry, notes: string) => {
    if (notes === (entry.notes ?? "")) return;
    const r = await fetch(`/api/logbook/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    if (r.ok) {
      const updated = await r.json();
      setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    }
  };

  const handleSubChange = async (entry: LogbookEntry, subscriptionId: string) => {
    const r = await fetch(`/api/logbook/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscriptionId }),
    });
    if (r.ok) {
      const updated = await r.json();
      setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    }
  };

  const handleDateChange = async (entry: LogbookEntry, dateStr: string) => {
    const r = await fetch(`/api/logbook/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduledDate: dateStr }),
    });
    if (r.ok) {
      const updated = await r.json();
      setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    }
  };

  const handleScheduleChange = async (entry: LogbookEntry, scheduleId: string) => {
    const r = await fetch(`/api/logbook/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduleId }),
    });
    if (r.ok) {
      const updated = await r.json();
      setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    }
  };

  const handleAddEntry = () => {
    setShowAddDialog(false);
    refresh();
  };

  const handleCancelBooking = async (returnSession: boolean) => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      const r = await fetch(`/api/bookings/${cancelTarget.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnSession }),
      });
      if (r.ok) {
        refresh();
      } else {
        const body = await r.json().catch(() => ({}));
        toast({ title: "Couldn't cancel booking", description: body.error ?? "Please try again.", variant: "destructive" });
      }
    } finally {
      setCancelling(false);
      setCancelTarget(null);
    }
  };

  // Filter
  const filtered = entries.filter((e) => {
    const name = `${e.member?.firstName ?? ""} ${e.member?.lastName ?? ""}`.toLowerCase();
    const id = (e.member?.memberNumber ?? "").toLowerCase();
    const time = e.schedule?.startTime ?? "";
    if (filters.athlete && !name.includes(filters.athlete.toLowerCase())) return false;
    if (filters.athleteId && !id.includes(filters.athleteId.toLowerCase())) return false;
    if (filters.classTime && !time.includes(filters.classTime)) return false;
    return true;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    let va: string | number = "";
    let vb: string | number = "";
    switch (sortKey) {
      case "classTime":
        va = a.schedule?.startTime ?? "";
        vb = b.schedule?.startTime ?? "";
        break;
      case "athlete":
        va = `${a.member?.lastName ?? ""} ${a.member?.firstName ?? ""}`;
        vb = `${b.member?.lastName ?? ""} ${b.member?.firstName ?? ""}`;
        break;
      case "athleteId":
        va = a.member?.memberNumber ?? "";
        vb = b.member?.memberNumber ?? "";
        break;
      case "dateBooked":
        va = a.createdAt;
        vb = b.createdAt;
        break;
      case "attendance":
        va = a.status === "ATTENDED" ? 1 : 0;
        vb = b.status === "ATTENDED" ? 1 : 0;
        break;
      case "expiration":
        va = a.subscription?.endDate ?? "";
        vb = b.subscription?.endDate ?? "";
        break;
      default:
        va = "";
        vb = "";
    }
    const cmp = va < vb ? -1 : va > vb ? 1 : 0;
    return sortDir === "asc" ? cmp : -cmp;
  });

  const Th = ({ col, label, className }: { col: SortKey; label: string; className?: string }) => (
    <th
      className={`px-2 py-2 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap cursor-pointer select-none hover:text-foreground ${className ?? ""}`}
      onClick={() => handleSort(col)}
    >
      <span className="flex items-center gap-0.5">
        {label}
        <SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
      </span>
    </th>
  );

  return (
    <Card>
      <style>{`
        @media (min-width: 768px) and (orientation: landscape) { .logbook-narrow-notice { display: none !important; } .logbook-wide-contents { display: contents !important; } }
        @media (min-width: 1024px) { .logbook-narrow-notice { display: none !important; } .logbook-wide-contents { display: contents !important; } }
      `}</style>
      {/* Shown on portrait mobile/tablet -- the table needs real width to be usable */}
      <div className="logbook-narrow-notice lg:hidden px-6 py-8 text-center">
        <p className="text-sm font-medium">Logbook</p>
        <p className="text-xs text-muted-foreground mt-1">Rotate to landscape or open on a desktop for the full logbook view.</p>
      </div>
      <div className="logbook-wide-contents hidden lg:contents">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Logbook — {todayLabel}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{sorted.length} entries today</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Entry
            </Button>
          </div>
        </div>
        {/* Filters */}
        <div className="flex gap-2 mt-2 flex-wrap">
          <Input
            placeholder="Filter by Athlete ID…"
            value={filters.athleteId}
            onChange={(e) => setFilters((f) => ({ ...f, athleteId: e.target.value }))}
            className="h-7 text-xs w-40"
          />
          <Input
            placeholder="Filter by Athlete name…"
            value={filters.athlete}
            onChange={(e) => setFilters((f) => ({ ...f, athlete: e.target.value }))}
            className="h-7 text-xs w-48"
          />
          <Input
            placeholder="Filter by time (e.g. 09:00)…"
            value={filters.classTime}
            onChange={(e) => setFilters((f) => ({ ...f, classTime: e.target.value }))}
            className="h-7 text-xs w-44"
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse min-w-[1100px]">
            <thead className="bg-muted/50 sticky top-0 z-10">
              <tr>
                <Th col="dateBooked" label="Date Booked" />
                <Th col="athleteId" label="Athlete ID" />
                <Th col="athlete" label="Athlete" />
                <Th col="classTime" label="Class Time" />
                <th className="px-2 py-2 text-left text-xs font-semibold text-muted-foreground">Class</th>
                <th className="px-2 py-2 text-left text-xs font-semibold text-muted-foreground">Package</th>
                <Th col="sessions" label="Sessions" />
                <Th col="expiration" label="Expiration" />
                <Th col="attendance" label="Attendance" />
                <th className="px-2 py-2 text-left text-xs font-semibold text-muted-foreground min-w-[160px]">Notes</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.slice(0, visibleCount).map((entry, idx) => (
                <LogbookRow
                  key={entry.id}
                  entry={entry}
                  idx={idx}
                  onAttendance={handleAttendance}
                  onNotesBlur={handleNotesBlur}
                  onSubChange={handleSubChange}
                  onDateChange={handleDateChange}
                  onScheduleChange={handleScheduleChange}
                  todaySchedules={todaySchedules}
                  onCancelClick={setCancelTarget}
                  onAssignClick={setAssignTarget}
                  attendancePending={pendingAttendanceIds.has(entry.id)}
                />
              ))}
              {sorted.length === 0 && loaded && (
                <tr>
                  <td colSpan={11} className="px-2 py-6 text-center text-muted-foreground">
                    No logbook entries for today.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {sorted.length > visibleCount && (
          <div className="flex items-center justify-center gap-3 py-3 border-t text-sm text-muted-foreground">
            <span>{sorted.length - visibleCount} more {sorted.length - visibleCount === 1 ? "entry" : "entries"}</span>
            <button
              onClick={() => setVisibleCount((c) => c + 10)}
              className="text-primary hover:underline font-medium"
            >
              Show 10 more
            </button>
            <button
              onClick={() => setVisibleCount(sorted.length)}
              className="text-primary hover:underline font-medium"
            >
              Show all
            </button>
          </div>
        )}
        {visibleCount > 10 && sorted.length <= visibleCount && sorted.length > 10 && (
          <div className="flex justify-center py-3 border-t">
            <button
              onClick={() => setVisibleCount(10)}
              className="text-sm text-muted-foreground hover:text-foreground hover:underline"
            >
              Show less
            </button>
          </div>
        )}
      </CardContent>

      {showAddDialog && (
        <AddEntryDialog
          onClose={() => setShowAddDialog(false)}
          onAdd={handleAddEntry}
        />
      )}

      {/* Cancel booking dialog */}
      <Dialog open={!!cancelTarget} onOpenChange={(o) => { if (!o) setCancelTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
          </DialogHeader>
          {cancelTarget && (
            <div className="space-y-4 pt-1">
              <p className="text-sm text-muted-foreground">
                Cancel booking for <strong>{cancelTarget.member?.firstName} {cancelTarget.member?.lastName}</strong>
                {cancelTarget.schedule && <> — {cancelTarget.schedule.classDef.name} {formatTime(cancelTarget.schedule.startTime)}</>}?
              </p>
              {cancelTarget.subscriptionId && (
                <p className="text-sm text-muted-foreground">Would you like to return a session to their balance?</p>
              )}
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" size="sm" onClick={() => setCancelTarget(null)}>
                  Keep
                </Button>
                {cancelTarget.subscriptionId ? (
                  <>
                    <Button variant="outline" size="sm" disabled={cancelling} onClick={() => handleCancelBooking(false)}>
                      Cancel, no return
                    </Button>
                    <Button variant="destructive" size="sm" disabled={cancelling} onClick={() => handleCancelBooking(true)}>
                      {cancelling ? "Cancelling…" : "Cancel + return session"}
                    </Button>
                  </>
                ) : (
                  <Button variant="destructive" size="sm" disabled={cancelling} onClick={() => handleCancelBooking(false)}>
                    {cancelling ? "Cancelling…" : "Yes, cancel"}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {assignTarget?.member && (
        <AssignMembershipDialog
          open={!!assignTarget}
          onOpenChange={(o) => { if (!o) setAssignTarget(null); }}
          member={{
            id: assignTarget.member.id,
            firstName: assignTarget.member.firstName,
            lastName: assignTarget.member.lastName,
            subscriptions: assignTarget.member.subscriptions,
          }}
          services={services}
          timeZone={timeZone}
          onAssigned={() => { setAssignTarget(null); refresh(); }}
        />
      )}
      </div>{/* end lg:contents */}
    </Card>
  );
}

export function LogbookRow({
  entry,
  idx,
  onAttendance,
  onNotesBlur,
  onSubChange,
  onDateChange,
  onScheduleChange,
  todaySchedules = [],
  onCancelClick,
  onAssignClick,
  readOnly = false,
  attendancePending = false,
}: {
  entry: LogbookEntry;
  idx: number;
  onAttendance?: (e: LogbookEntry, checked: boolean) => void;
  onNotesBlur?: (e: LogbookEntry, notes: string) => void;
  onSubChange?: (e: LogbookEntry, subId: string) => void;
  onDateChange?: (e: LogbookEntry, dateStr: string) => void;
  onScheduleChange?: (e: LogbookEntry, scheduleId: string) => void;
  // Today's active schedules, for the class-time editor. Only relevant when !readOnly.
  todaySchedules?: any[];
  onCancelClick?: (e: LogbookEntry) => void;
  // Opens AssignMembershipDialog inline for this entry's member, when they have no
  // active subscription -- see the "No active sub" cell below.
  onAssignClick?: (e: LogbookEntry) => void;
  // Reports view: same row layout, but no inline edit controls -- plain text throughout.
  readOnly?: boolean;
  // True while a just-clicked "mark attended" PATCH is in flight, so the checkbox
  // can't be clicked again before the row re-renders with the server-confirmed state.
  attendancePending?: boolean;
}) {
  const [localNotes, setLocalNotes] = useState(entry.notes ?? "");
  useEffect(() => { setLocalNotes(entry.notes ?? ""); }, [entry.notes]);

  const activeSubs = getActiveSubs(entry.member);
  const selectedSubId = entry.subscriptionId ?? "";
  const selectedSub = entry.subscription ?? activeSubs.find((s) => s.id === selectedSubId) ?? null;

  const sessionsDisplay = (() => {
    if (!selectedSub) return "—";
    if (selectedSub.sessionsTotal == null) return "Unli";
    const remaining = selectedSub.sessionsTotal - selectedSub.sessionsUsed;
    return `${remaining}/${selectedSub.sessionsTotal}`;
  })();

  const isAttended = entry.status === "ATTENDED";
  const isCancelled = entry.status === "CANCELLED";

  const rowClass = `${idx % 2 === 0 ? "bg-background" : "bg-muted/20"} ${isCancelled ? "opacity-60" : ""}`;
  const cellClass = isCancelled ? "line-through text-muted-foreground" : "";

  return (
    <tr className={rowClass}>
      <td className={`px-2 py-1.5 whitespace-nowrap text-muted-foreground ${cellClass}`}>
        {readOnly || isCancelled ? (
          formatDateTime(entry.createdAt)
        ) : (
          <input
            type="date"
            // entry.scheduledDate arrives JSON-serialized (already a string, never a raw
            // Prisma Date), but going through `new Date(...).toISOString()` rather than a
            // bare .slice() keeps this safe even if that ever changes.
            value={new Date(entry.scheduledDate ?? entry.createdAt).toISOString().slice(0, 10)}
            onChange={(e) => e.target.value && onDateChange?.(entry, e.target.value)}
            className="h-6 text-xs px-1 border rounded-md bg-background w-[124px]"
          />
        )}
      </td>
      <td className={`px-2 py-1.5 font-mono ${cellClass}`}>{entry.member?.memberNumber ?? "—"}</td>
      <td className={`px-2 py-1.5 whitespace-nowrap font-medium ${cellClass}`}>
        {entry.member ? `${entry.member.firstName} ${entry.member.lastName}` : "—"}
      </td>
      <td className="px-2 py-1.5 whitespace-nowrap">
        {readOnly || isCancelled ? (
          <span className={`text-muted-foreground ${cellClass}`}>{entry.schedule ? formatTime(entry.schedule.startTime) : "—"}</span>
        ) : (
          <Select
            value={entry.schedule ? (todaySchedules.find((s) => s.startTime === entry.schedule!.startTime && s.classDef?.name === entry.schedule!.classDef.name)?.id ?? "") : ""}
            onValueChange={(val) => val && onScheduleChange?.(entry, val)}
          >
            <SelectTrigger className="h-6 text-xs w-32 px-1.5">
              <SelectValue placeholder="Select time…" />
            </SelectTrigger>
            <SelectContent>
              {todaySchedules.map((s) => (
                <SelectItem key={s.id} value={s.id} className="text-xs">
                  {s.classDef?.name ?? "Class"} — {formatTime(s.startTime)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </td>
      <td className="px-2 py-1.5 whitespace-nowrap">
        {readOnly || isCancelled ? (
          <span className={`text-xs text-muted-foreground ${cellClass}`}>{selectedSub?.service.name ?? "—"}</span>
        ) : activeSubs.length === 0 ? (
          entry.member ? (
            <button
              type="button"
              onClick={() => onAssignClick?.(entry)}
              className="text-blue-600 underline text-xs"
            >
              + Assign Package
            </button>
          ) : "—"
        ) : (
          <Select
            value={selectedSubId || "none"}
            onValueChange={(val) => val !== "none" && onSubChange?.(entry, val)}
          >
            <SelectTrigger className="h-6 text-xs w-40 px-1.5">
              <SelectValue placeholder="Select sub…" />
            </SelectTrigger>
            <SelectContent>
              {activeSubs.map((s) => (
                <SelectItem key={s.id} value={s.id} className="text-xs">
                  {s.service.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </td>
      <td className={`px-2 py-1.5 whitespace-nowrap text-muted-foreground ${cellClass}`}>
        {selectedSub?.service.name ?? "—"}
      </td>
      <td className={`px-2 py-1.5 whitespace-nowrap font-mono ${cellClass}`}>{sessionsDisplay}</td>
      <td className={`px-2 py-1.5 whitespace-nowrap text-muted-foreground ${cellClass}`}>
        {selectedSub?.endDate ? formatDateShort(selectedSub.endDate) : "—"}
      </td>
      <td className="px-2 py-1.5">
        {isCancelled ? (
          <Badge className="text-xs" variant="secondary">Cancelled</Badge>
        ) : readOnly ? (
          <span className="text-xs text-muted-foreground">{isAttended ? "Attended" : "—"}</span>
        ) : (
          <input
            type="checkbox"
            className="h-4 w-4 accent-green-600 cursor-pointer disabled:cursor-not-allowed"
            checked={isAttended}
            onChange={(e) => onAttendance?.(entry, e.target.checked)}
            disabled={isAttended || isCancelled || attendancePending}
          />
        )}
      </td>
      <td className="px-2 py-1.5">
        {readOnly ? (
          <span className={`text-xs text-muted-foreground ${cellClass}`}>{entry.notes ?? "—"}</span>
        ) : (
          <Input
            value={localNotes}
            onChange={(e) => setLocalNotes(e.target.value)}
            onBlur={() => onNotesBlur?.(entry, localNotes)}
            className="h-6 text-xs px-1.5 min-w-[140px]"
            placeholder="Add note…"
            readOnly={isCancelled}
          />
        )}
      </td>
      <td className="px-2 py-1.5">
        {!readOnly && !isCancelled && !isAttended && (
          <button
            onClick={() => onCancelClick?.(entry)}
            className="text-xs text-destructive hover:underline whitespace-nowrap"
          >
            Cancel
          </button>
        )}
      </td>
    </tr>
  );
}

function AddEntryDialog({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: () => void;
}) {
  const timeZone = useTenantTimezone();
  const [memberQuery, setMemberQuery] = useState("");
  const [memberResults, setMemberResults] = useState<any[]>([]);
  const [memberSearched, setMemberSearched] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [selectedSport, setSelectedSport] = useState("");
  const [scheduleId, setScheduleId] = useState("");
  const [subscriptionId, setSubscriptionId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateMember, setShowCreateMember] = useState(false);
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [creatingMember, setCreatingMember] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const debouncedQuery = useDebounce(memberQuery, 300);

  useEffect(() => {
    if (debouncedQuery.length < 2) { setMemberResults([]); setMemberSearched(false); return; }
    fetch(`/api/members?q=${encodeURIComponent(debouncedQuery)}`)
      .then((r) => r.json())
      .then((d) => { setMemberResults(Array.isArray(d) ? d : d.members ?? []); setMemberSearched(true); })
      .catch(() => {});
  }, [debouncedQuery]);

  useEffect(() => {
    // The schedules API doesn't support server-side day-of-week filtering, so the
    // active list is filtered to today's weekday client-side below.
    fetch(`/api/schedules`)
      .then((r) => r.json())
      .then((d) => setSchedules(Array.isArray(d) ? d : []))
      .catch(() => {});
    fetch("/api/services?withPackages=true")
      .then((r) => r.json())
      .then((d) => setServices(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const refreshMember = async (memberId: string) => {
    try {
      const r = await fetch(`/api/members/${memberId}`);
      if (r.ok) setSelectedMember(await r.json());
    } catch {}
  };

  const activeSubs = selectedMember?.subscriptions?.filter(
    (s: any) => s.status === "ACTIVE" || s.status === "PAUSED"
  ) ?? [];

  const todayDow = new Date().getDay();
  const todaySchedules = schedules.filter((s: any) => s.isActive && s.dayOfWeek === todayDow);

  // Unique class names from today's schedules
  const sportNames = Array.from(new Set(
    todaySchedules.map((s: any) => s.classDef?.name ?? "").filter(Boolean)
  )).sort();

  const sportSlots = todaySchedules.filter((s: any) => s.classDef?.name === selectedSport);

  const selectedSchedule = schedules.find((s: any) => s.id === scheduleId);
  const allowedServiceIds: string[] = selectedSchedule?.classDef?.allowedServices?.map((a: any) => a.serviceId) ?? [];

  const sportSubs = selectedSport && allowedServiceIds.length > 0
    ? activeSubs.filter((s: any) => allowedServiceIds.includes(s.serviceId) || allowedServiceIds.includes(s.service?.id))
    : activeSubs;
  const needsPurchase = !!selectedSport && sportSubs.length === 0;

  const submit = async () => {
    if (!selectedMember) return;
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch("/api/logbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: selectedMember.id,
          scheduleId: scheduleId || undefined,
          subscriptionId: subscriptionId || undefined,
        }),
      });
      if (r.ok) {
        onAdd();
      } else {
        const body = await r.json().catch(() => ({}));
        setError(typeof body.error === "string" ? body.error : "Could not add this entry. Please try again.");
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Create the member, then immediately add the logbook entry for them, then close --
  // deliberately doesn't touch any dialog-visible state (setSelectedMember,
  // setShowCreateMember) in between, so the main Add Entry form never gets a chance to
  // flash into view before the dialog actually closes.
  async function createAndAdd() {
    if (!newFirstName.trim() || !newLastName.trim()) return;
    setCreatingMember(true);
    setCreateError(null);
    try {
      const memberRes = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: newFirstName.trim(), lastName: newLastName.trim(), phone: newPhone.trim() || undefined }),
      });
      const newMember = await memberRes.json().catch(() => ({}));
      if (!memberRes.ok) {
        setCreateError(typeof newMember.error === "string" ? newMember.error : "Could not create member.");
        return;
      }

      const entryRes = await fetch("/api/logbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: newMember.id,
          scheduleId: scheduleId || undefined,
          subscriptionId: subscriptionId || undefined,
        }),
      });
      if (!entryRes.ok) {
        // The member itself was created successfully -- select them so the admin can
        // retry adding the entry via the normal flow instead of re-searching from scratch.
        setSelectedMember(newMember);
        setMemberQuery(`${newMember.firstName} ${newMember.lastName}`);
        setShowCreateMember(false);
        const body = await entryRes.json().catch(() => ({}));
        setCreateError(typeof body.error === "string" ? body.error : "Member created, but the logbook entry could not be added.");
        return;
      }

      onAdd();
    } catch {
      setCreateError("Network error — please try again.");
    } finally {
      setCreatingMember(false);
    }
  }

  return (
    <>
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Logbook Entry</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-sm font-medium mb-1 block">Search Member</label>
            <Input
              placeholder="Name or athlete ID…"
              value={memberQuery}
              onChange={(e) => { setMemberQuery(e.target.value); setSelectedMember(null); }}
              autoFocus
            />
            {memberResults.length > 0 && !selectedMember && (
              <div className="border rounded-md mt-1 max-h-40 overflow-y-auto bg-background shadow-sm">
                {memberResults.map((m: any) => (
                  <button
                    key={m.id}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                    onClick={() => { setSelectedMember(m); setMemberQuery(`${m.firstName} ${m.lastName}`); setMemberResults([]); }}
                  >
                    {m.firstName} {m.lastName}
                    {m.memberNumber && <span className="text-xs text-muted-foreground ml-2">#{m.memberNumber}</span>}
                  </button>
                ))}
              </div>
            )}
            {memberSearched && memberResults.length === 0 && !selectedMember && debouncedQuery.length >= 2 && !showCreateMember && (
              <div className="border rounded-md mt-1 px-3 py-3 bg-background text-sm text-muted-foreground flex items-center justify-between">
                <span>No member found for &ldquo;{debouncedQuery}&rdquo;</span>
                <button
                  className="text-primary font-medium hover:underline ml-3 whitespace-nowrap"
                  onClick={() => {
                    setShowCreateMember(true);
                    const parts = debouncedQuery.trim().split(/\s+/);
                    setNewFirstName(parts[0] ?? "");
                    setNewLastName(parts.slice(1).join(" "));
                  }}
                >
                  + Create new member
                </button>
              </div>
            )}
            {showCreateMember && !selectedMember && (
              <div className="border rounded-md mt-1 p-3 bg-background space-y-2">
                <p className="text-sm font-medium">Create New Member</p>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="First name"
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    className="h-8 text-sm"
                  />
                  <Input
                    placeholder="Last name"
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <Input
                  placeholder="Phone (optional)"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="h-8 text-sm"
                />
                {createError && <p className="text-xs text-destructive">{createError}</p>}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setShowCreateMember(false); setCreateError(null); }}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={createAndAdd} disabled={creatingMember || !newFirstName.trim() || !newLastName.trim()}>
                    {creatingMember ? "Adding…" : "Create & Add Entry"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {selectedMember && (
            <>
              <div>
                <label className="text-sm font-medium mb-1 block">Class (optional)</label>
                <Select value={selectedSport} onValueChange={(v) => { setSelectedSport(v); setScheduleId(""); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select class…" />
                  </SelectTrigger>
                  <SelectContent>
                    {sportNames.map((name) => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedSport && (
                <div>
                  <label className="text-sm font-medium mb-1 block">Time Slot</label>
                  <Select value={scheduleId} onValueChange={setScheduleId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select time…" />
                    </SelectTrigger>
                    <SelectContent>
                      {sportSlots.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>
                          {formatTime(s.startTime)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <label className="text-sm font-medium mb-1 block">Subscription (optional)</label>
                {needsPurchase ? (
                  <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm text-muted-foreground bg-muted/30">
                    <span>No package for {selectedSport}</span>
                    <button
                      type="button"
                      onClick={() => setShowAssign(true)}
                      className="text-primary font-medium hover:underline ml-3 whitespace-nowrap"
                    >
                      Purchase Package
                    </button>
                  </div>
                ) : sportSubs.length > 0 ? (
                  <Select value={subscriptionId} onValueChange={setSubscriptionId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subscription…" />
                    </SelectTrigger>
                    <SelectContent>
                      {sportSubs.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>{s.service?.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm text-muted-foreground bg-muted/30">
                    <span>No active subscription</span>
                    <button
                      type="button"
                      onClick={() => setShowAssign(true)}
                      className="text-primary font-medium hover:underline ml-3 whitespace-nowrap"
                    >
                      Purchase Package
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={submit} disabled={!selectedMember || submitting}>
              {submitting ? "Adding…" : "Add Entry"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {selectedMember && showAssign && (
      <AssignMembershipDialog
        open={showAssign}
        onOpenChange={setShowAssign}
        member={{
          id: selectedMember.id,
          firstName: selectedMember.firstName,
          lastName: selectedMember.lastName,
          subscriptions: selectedMember.subscriptions,
        }}
        services={services}
        timeZone={timeZone}
        onAssigned={() => refreshMember(selectedMember.id)}
      />
    )}
    </>
  );
}
