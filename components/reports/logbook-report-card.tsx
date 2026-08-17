"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, RefreshCw, FileDown, Printer, FileSpreadsheet, BookOpen } from "lucide-react";
import {
  LogbookRow,
  formatTime,
  formatDateShort,
  hasAnnualSub,
  getActiveSubs,
  type LogbookEntry,
  type SortKey,
  type SortDir,
} from "@/components/dashboard/logbook-card";

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function entryRow(e: LogbookEntry) {
  const activeSubs = getActiveSubs(e.member);
  const selectedSub = e.subscription ?? activeSubs.find((s) => s.id === e.subscriptionId) ?? null;
  const sessionsDisplay = !selectedSub
    ? "—"
    : selectedSub.sessionsTotal == null
    ? "Unli"
    : `${selectedSub.sessionsTotal - selectedSub.sessionsUsed}/${selectedSub.sessionsTotal}`;
  return {
    dateBooked: new Date(e.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }),
    athleteId: e.member?.memberNumber ?? "—",
    athlete: e.member ? `${e.member.firstName} ${e.member.lastName}` : "—",
    classTime: e.schedule ? formatTime(e.schedule.startTime) : "—",
    className: e.schedule?.classDef.name ?? "—",
    packageName: selectedSub?.service.name ?? "—",
    sessions: sessionsDisplay,
    expiration: selectedSub?.endDate ? formatDateShort(selectedSub.endDate) : "—",
    member: hasAnnualSub(e.member) ? "Yes" : "No",
    attendance: e.status === "ATTENDED" ? "Attended" : e.status === "CANCELLED" ? "Cancelled" : "—",
    notes: e.notes ?? "",
  };
}

const CSV_HEADERS = ["Date Booked", "Athlete ID", "Athlete", "Class Time", "Class", "Package", "Sessions", "Expiration", "Member?", "Attendance", "Notes"];

function downloadCSV(filename: string, entries: LogbookEntry[], label: string) {
  const rows = entries.map(entryRow);
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [
    label,
    "",
    CSV_HEADERS.join(","),
    ...rows.map((r) => [r.dateBooked, r.athleteId, r.athlete, r.classTime, r.className, r.packageName, r.sessions, r.expiration, r.member, r.attendance, r.notes].map((v) => esc(String(v))).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
}

function buildHtmlTable(entries: LogbookEntry[], label: string) {
  const rows = entries.map(entryRow);
  return `
    <table>
      <thead><tr>${CSV_HEADERS.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
      <tbody>${rows.map((r) => `
        <tr>
          <td>${r.dateBooked}</td><td>${r.athleteId}</td><td>${r.athlete}</td><td>${r.classTime}</td>
          <td>${r.className}</td><td>${r.packageName}</td><td>${r.sessions}</td><td>${r.expiration}</td>
          <td>${r.member}</td><td>${r.attendance}</td><td>${r.notes}</td>
        </tr>`).join("")}
      </tbody>
    </table>`;
}

function printPDF(entries: LogbookEntry[], label: string) {
  const html = `
    <html><head><title>${label}</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 12px; padding: 24px; }
      h2 { margin-bottom: 4px; } p { margin: 0 0 12px; color: #555; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; }
      th { background: #f1f5f9; text-align: left; padding: 6px 8px; font-size: 11px; border-bottom: 2px solid #e2e8f0; }
      td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; }
      @media print { button { display: none; } }
    </style></head><body>
    <h2>FlowForceRM</h2>
    <p>${label}</p>
    ${buildHtmlTable(entries, label)}
    <script>window.onload=()=>window.print()</script>
    </body></html>`;
  const w = window.open("", "_blank"); w?.document.write(html); w?.document.close();
}

// A .xls saved as an HTML table -- Excel opens this natively. Avoids pulling in a real
// spreadsheet-generation library for a report this size.
function downloadXLS(filename: string, entries: LogbookEntry[], label: string) {
  const html = `<html><head><meta charset="utf-8"></head><body><h3>${label}</h3>${buildHtmlTable(entries, label)}</body></html>`;
  const blob = new Blob([html], { type: "application/vnd.ms-excel" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
}

const Th = ({ col, label, sortKey, sortDir, onSort, className }: { col: SortKey; label: string; sortKey: SortKey; sortDir: SortDir; onSort: (c: SortKey) => void; className?: string }) => (
  <th
    className={`px-2 py-2 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap cursor-pointer select-none hover:text-foreground ${className ?? ""}`}
    onClick={() => onSort(col)}
  >
    {label}{col === sortKey ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
  </th>
);

export function LogbookReportCard({ canEdit }: { canEdit: boolean }) {
  const [startDate, setStartDate] = useState(toDateStr(new Date()));
  const [endDate, setEndDate] = useState(toDateStr(new Date()));
  const [entries, setEntries] = useState<LogbookEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("dateBooked");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [cancelTarget, setCancelTarget] = useState<LogbookEntry | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/logbook?start=${startDate}&end=${endDate}`);
      const data = await r.json();
      if (Array.isArray(data)) setEntries(data);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  const handleSort = (col: SortKey) => {
    if (sortKey === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(col); setSortDir("asc"); }
  };

  const [pendingAttendanceIds, setPendingAttendanceIds] = useState<Set<string>>(new Set());

  const handleAttendance = async (entry: LogbookEntry, checked: boolean) => {
    if (!checked) return;
    setPendingAttendanceIds((prev) => new Set(prev).add(entry.id));
    try {
      const r = await fetch(`/api/bookings/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ATTENDED" }),
      });
      if (r.ok) await load();
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
    await fetch(`/api/logbook/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    load();
  };

  const handleSubChange = async (entry: LogbookEntry, subscriptionId: string) => {
    await fetch(`/api/logbook/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscriptionId }),
    });
    load();
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
      if (r.ok) load();
    } finally {
      setCancelling(false);
      setCancelTarget(null);
    }
  };

  const sorted = [...entries].sort((a, b) => {
    let va: string | number = "", vb: string | number = "";
    switch (sortKey) {
      case "dateBooked": va = a.createdAt; vb = b.createdAt; break;
      case "athlete": va = `${a.member?.lastName ?? ""} ${a.member?.firstName ?? ""}`; vb = `${b.member?.lastName ?? ""} ${b.member?.firstName ?? ""}`; break;
      case "athleteId": va = a.member?.memberNumber ?? ""; vb = b.member?.memberNumber ?? ""; break;
      case "classTime": va = a.schedule?.startTime ?? ""; vb = b.schedule?.startTime ?? ""; break;
      case "attendance": va = a.status === "ATTENDED" ? 1 : 0; vb = b.status === "ATTENDED" ? 1 : 0; break;
      case "expiration": va = a.subscription?.endDate ?? ""; vb = b.subscription?.endDate ?? ""; break;
      default: va = ""; vb = "";
    }
    const cmp = va < vb ? -1 : va > vb ? 1 : 0;
    return sortDir === "asc" ? cmp : -cmp;
  });

  const label = startDate === endDate
    ? `Log Book — ${formatDateShort(startDate + "T00:00:00Z")}`
    : `Log Book — ${formatDateShort(startDate + "T00:00:00Z")} to ${formatDateShort(endDate + "T00:00:00Z")}`;
  const filenameBase = `logbook-${startDate}${startDate !== endDate ? `_to_${endDate}` : ""}`;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              <BookOpen className="h-4 w-4 text-muted-foreground" /> Log Book
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">{sorted.length} entries {startDate === endDate ? "for this date" : "in range"}</p>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-8 w-36 text-xs" max={toDateStr(new Date())} />
            <span className="text-xs text-muted-foreground">to</span>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-8 w-36 text-xs" max={toDateStr(new Date())} />
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={load} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" disabled={sorted.length === 0}
            onClick={() => downloadCSV(`${filenameBase}.csv`, sorted, label)}>
            <FileDown className="h-3.5 w-3.5" /> CSV
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" disabled={sorted.length === 0}
            onClick={() => downloadXLS(`${filenameBase}.xls`, sorted, label)}>
            <FileSpreadsheet className="h-3.5 w-3.5" /> XLS
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" disabled={sorted.length === 0}
            onClick={() => printPDF(sorted, label)}>
            <Printer className="h-3.5 w-3.5" /> PDF
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse min-w-[1100px]">
            <thead className="bg-muted/50">
              <tr>
                <Th col="dateBooked" label="Date Booked" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <Th col="athleteId" label="Athlete ID" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <Th col="athlete" label="Athlete" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <Th col="classTime" label="Class Time" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <th className="px-2 py-2 text-left text-xs font-semibold text-muted-foreground">Class</th>
                <th className="px-2 py-2 text-left text-xs font-semibold text-muted-foreground">Package</th>
                <Th col="sessions" label="Sessions" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <Th col="expiration" label="Expiration" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <Th col="membership" label="Member?" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <Th col="attendance" label="Attendance" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <th className="px-2 py-2 text-left text-xs font-semibold text-muted-foreground min-w-[160px]">Notes</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={12} className="px-2 py-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></td></tr>
              ) : sorted.length === 0 ? (
                <tr><td colSpan={12} className="px-2 py-6 text-center text-muted-foreground">No logbook entries in this range.</td></tr>
              ) : (
                sorted.map((entry, idx) => (
                  <LogbookRow
                    key={entry.id}
                    entry={entry}
                    idx={idx}
                    readOnly={!canEdit}
                    onAttendance={handleAttendance}
                    onNotesBlur={handleNotesBlur}
                    onSubChange={handleSubChange}
                    onCancelClick={setCancelTarget}
                    attendancePending={pendingAttendanceIds.has(entry.id)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>

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
                <Button variant="outline" size="sm" onClick={() => setCancelTarget(null)}>Keep</Button>
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
    </Card>
  );
}
