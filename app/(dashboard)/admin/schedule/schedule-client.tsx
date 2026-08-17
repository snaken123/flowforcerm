"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect, useMemo } from "react";
import { Plus, Loader2, ChevronDown, Check, Trash2, ChevronLeft, ChevronRight, CalendarX, CalendarRange, LayoutGrid, Calendar, Copy, Pencil, CheckSquare, Search, CheckCircle2, UserPlus, X as XIcon, SlidersHorizontal, AlertCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LocationSelect } from "@/components/location-select";
import { DAY_NAMES_FULL, DAY_NAMES, formatTime } from "@/lib/utils";
import { toast } from "@/lib/use-toast";
import { useTenantTimezone } from "@/components/tenant-timezone-provider";
import { AssignMembershipDialog } from "@/components/members/assign-membership-dialog";

function getWeekStart(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = Sunday
  d.setDate(d.getDate() - day);
  return d;
}

function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const DAYS = [0, 1, 2, 3, 4, 5, 6];
const START_HOUR = 0;
const END_HOUR = 23;
const HOUR_PX = 64;

function computeVisibleHourRange(items: any[]): { startHour: number; endHour: number } {
  const timed = items.filter((i: any) => !isWholeDay(i.startTime, i.endTime));
  if (timed.length === 0) return { startHour: 7, endHour: 22 };
  let minHour = 23, maxHour = 0;
  for (const item of timed) {
    const startMin = timeToMinutes(item.startTime);
    const endMin = timeToMinutes(item.endTime);
    minHour = Math.min(minHour, Math.floor(startMin / 60));
    maxHour = Math.max(maxHour, Math.ceil(endMin / 60));
  }
  return { startHour: Math.max(0, minHour - 1), endHour: Math.min(23, maxHour + 1) };
}

function fmtHour(h: number) {
  return `${h % 12 || 12}${h < 12 ? "am" : "pm"}`;
}

function CollapsedTimeBanner({ fromHour, toHour, cols }: { fromHour: number; toHour: number; cols?: number }) {
  return (
    <div className="flex border-dashed border-border/50 bg-muted/20">
      <div className="w-14 shrink-0 flex items-center justify-end pr-2">
        <span className="text-[9px] text-muted-foreground leading-none">···</span>
      </div>
      <div className={`flex-1 border-l flex items-center justify-center py-1.5 gap-1`} style={{ minWidth: cols ? cols * 80 : undefined }}>
        <span className="text-[11px] text-muted-foreground">{fmtHour(fromHour)} – {fmtHour(toHour)} not shown</span>
      </div>
    </div>
  );
}
const DAY_COLORS = ["#6366f1","#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899"];

function timeToMinutes(t: string) {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function isWholeDay(startTime: string, endTime: string) {
  return startTime === "00:00" && endTime === "23:59";
}

function layoutDay(items: any[]) {
  const sorted = [...items].sort((a, b) => {
    const timeDiff = timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
    if (timeDiff !== 0) return timeDiff;
    // Tiebreak by class name so column order is consistent across all days
    return (a.classDef?.name ?? "").localeCompare(b.classDef?.name ?? "");
  });
  const cols: number[] = [];
  const result = sorted.map((item) => {
    const start = timeToMinutes(item.startTime);
    const end = timeToMinutes(item.endTime);
    let col = cols.findIndex((endTime) => endTime <= start);
    if (col === -1) { col = cols.length; cols.push(end); } else cols[col] = end;
    return { item, col };
  });
  const totalCols = cols.length;
  return result.map(({ item, col }) => ({ item, col, totalCols }));
}

function MultiCheckDropdown({ label, options, selectedIds, onToggle, getLabel, getSubLabel }: {
  label: string; options: any[]; selectedIds: string[];
  onToggle: (id: string) => void;
  getLabel: (o: any) => string;
  getSubLabel?: (o: any) => string | undefined;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const selectedLabels = options.filter((o) => selectedIds.includes(o.id)).map(getLabel);
  const displayText = selectedIds.length === 0
    ? label
    : selectedIds.length === 1
    ? selectedLabels[0]
    : `${selectedIds.length} selected`;
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm">
        <span className={selectedIds.length === 0 ? "text-muted-foreground truncate" : "truncate"}>
          {displayText}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-white dark:bg-zinc-900 shadow-md max-h-52 overflow-y-auto">
          {options.length === 0
            ? <p className="px-3 py-2 text-sm text-muted-foreground">No options.</p>
            : options.map((o) => (
              <button key={o.id} type="button" onClick={() => onToggle(o.id)}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left">
                <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${selectedIds.includes(o.id) ? "bg-primary border-primary" : "border-border"}`}>
                  {selectedIds.includes(o.id) && <Check className="h-3 w-3 text-primary-foreground" />}
                </div>
                <span>{getLabel(o)}</span>
                {getSubLabel && getSubLabel(o) && <span className="text-muted-foreground text-xs ml-auto">{getSubLabel(o)}</span>}
              </button>
            ))
          }
        </div>
      )}
    </div>
  );
}

function ClassFilterDropdown({ classes, visibleIds, onToggle }: {
  classes: any[]; visibleIds: Set<string>; onToggle: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const hiddenCount = classes.filter((c) => !visibleIds.has(c.id)).length;
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 h-9 px-3 rounded-md border text-sm font-medium transition-colors ${hiddenCount > 0 ? "border-primary bg-primary/5 text-primary" : "border-input bg-background text-foreground hover:bg-muted"}`}
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        <span>Filter</span>
        {hiddenCount > 0 && (
          <span className="ml-0.5 h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
            {hiddenCount}
          </span>
        )}
        <ChevronDown className={`h-3.5 w-3.5 opacity-50 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-1 w-56 rounded-md border border-border bg-white dark:bg-zinc-900 shadow-lg py-1">
          <div className="px-3 py-1.5 flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Show Classes</span>
            <button
              type="button"
              onClick={() => classes.forEach((c) => { if (!visibleIds.has(c.id)) onToggle(c.id); })}
              className="text-[11px] text-primary hover:underline"
            >
              All
            </button>
          </div>
          <div className="border-t border-border/50 mt-1" />
          {classes.map((c) => {
            const visible = visibleIds.has(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onToggle(c.id)}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent text-left"
              >
                <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${visible ? "border-primary bg-primary" : "border-border"}`}>
                  {visible && <Check className="h-3 w-3 text-primary-foreground" />}
                </div>
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color ?? "#6366f1" }} />
                <span className="truncate">{c.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const todayStr = () => new Date().toLocaleDateString("en-CA");

const emptyForm = () => ({
  classId: "", selectedDays: [] as number[], selectedCoachIds: [] as string[],
  startTime: "09:00", endTime: "10:00", location: "", maxCapacity: "",
  isRecurring: true, startDate: todayStr(), endDate: "", wholeDay: false,
});

function coachesForClass(employees: any[], classes: any[], classId: string): any[] {
  const cls = classes.find((c) => c.id === classId);
  const allowedServiceIds: string[] = cls?.allowedServices?.map((s: any) => s.serviceId) ?? [];
  return employees.filter((e) => {
    const types: string[] = e.employeeTypes?.length ? e.employeeTypes : [e.employeeType ?? "STAFF"];
    if (!types.includes("COACH")) return false;
    if (allowedServiceIds.length === 0) return true; // class open to all → show all coaches
    const taught: string[] = e.taughtServices?.map((ts: any) => ts.serviceId) ?? [];
    if (taught.length === 0) return true; // coach has no services set yet → still show them
    return allowedServiceIds.some((id) => taught.includes(id));
  });
}

export function ScheduleClient({ schedules, classes, employees, isAdmin, userRole, bookingCountMap = {}, checkInCountMap = {}, coachServiceIds = [] }: {
  schedules: any[]; classes: any[]; employees: any[]; isAdmin: boolean; userRole?: string; bookingCountMap?: Record<string, number>; checkInCountMap?: Record<string, number>; coachServiceIds?: string[];
}) {
  const canInteract = isAdmin || userRole === "STAFF";
  const PAYMENT_SUB: Record<string, string[]> = {
    "Bank Transfer": ["BDO", "BPI"],
    "eWallet": ["GCash", "Maya"],
  };
  const router = useRouter();
  const timeZone = useTenantTimezone();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Class visibility filter — for coaches show only classes where their service is allowed
  const [visibleClassIds, setVisibleClassIds] = useState<Set<string>>(() => {
    if (coachServiceIds.length > 0) {
      return new Set(
        classes
          .filter((c: any) => c.allowedServices?.some((as: any) => coachServiceIds.includes(as.serviceId)))
          .map((c: any) => c.id)
      );
    }
    const ids = new Set(classes.map((c: any) => c.id));
    classes.forEach((c: any) => {
      if (c.name.toLowerCase().includes("gym") && c.name.toLowerCase().includes("use")) ids.delete(c.id);
    });
    return ids;
  });
  function toggleClassVisibility(id: string) {
    setVisibleClassIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [editForm, setEditForm] = useState({
    classId: "", selectedCoachIds: [] as string[],
    startTime: "", endTime: "", location: "", maxCapacity: "",
  });
  const [deleteWarning, setDeleteWarning] = useState<{ count: number; className: string; athletes: string[] } | null>(null);
  const [deleteMode, setDeleteMode] = useState<"choose" | "this" | "succeeding" | null>(null);
  const [editSaveMode, setEditSaveMode] = useState<"choose" | null>(null);
  const [dialogMode, setDialogMode] = useState<"view" | "edit">("view");
  const [attendanceTaken, setAttendanceTaken] = useState(false);
  const [bookingCount, setBookingCount] = useState<number | null>(null);
  const [clickedDate, setClickedDate] = useState<Date | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [slotCheckIns, setSlotCheckIns] = useState<any[]>([]);
  const [removeBookingTarget, setRemoveBookingTarget] = useState<any | null>(null);
  const [attendanceUpdatingId, setAttendanceUpdatingId] = useState<string | null>(null);
  const [removingBookingId, setRemovingBookingId] = useState<string | null>(null);
  const [addSearch, setAddSearch] = useState("");
  const [addResults, setAddResults] = useState<any[]>([]);
  const [addSearching, setAddSearching] = useState(false);
  const [addingMember, setAddingMember] = useState<string | null>(null);
  const [assignPackageTarget, setAssignPackageTarget] = useState<any | null>(null);
  const [assignPackageServices, setAssignPackageServices] = useState<any[]>([]);
  const [loadingPackagesFor, setLoadingPackagesFor] = useState<string | null>(null);
  const addSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [guestDialog, setGuestDialog] = useState(false);
  const [guestForm, setGuestForm] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [guestLoading, setGuestLoading] = useState(false);
  // Employee paid-class assignment dialog
  const [empPayDialog, setEmpPayDialog] = useState(false);
  const [empPayEmployee, setEmpPayEmployee] = useState<any>(null);
  const [empPayServices, setEmpPayServices] = useState<any[]>([]);
  const [empPayServiceId, setEmpPayServiceId] = useState("");
  const [empPayPackageId, setEmpPayPackageId] = useState("");
  const [empPayMode, setEmpPayMode] = useState("");
  const [empPaySubMode, setEmpPaySubMode] = useState("");
  const [empPayPrice, setEmpPayPrice] = useState(0);
  const [empPayReceipt, setEmpPayReceipt] = useState<File | null>(null);
  const [empPayReceiptPreview, setEmpPayReceiptPreview] = useState<string | null>(null);
  const [empPayLoading, setEmpPayLoading] = useState(false);
  const empPayReceiptRef = useRef<HTMLInputElement>(null);
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [viewMode, setViewMode] = useState<"week" | "day">(coachServiceIds.length > 0 ? "day" : "week");
  const [dayView, setDayView] = useState(() => { const d = new Date(); d.setHours(0,0,0,0); return d; });
  const [liveBookings, setLiveBookings] = useState<Record<string, number>>(bookingCountMap);
  const [liveCheckIns, setLiveCheckIns] = useState<Record<string, number>>(checkInCountMap);

  useEffect(() => {
    const effectiveWeekStart = viewMode === "day"
      ? dayView.toLocaleDateString("en-CA")
      : weekStart.toLocaleDateString("en-CA");
    fetch(`/api/bookings/counts?weekStart=${effectiveWeekStart}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.bookings) setLiveBookings(data.bookings);
        if (data.checkIns) setLiveCheckIns(data.checkIns);
      })
      .catch(() => {});
  }, [weekStart, dayView, viewMode]);

  const weekDates = DAYS.map((d) => addDays(weekStart, d));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Current time in the tenant's timezone, expressed as total minutes since midnight
  const nowManilaMinutes = (() => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date());
    const h = Number(parts.find((p) => p.type === "hour")?.value ?? "0") % 24;
    const m = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
    return h * 60 + m;
  })();

  // Week label: "Jun 29 – Jul 5, 2026"
  const firstDate = weekDates[0];
  const lastDate = weekDates[6];
  const weekLabel = firstDate.getFullYear() === lastDate.getFullYear()
    ? `${MONTH_NAMES[firstDate.getMonth()]} ${firstDate.getDate()} – ${MONTH_NAMES[lastDate.getMonth()]} ${lastDate.getDate()}, ${lastDate.getFullYear()}`
    : `${MONTH_NAMES[firstDate.getMonth()]} ${firstDate.getDate()}, ${firstDate.getFullYear()} – ${MONTH_NAMES[lastDate.getMonth()]} ${lastDate.getDate()}, ${lastDate.getFullYear()}`;

  // Rebuilding this grouped-by-day-of-week index is the base input to every cell in
  // the grid below (getVisibleItems, layoutDay), so memoizing it avoids redoing that
  // work on renders triggered by unrelated local state (dialog open/close, search input).
  const weekGrid: Record<number, any[]> = useMemo(() => {
    const grid: Record<number, any[]> = {};
    for (const day of DAYS) grid[day] = [];
    for (const sched of schedules) grid[sched.dayOfWeek].push(sched);
    return grid;
  }, [schedules]);

  const classColorMap: Record<string, string> = {};
  classes.forEach((c, i) => { classColorMap[c.id] = c.color || DAY_COLORS[i % DAY_COLORS.length]; });

  const dayOptions = DAYS.map((d) => ({ id: String(d), label: DAY_NAMES_FULL[d] }));

  function copyItem(item: any) {
    setForm({
      classId: item.classId,
      selectedDays: [item.dayOfWeek],
      selectedCoachIds: (item.coaches ?? []).map((c: any) => c.employeeId),
      startTime: item.startTime,
      endTime: item.endTime,
      location: item.location ?? "",
      maxCapacity: item.maxCapacity ? String(item.maxCapacity) : "",
      isRecurring: item.isRecurring ?? true,
      startDate: new Date().toLocaleDateString("en-CA"),
      endDate: item.endDate ? new Date(item.endDate).toLocaleDateString("en-CA") : "",
      wholeDay: isWholeDay(item.startTime, item.endTime),
    });
    setShowAdd(true);
  }

  async function openEdit(item: any, date: Date) {
    setEditItem(item);
    setClickedDate(date);
    setDeleteMode(null);
    setDeleteWarning(null);
    setEditSaveMode(null);
    setDialogMode("view");
    setAttendanceTaken(false);
    setBookingCount(null);
    setBookings([]);
    setAttendance({});
    setSlotCheckIns([]);
    setEditForm({
      classId: item.classId,
      selectedCoachIds: (item.coaches ?? []).map((c: any) => c.employeeId),
      startTime: item.startTime,
      endTime: item.endTime,
      location: item.location ?? "",
      maxCapacity: item.maxCapacity ? String(item.maxCapacity) : "",
    });
    setAddSearch(""); setAddResults([]);
    // Fetch bookings and today's check-ins for this slot in parallel
    setBookingsLoading(true);
    Promise.all([
      fetch(`/api/bookings?scheduleId=${item.id}${date ? `&date=${date.toLocaleDateString("en-CA")}` : ""}`).then((r) => r.ok ? r.json() : []),
      fetch(`/api/checkins?scheduleId=${item.id}${date ? `&date=${date.toLocaleDateString("en-CA", { timeZone })}` : ""}`).then((r) => r.ok ? r.json() : []),
    ])
      .then(([bookingData, checkInData]) => {
        setBookings(bookingData);
        setBookingCount(bookingData.length);
        const initial: Record<string, boolean> = {};
        bookingData.forEach((b: any) => { initial[b.id] = b.status === "ATTENDED"; });
        setAttendance(initial);
        setSlotCheckIns(checkInData);
      })
      .catch(() => setBookingCount(0))
      .finally(() => setBookingsLoading(false));
  }

  async function addSchedule() {
    if (!form.classId) { toast({ variant: "destructive", title: "Select a class" }); return; }
    if (!form.startDate) { toast({ variant: "destructive", title: "Select a start date" }); return; }
    if (form.isRecurring && form.selectedDays.length === 0) { toast({ variant: "destructive", title: "Select at least one day" }); return; }
    setLoading(true);
    try {
      if (form.isRecurring) {
        // Create one schedule row per selected day
        await Promise.all(form.selectedDays.map((day) =>
          fetch("/api/schedules", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              classId: form.classId, dayOfWeek: day,
              startTime: form.startTime, endTime: form.endTime,
              location: form.location || undefined,
              maxCapacity: form.maxCapacity ? parseInt(form.maxCapacity) : undefined,
              coachIds: form.selectedCoachIds,
              isRecurring: true,
              startDate: form.startDate || undefined,
              endDate: form.endDate || undefined,
            }),
          }).then((r) => { if (!r.ok) throw new Error(); })
        ));
      } else {
        // One-time class: dayOfWeek derived from startDate, endDate = startDate
        const d = new Date(form.startDate);
        await fetch("/api/schedules", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            classId: form.classId, dayOfWeek: d.getDay(),
            startTime: form.startTime, endTime: form.endTime,
            location: form.location || undefined,
            maxCapacity: form.maxCapacity ? parseInt(form.maxCapacity) : undefined,
            coachIds: form.selectedCoachIds,
            isRecurring: false,
            startDate: form.startDate,
            endDate: form.startDate,
          }),
        }).then((r) => { if (!r.ok) throw new Error(); });
      }
      toast({ title: "Schedule added" });
      setShowAdd(false);
      setForm(emptyForm());
      router.refresh();
    } catch {
      toast({ variant: "destructive", title: "Error adding schedule" });
    } finally { setLoading(false); }
  }

  function handleAddSearch(q: string) {
    setAddSearch(q);
    if (addSearchTimer.current) clearTimeout(addSearchTimer.current);
    if (q.length < 2) { setAddResults([]); return; }
    setAddSearching(true);
    addSearchTimer.current = setTimeout(async () => {
      try {
        const [mRes, eRes] = await Promise.all([
          fetch(`/api/members?q=${encodeURIComponent(q)}`),
          fetch(`/api/employees?q=${encodeURIComponent(q)}`),
        ]);
        const [members, emps] = await Promise.all([mRes.json(), eRes.json()]);
        const memberResults = Array.isArray(members) ? members.map((m: any) => ({ ...m, _type: "member" })) : [];
        const empResults = Array.isArray(emps) ? emps.map((e: any) => ({ ...e, _type: "employee" })) : [];
        setAddResults([...memberResults, ...empResults].slice(0, 10));
      } catch { setAddResults([]); }
      finally { setAddSearching(false); }
    }, 300);
  }

  async function openAssignPackage(person: any) {
    setLoadingPackagesFor(person.id);
    try {
      if (assignPackageServices.length === 0) {
        const res = await fetch("/api/services?withPackages=true");
        const data = await res.json();
        setAssignPackageServices(Array.isArray(data) ? data : data.services ?? []);
      }
      setAssignPackageTarget({
        id: person.id,
        firstName: person.firstName,
        lastName: person.lastName,
        subscriptions: person.subscriptions ?? [],
      });
    } catch {
      toast({ variant: "destructive", title: "Could not load memberships", description: "Please try again." });
    } finally {
      setLoadingPackagesFor(null);
    }
  }

  function refreshCardCounts() {
    const effectiveWeekStart = viewMode === "day"
      ? dayView.toLocaleDateString("en-CA")
      : weekStart.toLocaleDateString("en-CA");
    fetch(`/api/bookings/counts?weekStart=${effectiveWeekStart}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.bookings) setLiveBookings(data.bookings);
        if (data.checkIns) setLiveCheckIns(data.checkIns);
      })
      .catch(() => {});
  }

  async function refreshBookings() {
    if (!editItem) return;
    const dateStr = clickedDate ? clickedDate.toLocaleDateString("en-CA") : "";
    const bRes = await fetch(`/api/bookings?scheduleId=${editItem.id}${dateStr ? `&date=${dateStr}` : ""}`);
    const bData = await bRes.json();
    setBookings(bData);
    setBookingCount(bData.length);
    const init: Record<string, boolean> = {};
    bData.forEach((b: any) => { init[b.id] = b.status === "ATTENDED"; });
    setAttendance(init);
    refreshCardCounts();
  }

  async function addAthleteToClass(person: any) {
    if (!editItem) return;
    if (person._type === "employee") {
      await handleEmployeeAdd(person);
      return;
    }
    setAddingMember(person.id);
    try {
      const sub = person.subscriptions?.[0];
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: person.id, sessionId: editItem.classId, scheduleId: editItem.id, subscriptionId: sub?.id ?? null, scheduledDate: clickedDate ? clickedDate.toLocaleDateString("en-CA") : null }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Failed"); }
      toast({ title: `${person.firstName} ${person.lastName} added to class` });
      setAddSearch(""); setAddResults([]);
      await refreshBookings();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally { setAddingMember(null); }
  }

  const PAID_CLASS_KEYWORDS = ["boxing", "yoga", "muay thai", "muaythai"];

  function isPaidClass(className: string) {
    const lower = className.toLowerCase();
    return PAID_CLASS_KEYWORDS.some((k) => lower.includes(k));
  }

  async function handleEmployeeAdd(employee: any) {
    if (!editItem) return;
    const className = editItem.classDef?.name ?? editItem.className ?? "";

    if (isPaidClass(className)) {
      // Open payment dialog — load "Employee Rate and Guests" service
      setEmpPayEmployee(employee);
      setEmpPayMode(""); setEmpPaySubMode(""); setEmpPayPackageId(""); setEmpPayPrice(0);
      setEmpPayReceipt(null); setEmpPayReceiptPreview(null);
      try {
        const res = await fetch("/api/services?withPackages=true");
        const data = await res.json();
        const empService = (Array.isArray(data) ? data : data.services ?? []).find(
          (s: any) => s.name?.toLowerCase().includes("employee rate")
        );
        if (empService) {
          setEmpPayServiceId(empService.id);
          setEmpPayServices([empService]);
          setEmpPayPackageId(empService.packages?.[0]?.id ?? "");
          const pkg = empService.packages?.[0];
          setEmpPayPrice(pkg?.memberPrice ?? pkg?.nonMemberPrice ?? 0);
        }
      } catch {}
      setEmpPayDialog(true);
    } else {
      // Free class — auto-assign ₱0 subscription and book
      setAddingMember(employee.id);
      try {
        // Find "Employee Rate and Guests" service and "Free" package
        const sRes = await fetch("/api/services?withPackages=true");
        const sData = await sRes.json();
        const empService = (Array.isArray(sData) ? sData : sData.services ?? []).find(
          (s: any) => s.name?.toLowerCase().includes("employee rate")
        );
        let subscriptionId: string | null = null;
        if (empService) {
          const freePkg = (empService.packages ?? []).find((p: any) => p.name?.toLowerCase() === "free");
          const subRes = await fetch("/api/subscriptions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              employeeId: employee.id,
              serviceId: empService.id,
              price: 0,
              sessionsTotal: freePkg?.sessions ?? 1,
              endDate: new Date(Date.now() + (freePkg?.validDays ?? 1) * 86400000).toISOString(),
              notes: `Auto-assigned for ${className} class`,
            }),
          });
          if (subRes.ok) {
            const sub = await subRes.json();
            subscriptionId = sub.id;
          }
        }
        const bRes = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ employeeId: employee.id, sessionId: editItem.classId, scheduleId: editItem.id, subscriptionId, scheduledDate: clickedDate ? clickedDate.toLocaleDateString("en-CA") : null }),
        });
        if (!bRes.ok) { const d = await bRes.json(); throw new Error(d.error ?? "Failed"); }
        toast({ title: `${employee.firstName} ${employee.lastName} added to class` });
        setAddSearch(""); setAddResults([]);
        await refreshBookings();
      } catch (err: any) {
        toast({ variant: "destructive", title: "Error", description: err.message });
      } finally { setAddingMember(null); }
    }
  }

  async function confirmEmpPayment() {
    if (!editItem || !empPayEmployee || !empPayMode || !empPayServiceId) return;
    if (PAYMENT_SUB[empPayMode] && !empPaySubMode) { toast({ variant: "destructive", title: "Select a payment sub-mode" }); return; }
    setEmpPayLoading(true);
    try {
      const service = empPayServices[0];
      const pkg = (service?.packages ?? []).find((p: any) => p.id === empPayPackageId);
      const fullPaymentMode = empPaySubMode ? `${empPayMode} - ${empPaySubMode}` : empPayMode;

      let receiptUrl: string | null = null;
      if (empPayReceipt) {
        const fd = new FormData();
        fd.append("file", empPayReceipt);
        fd.append("memberId", empPayEmployee.id);
        fd.append("lastName", empPayEmployee.lastName);
        fd.append("sport", service?.name ?? "Employee");
        fd.append("package", pkg?.name ?? "");
        fd.append("amount", String(empPayPrice));
        fd.append("paymentMethod", fullPaymentMode);
        const upRes = await fetch("/api/upload-receipt", { method: "POST", body: fd });
        if (upRes.ok) { const d = await upRes.json(); receiptUrl = d.link ?? null; }
      }

      const subRes = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: empPayEmployee.id,
          serviceId: empPayServiceId,
          price: empPayPrice,
          sessionsTotal: pkg?.sessions ?? 1,
          endDate: new Date(Date.now() + (pkg?.validDays ?? 1) * 86400000).toISOString(),
          paymentMethod: fullPaymentMode,
          notes: receiptUrl ? `Receipt: ${receiptUrl}` : undefined,
        }),
      });
      if (!subRes.ok) throw new Error("Failed to create subscription");
      const sub = await subRes.json();

      const bRes = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: empPayEmployee.id, sessionId: editItem.classId, scheduleId: editItem.id, subscriptionId: sub.id, scheduledDate: clickedDate ? clickedDate.toLocaleDateString("en-CA") : null }),
      });
      if (!bRes.ok) { const d = await bRes.json(); throw new Error(d.error ?? "Failed to book"); }

      toast({ title: `${empPayEmployee.firstName} ${empPayEmployee.lastName} added to class` });
      setEmpPayDialog(false);
      setAddSearch(""); setAddResults([]);
      await refreshBookings();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally { setEmpPayLoading(false); }
  }

  async function createGuestAndAdd() {
    if (!editItem || !guestForm.firstName || !guestForm.lastName) return;
    setGuestLoading(true);
    try {
      // Create inactive member
      const mRes = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: guestForm.firstName,
          lastName: guestForm.lastName,
          email: guestForm.email || undefined,
          phone: guestForm.phone || undefined,
          status: "INACTIVE",
        }),
      });
      if (!mRes.ok) { const d = await mRes.json(); throw new Error(d.error ?? "Failed to create guest"); }
      const newMember = await mRes.json();

      // Book them into the class
      const bRes = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: newMember.id, sessionId: editItem.classId, scheduleId: editItem.id, subscriptionId: null, scheduledDate: clickedDate ? clickedDate.toLocaleDateString("en-CA") : null }),
      });
      if (!bRes.ok) { const d = await bRes.json(); throw new Error(d.error ?? "Failed to book guest"); }

      toast({ title: `${guestForm.firstName} ${guestForm.lastName} enrolled as guest` });
      setGuestDialog(false);
      setGuestForm({ firstName: "", lastName: "", email: "", phone: "" });
      setAddSearch(""); setAddResults([]);
      await refreshBookings();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally { setGuestLoading(false); }
  }

  async function toggleAttendance(bookingId: string) {
    if (attendanceUpdatingId === bookingId) return;
    setAttendanceUpdatingId(bookingId);
    const next = !attendance[bookingId];
    setAttendance((prev) => ({ ...prev, [bookingId]: next }));
    try {
      await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next ? "ATTENDED" : "CONFIRMED" }),
      });
    } finally {
      setAttendanceUpdatingId(null);
    }
  }

  async function removeBooking(bookingId: string, returnSession: boolean) {
    if (removingBookingId === bookingId) return;
    setRemovingBookingId(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnSession }),
      });
      setRemoveBookingTarget(null);
      if (res.ok) {
        await refreshBookings();
      } else {
        const d = await res.json().catch(() => ({}));
        toast({ variant: "destructive", title: "Error", description: d.error ?? "Could not remove booking" });
      }
    } finally {
      setRemovingBookingId(null);
    }
  }

  function initiateRemoveBooking(b: any) {
    // ATTENDED bookings can no longer be removed at all — the server enforces this too.
    if (b.status === "ATTENDED") return;
    const wasDeducted = b.status === "NO_SHOW";
    const isLimited = b.subscription?.sessionsTotal != null;
    if (wasDeducted && isLimited) {
      setRemoveBookingTarget(b);
    } else {
      removeBooking(b.id, false);
    }
  }

  async function saveEdit(mode: "all" | "this" | "succeeding") {
    if (!editItem || !clickedDate) return;
    setLoading(true);
    // Never let edits reach into the past — use today as floor
    const effectiveDate = clickedDate.getTime() < today.getTime() ? today : clickedDate;
    const payload = {
      classId: editForm.classId,
      startTime: editForm.startTime, endTime: editForm.endTime,
      location: editForm.location || null,
      maxCapacity: editForm.maxCapacity ? parseInt(editForm.maxCapacity) : null,
      coachIds: editForm.selectedCoachIds,
    };
    try {
      if (mode === "all" || !editItem.isRecurring) {
        // Non-recurring or explicit "all" — just patch in place
        const res = await fetch(`/api/schedules/${editItem.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error();
        // Use the API response to immediately refresh editItem so coaches show without closing
        const updated = await res.json();
        setEditItem((prev: any) => ({ ...prev, ...updated }));
        setEditSaveMode(null);
        setDialogMode("view");
        setLoading(false);
        router.refresh();
        return;
      } else if (mode === "this") {
        // Create exception on original for this date, then create one-time override
        const dateStr = effectiveDate.toLocaleDateString("en-CA");
        const originalScheduleId = editItem.id;
        await fetch(`/api/schedules/${originalScheduleId}`, {
          method: "DELETE", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "this", date: dateStr, force: true }),
        });
        const newRes = await fetch("/api/schedules", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload, dayOfWeek: effectiveDate.getDay(),
            isRecurring: false, startDate: dateStr, endDate: dateStr,
          }),
        });
        if (newRes.ok) {
          const newSchedule = await newRes.json();
          // Transfer any existing bookings for this date from the original to the new override
          await fetch("/api/bookings", {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fromScheduleId: originalScheduleId, toScheduleId: newSchedule.id, date: dateStr }),
          });
        }
      } else if (mode === "succeeding") {
        // Cut original the day before effectiveDate, create new recurring from effectiveDate
        const dayBefore = new Date(effectiveDate);
        dayBefore.setDate(dayBefore.getDate() - 1);
        await fetch(`/api/schedules/${editItem.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endDate: dayBefore.toLocaleDateString("en-CA") }),
        });
        await fetch("/api/schedules", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload, dayOfWeek: editItem.dayOfWeek,
            isRecurring: true, startDate: effectiveDate.toLocaleDateString("en-CA"), endDate: null,
          }),
        });
      }
      toast({ title: "Schedule updated" });
      setEditSaveMode(null);
      setEditItem(null);
      router.refresh();
    } catch {
      toast({ variant: "destructive", title: "Error updating schedule" });
    } finally { setLoading(false); }
  }

  async function deleteSchedule(mode: "this" | "succeeding", force = false) {
    if (!editItem) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/schedules/${editItem.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          date: clickedDate?.toLocaleDateString("en-CA"),
          force,
        }),
      });
      if (res.status === 400) {
        const data = await res.json();
        toast({ variant: "destructive", title: data.error ?? "Cannot delete past sessions." });
        setDeleteMode(null);
        setLoading(false);
        return;
      }
      if (res.status === 409) {
        const data = await res.json();
        setDeleteWarning({ count: data.count, className: data.className, athletes: data.athletes });
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error();
      const msg = mode === "this" ? "Session cancelled for this date" : "Schedule ended from this date forward";
      toast({ title: msg });
      setDeleteWarning(null);
      setDeleteMode(null);
      setEditItem(null);
      router.refresh();
    } catch {
      toast({ variant: "destructive", title: "Error updating schedule" });
    } finally { setLoading(false); }
  }

  // totalHeight and hours are computed per-view below using effective hour ranges

  // Day view helpers
  const dayViewDow = dayView.getDay();
  const dayLabel = dayView.toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const isViewToday = dayView.getTime() === today.getTime();

  function getVisibleItems(cellMidnight: Date, dow: number) {
    return weekGrid[dow].filter((item: any) => {
      if (!visibleClassIds.has(item.classId)) return false;
      const sd = item.startDate ? new Date(item.startDate) : null;
      const ed = item.endDate ? new Date(item.endDate) : null;
      if (sd) { sd.setHours(0,0,0,0); if (cellMidnight < sd) return false; }
      if (ed) { ed.setHours(0,0,0,0); if (cellMidnight > ed) return false; }
      if (!item.isRecurring) {
        return sd !== null && cellMidnight.getTime() === sd.getTime();
      }
      const hasException = (item.exceptions ?? []).some((ex: any) => {
        const exDate = new Date(ex.date); exDate.setHours(0,0,0,0);
        return exDate.getTime() === cellMidnight.getTime();
      });
      return !hasException;
    });
  }

  if (!mounted) return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="h-8 w-48 rounded bg-muted animate-pulse" />
        <div className="h-9 w-64 rounded bg-muted animate-pulse" />
      </div>
      <div className="rounded-md border h-[600px] bg-muted/20 animate-pulse" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Schedule</h1>
          <p className="text-muted-foreground text-sm">{viewMode === "day" ? dayLabel : weekLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => {
            if (viewMode === "week") setWeekStart(w => addDays(w, -7));
            else setDayView(d => addDays(d, -1));
          }}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            if (viewMode === "week") setWeekStart(getWeekStart(new Date()));
            else setDayView(() => { const d = new Date(); d.setHours(0,0,0,0); return d; });
          }}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => {
            if (viewMode === "week") setWeekStart(w => addDays(w, 7));
            else setDayView(d => addDays(d, 1));
          }}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {/* View toggle */}
          <div className="flex rounded-md border overflow-hidden">
            <button
              type="button"
              title="Week View"
              onClick={() => setViewMode("week")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${viewMode === "week" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Week</span>
            </button>
            <button
              type="button"
              title="Day View"
              onClick={() => { setViewMode("day"); setDayView(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors border-l ${viewMode === "day" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Day</span>
            </button>
          </div>
          <ClassFilterDropdown
            classes={[...classes].sort((a, b) => a.name.localeCompare(b.name))}
            visibleIds={visibleClassIds}
            onToggle={toggleClassVisibility}
          />
          {isAdmin && (
            <Button onClick={() => setShowAdd(true)}>
              <Plus className="mr-2 h-4 w-4" />Add Class
            </Button>
          )}
        </div>
      </div>

      {/* ── DAY VIEW ── */}
      {viewMode === "day" && (() => {
        const cellMidnight = new Date(dayView); cellMidnight.setHours(0,0,0,0);
        const visibleItems = getVisibleItems(cellMidnight, dayViewDow);
        const wholeDayItems = visibleItems.filter((item: any) => isWholeDay(item.startTime, item.endTime));
        const timedItems = visibleItems.filter((item: any) => !isWholeDay(item.startTime, item.endTime));
        const laid = layoutDay(timedItems);
        const isPast = cellMidnight < today;
        const { startHour: effStart, endHour: effEnd } = computeVisibleHourRange(timedItems);
        const totalHeight = (effEnd - effStart) * HOUR_PX;
        const hours = Array.from({ length: effEnd - effStart }, (_, i) => effStart + i);
        return (
          <div className="rounded-md border overflow-hidden">
            {/* Header */}
            <div className="flex border-b">
              <div className="w-14 shrink-0" />
              <div className="flex-1 py-3 text-center border-l">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{DAY_NAMES[dayViewDow]}</p>
                <p className={`text-lg font-bold mt-0.5 w-9 h-9 flex items-center justify-center rounded-full mx-auto ${isViewToday ? "bg-primary text-primary-foreground" : "text-foreground"}`}>
                  {dayView.getDate()}
                </p>
                {wholeDayItems.length > 0 && (
                  <div className="mt-1.5 px-2 flex flex-wrap gap-1 justify-center">
                    {wholeDayItems.map((item: any) => (
                      <div
                        key={item.id}
                        className={`rounded px-2 py-0.5 text-white text-[11px] font-medium truncate max-w-full ${canInteract ? "cursor-pointer hover:brightness-110 transition-[filter]" : ""} ${isPast ? "opacity-50" : ""}`}
                        style={{ backgroundColor: classColorMap[item.classId] ?? "#3b82f6" }}
                        onClick={() => canInteract && openEdit(item, dayView)}
                      >
                        {item.classDef?.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {/* Grid */}
            {effStart > START_HOUR && <CollapsedTimeBanner fromHour={START_HOUR} toHour={effStart} />}
            <div className="flex">
              <div className="w-14 shrink-0 relative" style={{ height: totalHeight }}>
                {hours.map((h) => (
                  <div key={h} className="absolute right-2 text-[10px] text-muted-foreground" style={{ top: (h - effStart) * HOUR_PX - 7 }}>
                    {h % 12 || 12}{h < 12 ? "am" : "pm"}
                  </div>
                ))}
              </div>
              <div className="flex-1 border-l relative" style={{ height: totalHeight }}>
                {hours.map((h) => (
                  <div key={h} className="absolute left-0 right-0 border-t border-border/40" style={{ top: (h - effStart) * HOUR_PX }} />
                ))}
                {hours.map((h) => (
                  <div key={`${h}h`} className="absolute left-0 right-0 border-t border-border/20" style={{ top: (h - effStart) * HOUR_PX + HOUR_PX / 2 }} />
                ))}
                {laid.map(({ item, col, totalCols }) => {
                  const startMin = timeToMinutes(item.startTime);
                  const endMin = timeToMinutes(item.endTime);
                  const top = ((startMin / 60) - effStart) * HOUR_PX;
                  const height = Math.max(((endMin - startMin) / 60) * HOUR_PX, 24);
                  const widthPct = 100 / totalCols;
                  const leftPct = col * widthPct;
                  const color = classColorMap[item.classId] ?? "#3b82f6";
                  const coaches = (item.coaches ?? []).map((c: any) => `${c.employee?.firstName ?? ""} ${c.employee?.lastName ?? ""}`.trim()).join(", ");
                  const isViewToday2 = cellMidnight.getTime() === today.getTime();
                  const isCardPast = isPast || (isViewToday2 && endMin <= nowManilaMinutes);
                  return (
                    <div key={item.id}
                      className={`absolute rounded text-white overflow-hidden group ${canInteract ? "cursor-pointer hover:brightness-110 active:brightness-90 transition-[filter]" : ""} ${isCardPast ? "opacity-50" : ""}`}
                      style={{ top, height, left: `calc(${leftPct}% + 3px)`, width: `calc(${widthPct}% - 6px)`, backgroundColor: color }}
                      onClick={() => canInteract && openEdit(item, dayView)}
                    >
                      <div className="p-2 h-full flex flex-col gap-0.5">
                        <div className="flex items-start justify-between gap-1">
                          <p className="font-bold text-sm leading-tight">{item.classDef?.name}</p>
                          {isAdmin && (
                            <button
                              type="button"
                              title="Copy to new slot"
                              onClick={(e) => { e.stopPropagation(); copyItem(item); }}
                              className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity rounded p-0.5 hover:bg-white/20"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                        <p className="text-xs opacity-90">{isWholeDay(item.startTime, item.endTime) ? "Whole Day" : `${formatTime(item.startTime)} – ${formatTime(item.endTime)}`}</p>
                        {item.location && height > 50 && <p className="text-xs opacity-75">{item.location}</p>}
                        {coaches && height > 70 && <p className="text-xs opacity-75 truncate">{coaches}</p>}
                        {height > 56 && (() => {
                          const total = (liveBookings[item.id] ?? 0) + (liveCheckIns[item.id] ?? 0);
                          const max = item.maxCapacity;
                          if (!total && !max) return null;
                          const isFull = max && total >= max;
                          return <p className={`text-xs font-semibold ${isFull ? "opacity-100 text-yellow-200" : "opacity-80"}`}>{total}{max ? `/${max}` : ""} attending</p>;
                        })()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {effEnd < END_HOUR && <CollapsedTimeBanner fromHour={effEnd} toHour={END_HOUR + 1} />}
          </div>
        );
      })()}

      {/* ── WEEK VIEW ── */}
      {viewMode === "week" && (() => {
        const allWeekTimed = DAYS.flatMap((day) => {
          const cellMidnight = new Date(weekDates[day]); cellMidnight.setHours(0,0,0,0);
          return getVisibleItems(cellMidnight, day).filter((i: any) => !isWholeDay(i.startTime, i.endTime));
        });
        const { startHour: effStart, endHour: effEnd } = computeVisibleHourRange(allWeekTimed);
        const totalHeight = (effEnd - effStart) * HOUR_PX;
        const hours = Array.from({ length: effEnd - effStart }, (_, i) => effStart + i);
        return (
      <div className="overflow-x-auto rounded-md border">
        <div className="min-w-[700px]">
          <div className="flex border-b">
            <div className="w-14 shrink-0" />
            {DAYS.map((day) => {
              const date = weekDates[day];
              const isToday = date.getTime() === today.getTime();
              const cellMidnight = new Date(date); cellMidnight.setHours(0,0,0,0);
              const isPastCol = cellMidnight < today;
              const wdItems = getVisibleItems(cellMidnight, day).filter((item: any) => isWholeDay(item.startTime, item.endTime));
              return (
                <div key={day} className="flex-1 py-2 text-center border-l">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{DAY_NAMES[day]}</p>
                  <p className={`text-sm font-bold mt-0.5 w-7 h-7 flex items-center justify-center rounded-full mx-auto ${isToday ? "bg-primary text-primary-foreground" : "text-foreground"}`}>
                    {date.getDate()}
                  </p>
                  {wdItems.length > 0 && (
                    <div className="mt-1 px-1 space-y-0.5">
                      {wdItems.map((item: any) => (
                        <div
                          key={item.id}
                          className={`rounded px-1 py-0.5 text-white text-[9px] font-medium truncate ${canInteract ? "cursor-pointer hover:brightness-110 transition-[filter]" : ""} ${isPastCol ? "opacity-50" : ""}`}
                          style={{ backgroundColor: classColorMap[item.classId] ?? "#3b82f6" }}
                          onClick={() => canInteract && openEdit(item, date)}
                        >
                          {item.classDef?.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {effStart > START_HOUR && <CollapsedTimeBanner fromHour={START_HOUR} toHour={effStart} cols={7} />}
          <div className="flex">
            <div className="w-14 shrink-0 relative" style={{ height: totalHeight }}>
              {hours.map((h) => (
                <div key={h} className="absolute right-2 text-[10px] text-muted-foreground" style={{ top: (h - effStart) * HOUR_PX - 7 }}>
                  {h % 12 || 12}{h < 12 ? "am" : "pm"}
                </div>
              ))}
            </div>

            {DAYS.map((day) => {
              const cellDate = weekDates[day];
              const cellMidnight = new Date(cellDate); cellMidnight.setHours(0,0,0,0);
              const visibleItems = getVisibleItems(cellMidnight, day);
              const timedItems = visibleItems.filter((item: any) => !isWholeDay(item.startTime, item.endTime));
              const laid = layoutDay(timedItems);
              const isPast = cellMidnight < today;

              return (
                <div key={day} className="flex-1 border-l relative" style={{ height: totalHeight }}>
                  {hours.map((h) => (
                    <div key={h} className="absolute left-0 right-0 border-t border-border/40" style={{ top: (h - effStart) * HOUR_PX }} />
                  ))}
                  {hours.map((h) => (
                    <div key={`${h}h`} className="absolute left-0 right-0 border-t border-border/20" style={{ top: (h - effStart) * HOUR_PX + HOUR_PX / 2 }} />
                  ))}
                  {laid.map(({ item, col, totalCols }) => {
                    const startMin = timeToMinutes(item.startTime);
                    const endMin = timeToMinutes(item.endTime);
                    const top = ((startMin / 60) - effStart) * HOUR_PX;
                    const height = Math.max(((endMin - startMin) / 60) * HOUR_PX, 20);
                    const widthPct = 100 / totalCols;
                    const leftPct = col * widthPct;
                    const color = classColorMap[item.classId] ?? "#3b82f6";
                    const isToday = cellMidnight.getTime() === today.getTime();
                    const isCardPast = isPast || (isToday && endMin <= nowManilaMinutes);
                    return (
                      <div key={item.id}
                        className={`absolute rounded text-white text-[10px] overflow-hidden group ${canInteract ? "cursor-pointer hover:brightness-110 active:brightness-90 transition-[filter]" : ""} ${isCardPast ? "opacity-50" : ""}`}
                        style={{ top, height, left: `calc(${leftPct}% + 2px)`, width: `calc(${widthPct}% - 4px)`, backgroundColor: color }}
                        onClick={() => canInteract && openEdit(item, cellDate)}
                      >
                        <div className="p-1 h-full flex flex-col">
                          <div className="flex items-start justify-between gap-0.5">
                            <p className="font-semibold truncate leading-tight">{item.classDef?.name}</p>
                            {isAdmin && (
                              <button
                                type="button"
                                title="Copy to new slot"
                                onClick={(e) => { e.stopPropagation(); copyItem(item); }}
                                className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity rounded p-0.5 hover:bg-white/20"
                              >
                                <Copy className="h-2.5 w-2.5" />
                              </button>
                            )}
                          </div>
                          <p className="opacity-90 truncate leading-tight">{isWholeDay(item.startTime, item.endTime) ? "Whole Day" : `${formatTime(item.startTime)} – ${formatTime(item.endTime)}`}</p>
                          {item.location && height > 40 && <p className="opacity-75 truncate leading-tight">{item.location}</p>}
                          {height > 48 && (() => {
                            const total = (liveBookings[item.id] ?? 0) + (liveCheckIns[item.id] ?? 0);
                            const max = item.maxCapacity;
                            if (!total && !max) return null;
                            const isFull = max && total >= max;
                            return <p className={`text-[9px] font-semibold leading-tight ${isFull ? "text-yellow-200" : "opacity-80"}`}>{total}{max ? `/${max}` : ""} attending</p>;
                          })()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
          {effEnd < END_HOUR && <CollapsedTimeBanner fromHour={effEnd} toHour={END_HOUR + 1} cols={7} />}
        </div>
      </div>
        );
      })()}

      {/* Add dialog */}
      <Dialog open={showAdd} onOpenChange={(o) => !o && setShowAdd(false)}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Class to Schedule</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Class</Label>
              <Select value={form.classId || undefined} onValueChange={(v) => { const cls = classes.find((c) => c.id === v); setForm((f) => ({ ...f, classId: v, location: cls?.location ?? f.location })); }}>
                <SelectTrigger><SelectValue placeholder="Select class..." /></SelectTrigger>
                <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* Recurring toggle */}
            <div className="flex rounded-lg border overflow-hidden text-sm">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, isRecurring: true, endDate: "" }))}
                className={`flex-1 py-2 font-medium transition-colors ${form.isRecurring ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
              >
                Recurring
              </button>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, isRecurring: false, selectedDays: [], endDate: "" }))}
                className={`flex-1 py-2 font-medium transition-colors ${!form.isRecurring ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
              >
                One-time
              </button>
            </div>

            {/* Dates */}
            {form.isRecurring ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Start Date</Label>
                  <Input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>End Date <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <Label>Date</Label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
              </div>
            )}

            {/* Days — only for recurring */}
            {form.isRecurring && (
              <div className="space-y-1">
                <Label>Days</Label>
                <MultiCheckDropdown
                  label="Select days..." options={DAYS.map((d) => ({ id: String(d) }))}
                  selectedIds={form.selectedDays.map(String)}
                  onToggle={(id) => { const d = parseInt(id); setForm((f) => ({ ...f, selectedDays: f.selectedDays.includes(d) ? f.selectedDays.filter((x) => x !== d) : [...f.selectedDays, d] })); }}
                  getLabel={(o) => DAY_NAMES_FULL[parseInt(o.id)]}
                />
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  id="wholeDay"
                  type="checkbox"
                  checked={form.wholeDay}
                  onChange={(e) => setForm((f) => ({
                    ...f,
                    wholeDay: e.target.checked,
                    startTime: e.target.checked ? "00:00" : "09:00",
                    endTime: e.target.checked ? "23:59" : "10:00",
                  }))}
                  className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                />
                <label htmlFor="wholeDay" className="text-sm font-medium cursor-pointer select-none">
                  Whole Day <span className="text-muted-foreground font-normal">(athletes can come in anytime)</span>
                </label>
              </div>
              <div className={`grid grid-cols-2 gap-3 transition-opacity ${form.wholeDay ? "opacity-40 pointer-events-none" : ""}`}>
                <div className="space-y-1"><Label>Start Time</Label><Input type="time" value={form.startTime} disabled={form.wholeDay} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} /></div>
                <div className="space-y-1"><Label>End Time</Label><Input type="time" value={form.endTime} disabled={form.wholeDay} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} /></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Location</Label>
                <LocationSelect
                  value={form.location}
                  onChange={(v) => setForm((f) => ({ ...f, location: v }))}
                  canManage={isAdmin}
                />
              </div>
              <div className="space-y-1"><Label>Max Members</Label><Input type="number" placeholder="e.g. 20" value={form.maxCapacity} onChange={(e) => setForm((f) => ({ ...f, maxCapacity: e.target.value }))} /></div>
            </div>
            <div className="space-y-1">
              <Label>Coach(es)</Label>
              <MultiCheckDropdown
                label="Select coaches..."
                options={coachesForClass(employees, classes, form.classId)}
                selectedIds={form.selectedCoachIds}
                onToggle={(id) => setForm((f) => ({ ...f, selectedCoachIds: f.selectedCoachIds.includes(id) ? f.selectedCoachIds.filter((x) => x !== id) : [...f.selectedCoachIds, id] }))}
                getLabel={(e) => `${e.firstName} ${e.lastName}`}
                getSubLabel={(e) => e.title}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={addSchedule} disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editItem} onOpenChange={(o) => { if (!o) { setEditItem(null); setDeleteWarning(null); setDeleteMode(null); setEditSaveMode(null); setDialogMode("view"); setBookings([]); setAttendance({}); setSlotCheckIns([]); setAddSearch(""); setAddResults([]); } }}>
        <DialogContent className="max-w-[80vw] w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {deleteMode === "choose" ? "Delete Session"
                : deleteWarning ? "Confirm Delete"
                : editSaveMode === "choose" ? "Apply Changes To"
                : editItem?.classDef?.name ?? "Class Details"}
            </DialogTitle>
          </DialogHeader>

          {/* Step 1: Choose delete scope */}
          {deleteMode === "choose" && !deleteWarning && (() => {
            const isPast = clickedDate ? new Date(clickedDate).setHours(0,0,0,0) < today.getTime() : false;
            if (isPast) return (
              <div className="space-y-4 py-1">
                <div className="rounded-md border border-muted bg-muted/30 p-3 text-sm text-muted-foreground">
                  Past sessions cannot be deleted.
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDeleteMode(null)}>Go Back</Button>
                </DialogFooter>
              </div>
            );
            return (
              <div className="space-y-3 py-1">
                <p className="text-sm text-muted-foreground">What would you like to delete?</p>
                <div className="space-y-2">
                  <button
                    onClick={() => { setDeleteMode("this"); deleteSchedule("this"); }}
                    className="w-full flex items-start gap-3 rounded-lg border p-3 text-left hover:bg-muted/50 transition-colors"
                  >
                    <CalendarX className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Just this session</p>
                      <p className="text-xs text-muted-foreground">Cancel only {clickedDate?.toLocaleDateString("en-PH", { weekday: "long", month: "short", day: "numeric" })}</p>
                    </div>
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => { setDeleteMode("succeeding"); deleteSchedule("succeeding"); }}
                      className="w-full flex items-start gap-3 rounded-lg border p-3 text-left hover:bg-muted/50 transition-colors"
                    >
                      <CalendarRange className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">This and all succeeding sessions</p>
                        <p className="text-xs text-muted-foreground">Remove from {clickedDate?.toLocaleDateString("en-PH", { weekday: "long", month: "short", day: "numeric" })} onward</p>
                      </div>
                    </button>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDeleteMode(null)}>Cancel</Button>
                </DialogFooter>
              </div>
            );
          })()}

          {/* Step 2: Booking warning */}
          {deleteWarning && (
            <div className="space-y-4 py-1">
              <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 space-y-2 text-sm">
                <p className="font-semibold text-destructive">⚠ Active bookings exist</p>
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">{deleteWarning.count} athlete{deleteWarning.count !== 1 ? "s" : ""}</span> are currently booked in <span className="font-medium text-foreground">{deleteWarning.className}</span>:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                  {deleteWarning.athletes.slice(0, 10).map((name, i) => <li key={i}>{name}</li>)}
                  {deleteWarning.athletes.length > 10 && <li>…and {deleteWarning.athletes.length - 10} more</li>}
                </ul>
                <p className="font-medium text-destructive pt-1">Their bookings will not be automatically cancelled. Are you sure?</p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setDeleteWarning(null); setDeleteMode("choose"); }}>Go Back</Button>
                <Button variant="destructive" onClick={() => deleteSchedule(deleteMode as "this" | "succeeding", true)} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Yes, Delete Anyway
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* Save scope picker */}
          {!deleteMode && !deleteWarning && editSaveMode === "choose" && (() => {
            const isPast = clickedDate ? clickedDate.getTime() < today.getTime() : false;
            const effectiveDate = isPast ? today : clickedDate!;
            const effectiveLabel = effectiveDate.toLocaleDateString("en-PH", { weekday: "long", month: "short", day: "numeric" });
            return (
              <div className="space-y-3 py-1">
                <p className="text-sm text-muted-foreground">Apply these changes to:</p>
                {isPast && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-3 py-2 text-xs text-amber-800 dark:text-amber-400">
                    Changes cannot be applied to past sessions. They will take effect from today onward.
                  </div>
                )}
                <div className="space-y-2">
                  <button
                    onClick={() => !isPast && saveEdit("this")}
                    disabled={loading || isPast}
                    className="w-full flex items-start gap-3 rounded-lg border p-3 text-left hover:bg-muted/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <CalendarX className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Just this session</p>
                      <p className="text-xs text-muted-foreground">
                        {isPast ? "Cannot edit past sessions" : `Only ${effectiveLabel}`}
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={() => saveEdit("succeeding")}
                    disabled={loading}
                    className="w-full flex items-start gap-3 rounded-lg border p-3 text-left hover:bg-muted/50 transition-colors disabled:opacity-50"
                  >
                    <CalendarRange className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">This and all succeeding sessions</p>
                      <p className="text-xs text-muted-foreground">From {effectiveLabel} onward</p>
                    </div>
                  </button>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditSaveMode(null)} disabled={loading}>Go Back</Button>
                </DialogFooter>
              </div>
            );
          })()}

          {/* View/attendance mode */}
          {!deleteMode && !deleteWarning && !editSaveMode && dialogMode === "view" && (
            <div className="space-y-5">
              {/* Class details */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 rounded-lg border bg-muted/30 p-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase w-16 shrink-0">Time</span>
                  <span>{formatTime(editItem?.startTime)} – {formatTime(editItem?.endTime)}</span>
                </div>
                {editItem?.location && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase w-16 shrink-0">Location</span>
                    <span>{editItem.location}</span>
                  </div>
                )}
                {editItem?.maxCapacity && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase w-16 shrink-0">Max</span>
                    <span>{editItem.maxCapacity} athletes</span>
                  </div>
                )}
                {editItem?.coaches?.length > 0 && (
                  <div className="flex items-start gap-2 col-span-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase w-16 shrink-0 mt-0.5">Coach</span>
                    <span>{editItem.coaches.map((c: any) => `${c.employee?.firstName ?? ""} ${c.employee?.lastName ?? ""}`.trim()).join(", ")}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Attendance list */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Attendance ({bookings.length + slotCheckIns.length})
                  </p>
                  {bookingsLoading ? (
                    <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />Loading…
                    </div>
                  ) : bookings.length === 0 && slotCheckIns.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">No athletes for this class yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                      {/* Assigned coaches */}
                      {(editItem?.coaches ?? []).map((c: any) => {
                        const firstName = c.employee?.firstName ?? "";
                        const lastName = c.employee?.lastName ?? "";
                        const photoUrl = c.employee?.photoUrl;
                        return (
                          <div key={c.employeeId} className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 p-3">
                            <Avatar className="h-10 w-10 shrink-0">
                              <AvatarImage src={photoUrl ?? ""} />
                              <AvatarFallback className="text-xs">{getInitials(`${firstName} ${lastName}`)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="font-medium text-sm leading-tight">{firstName} {lastName}</p>
                                <span className="inline-flex rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-1.5 py-0.5 text-[9px] font-semibold">Coach</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {/* Walk-in check-ins */}
                      {slotCheckIns.map((ci: any) => (
                        <div key={ci.id} className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30 p-3">
                          <Avatar className="h-10 w-10 shrink-0">
                            <AvatarImage src={ci.member?.photoUrl ?? ""} />
                            <AvatarFallback className="text-xs">{getInitials(`${ci.member?.firstName ?? ""} ${ci.member?.lastName ?? ""}`)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm leading-tight">{ci.member?.firstName} {ci.member?.lastName}</p>
                            {ci.member?.memberNumber && <span className="text-[10px] font-mono text-muted-foreground">{ci.member.memberNumber}</span>}
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                              <CheckCircle2 className="h-3 w-3" />Attended
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(ci.checkedInAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                            </span>
                          </div>
                        </div>
                      ))}
                      {/* Booked athletes */}
                      {bookings.map((b: any) => {
                        const checked = !!attendance[b.id];
                        const subs: any[] = b.member?.subscriptions ?? [];
                        const isEmp = !!b.employee;
                        const firstName = isEmp ? b.employee.firstName : b.member?.firstName ?? "";
                        const lastName = isEmp ? b.employee.lastName : b.member?.lastName ?? "";
                        const photoUrl = isEmp ? b.employee.photoUrl : b.member?.photoUrl;
                        return (
                          <div key={b.id} className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${checked ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30" : ""}`}>
                            <Avatar className="h-10 w-10 shrink-0">
                              <AvatarImage src={photoUrl ?? ""} />
                              <AvatarFallback className="text-xs">{getInitials(`${firstName} ${lastName}`)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="font-medium text-sm leading-tight">{firstName} {lastName}</p>
                                {isEmp && <span className="inline-flex rounded-full bg-violet-100 text-violet-700 px-1.5 py-0.5 text-[9px] font-semibold">Staff</span>}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                {b.member?.memberNumber && <span className="text-[10px] font-mono text-muted-foreground">#{b.member.memberNumber}</span>}
                                {subs.map((s: any) => (
                                  <span key={s.id} className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white" style={{ backgroundColor: s.service?.color }}>
                                    {s.service?.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {!isEmp && canInteract && b.status !== "ATTENDED" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  title="Remove booking"
                                  disabled={removingBookingId === b.id}
                                  onClick={() => initiateRemoveBooking(b)}
                                >
                                  {removingBookingId === b.id
                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                    : <XIcon className="h-4 w-4" />}
                                </Button>
                              )}
                              {b.status === "NO_SHOW" ? (
                                <span className="inline-flex items-center rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 text-[10px] font-semibold">
                                  No Show
                                </span>
                              ) : (
                                <Button
                                  size="sm"
                                  variant={checked ? "default" : "outline"}
                                  className={`shrink-0 text-xs ${checked ? "bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white" : ""}`}
                                  disabled={attendanceUpdatingId === b.id}
                                  onClick={() => toggleAttendance(b.id)}
                                >
                                  {attendanceUpdatingId === b.id
                                    ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                                    : checked
                                    ? <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                    : null}
                                  {checked ? "Attended" : "Check In"}
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Add athlete */}
                {canInteract && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <UserPlus className="h-3.5 w-3.5" />Add Athlete
                    </p>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search athlete by name..."
                        value={addSearch}
                        onChange={(e) => handleAddSearch(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm pl-9 pr-8 focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      {addSearch && (
                        <button onClick={() => { setAddSearch(""); setAddResults([]); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          <XIcon className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {addSearching && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                    </div>
                    {addResults.length > 0 && (() => {
                      const currentClass = classes.find((c: any) => c.id === editItem?.classId);
                      const allowedServiceIds: string[] = currentClass?.allowedServices?.map((s: any) => s.serviceId) ?? [];
                      return (
                        <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
                          {addResults.map((person: any) => {
                            const isEmployee = person._type === "employee";
                            const alreadyBooked = isEmployee
                              ? bookings.some((b: any) => b.employee?.id === person.id)
                              : bookings.some((b: any) => b.member?.id === person.id);
                            const memberServiceIds = (person.subscriptions ?? []).map((s: any) => s.service?.id).filter(Boolean);
                            const hasPackage = isEmployee || allowedServiceIds.length === 0 || allowedServiceIds.some((id: string) => memberServiceIds.includes(id));
                            const className = editItem?.classDef?.name ?? editItem?.className ?? "";
                            const needsPayment = isEmployee && isPaidClass(className);
                            return (
                              <div key={person.id} className="flex items-center gap-2.5 rounded-lg border p-2.5">
                                <Avatar className="h-9 w-9 shrink-0">
                                  <AvatarImage src={person.photoUrl ?? ""} />
                                  <AvatarFallback className="text-xs">{getInitials(`${person.firstName} ${person.lastName}`)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-sm font-medium leading-tight">{person.firstName} {person.lastName}</p>
                                    {isEmployee && (
                                      <span className="inline-flex rounded-full bg-violet-100 text-violet-700 px-1.5 py-0.5 text-[9px] font-semibold">Staff</span>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-1 mt-0.5">
                                    {isEmployee ? (
                                      <span className="text-[10px] text-muted-foreground">
                                        {needsPayment ? "Requires Employee Rate package" : "Free class — auto-assigned"}
                                      </span>
                                    ) : (person.subscriptions ?? []).length === 0 ? (
                                      <span className="text-[10px] text-muted-foreground">No active subscription</span>
                                    ) : (
                                      (person.subscriptions ?? []).map((s: any) => (
                                        <span key={s.id} className="inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-medium text-white" style={{ backgroundColor: s.service?.color }}>
                                          {s.service?.name}
                                        </span>
                                      ))
                                    )}
                                  </div>
                                </div>
                                {alreadyBooked ? (
                                  <span className="text-[10px] text-muted-foreground shrink-0">Already booked</span>
                                ) : !hasPackage ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="shrink-0 text-xs h-7 border-destructive/50 text-destructive hover:bg-destructive/5"
                                    disabled={loadingPackagesFor === person.id}
                                    onClick={() => openAssignPackage(person)}
                                  >
                                    {loadingPackagesFor === person.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Get Package"}
                                  </Button>
                                ) : (
                                  <Button size="sm" className="shrink-0 text-xs h-7" disabled={addingMember === person.id} onClick={() => addAthleteToClass(person)}>
                                    {addingMember === person.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : needsPayment ? "Assign" : "Add"}
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                    {addSearch.length >= 2 && !addSearching && addResults.length === 0 && (
                      <div className="py-2 space-y-2">
                        <p className="text-sm text-muted-foreground">No athletes found.</p>
                        <button
                          type="button"
                          onClick={() => { setGuestForm((f) => ({ ...f, firstName: addSearch.split(" ")[0] ?? "", lastName: addSearch.split(" ").slice(1).join(" ") ?? "" })); setGuestDialog(true); }}
                          className="flex items-center gap-2 w-full rounded-lg border border-dashed border-primary/50 p-2.5 text-sm text-primary hover:bg-primary/5 transition-colors"
                        >
                          <UserPlus className="h-4 w-4 shrink-0" />
                          Enroll "{addSearch}" as a guest
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <DialogFooter className="flex-col gap-2 sm:flex-row pt-2 border-t">
                {canInteract && (
                  <Button variant="destructive" onClick={() => setDeleteMode("choose")} disabled={loading} className="sm:mr-auto">
                    <Trash2 className="mr-2 h-4 w-4" />Cancel Class
                  </Button>
                )}
                <Button variant="outline" onClick={() => setEditItem(null)}>Close</Button>
                {canInteract && (
                  <Button
                    onClick={() => setDialogMode("edit")}
                    disabled={bookingCount === null}
                  >
                    {bookingCount === null
                      ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Edit</>
                      : <><Pencil className="h-4 w-4 mr-2" />Edit</>}
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}

          {/* Edit mode: full form (gated behind Edit button) */}
          {!deleteMode && !deleteWarning && !editSaveMode && dialogMode === "edit" && <>

          <div className="space-y-4">
            {bookingCount !== null && bookingCount > 0 && (
              <div className="flex items-start gap-2 rounded-md border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-yellow-600" />
                <span><strong>{bookingCount} athlete{bookingCount !== 1 ? "s" : ""} are booked</strong> in this class. Changes will still apply — notify athletes if the time or location changes.</span>
              </div>
            )}
            <div className="space-y-1">
              <Label>Class</Label>
              <Select value={editForm.classId} onValueChange={(v) => setEditForm((f) => ({ ...f, classId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select class..." /></SelectTrigger>
                <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Start Time</Label><Input type="time" value={editForm.startTime} onChange={(e) => setEditForm((f) => ({ ...f, startTime: e.target.value }))} /></div>
              <div className="space-y-1"><Label>End Time</Label><Input type="time" value={editForm.endTime} onChange={(e) => setEditForm((f) => ({ ...f, endTime: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Location</Label>
                <LocationSelect
                  value={editForm.location}
                  onChange={(v) => setEditForm((f) => ({ ...f, location: v }))}
                  canManage={isAdmin}
                />
              </div>
              <div className="space-y-1"><Label>Max Members</Label><Input type="number" placeholder="e.g. 20" value={editForm.maxCapacity} onChange={(e) => setEditForm((f) => ({ ...f, maxCapacity: e.target.value }))} /></div>
            </div>
            <div className="space-y-1">
              <Label>Coach(es)</Label>
              <MultiCheckDropdown
                label="Select coaches..."
                options={coachesForClass(employees, classes, editForm.classId)}
                selectedIds={editForm.selectedCoachIds}
                onToggle={(id) => setEditForm((f) => ({ ...f, selectedCoachIds: f.selectedCoachIds.includes(id) ? f.selectedCoachIds.filter((x) => x !== id) : [...f.selectedCoachIds, id] }))}
                getLabel={(e) => `${e.firstName} ${e.lastName}`}
                getSubLabel={(e) => e.title}
              />
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="destructive" onClick={() => setDeleteMode("choose")} disabled={loading} className="sm:mr-auto">
              <Trash2 className="mr-2 h-4 w-4" />Cancel Class
            </Button>
            <Button variant="outline" onClick={() => setDialogMode("view")}>Back</Button>
            <Button
              onClick={() => {
                if (!editItem?.isRecurring) return saveEdit("all");
                // Staff can only save for this session; admins get scope picker
                if (isAdmin) setEditSaveMode("choose");
                else saveEdit("this");
              }}
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save
            </Button>
          </DialogFooter>
          </>}
        </DialogContent>
      </Dialog>

      {/* ── Guest Enroll Dialog ─────────────────────────────────────────────── */}
      <Dialog open={guestDialog} onOpenChange={(o) => { if (!o) setGuestDialog(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Enroll Guest</DialogTitle>
            <p className="text-sm text-muted-foreground">Creates an inactive member and adds them to this class.</p>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">First Name <span className="text-destructive">*</span></label>
                <input
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={guestForm.firstName}
                  onChange={(e) => setGuestForm((f) => ({ ...f, firstName: e.target.value }))}
                  placeholder="First name"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Last Name <span className="text-destructive">*</span></label>
                <input
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={guestForm.lastName}
                  onChange={(e) => setGuestForm((f) => ({ ...f, lastName: e.target.value }))}
                  placeholder="Last name"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Email</label>
              <input
                type="email"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={guestForm.email}
                onChange={(e) => setGuestForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="email@example.com"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Mobile</label>
              <input
                type="tel"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={guestForm.phone}
                onChange={(e) => setGuestForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="09xxxxxxxxx"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGuestDialog(false)} disabled={guestLoading}>Cancel</Button>
            <Button onClick={createGuestAndAdd} disabled={guestLoading || !guestForm.firstName || !guestForm.lastName}>
              {guestLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Enroll Guest
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Employee paid-class payment dialog */}
      <Dialog open={empPayDialog} onOpenChange={(o) => { if (!o) setEmpPayDialog(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Employee Rate Package</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {empPayEmployee?.firstName} {empPayEmployee?.lastName} — this class requires an Employee Rate package.
            </p>
          </DialogHeader>
          <div className="space-y-4 py-1">
            {/* Package selector */}
            {empPayServices[0]?.packages?.length > 0 && (
              <div className="space-y-1">
                <Label>Package</Label>
                <Select value={empPayPackageId} onValueChange={(v) => {
                  setEmpPayPackageId(v);
                  const pkg = empPayServices[0].packages.find((p: any) => p.id === v);
                  setEmpPayPrice(pkg?.memberPrice ?? pkg?.nonMemberPrice ?? 0);
                }}>
                  <SelectTrigger><SelectValue placeholder="Select package..." /></SelectTrigger>
                  <SelectContent>
                    {empPayServices[0].packages.map((pkg: any) => (
                      <SelectItem key={pkg.id} value={pkg.id}>
                        {pkg.name} — {pkg.sessions ? `${pkg.sessions} session${pkg.sessions > 1 ? "s" : ""}` : "Unlimited"} · ₱{pkg.memberPrice ?? pkg.nonMemberPrice ?? 0}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {/* Payment mode */}
            <div className="space-y-1">
              <Label>Payment Mode</Label>
              <Select value={empPayMode} onValueChange={(v) => { setEmpPayMode(v); setEmpPaySubMode(""); }}>
                <SelectTrigger><SelectValue placeholder="Select payment mode..." /></SelectTrigger>
                <SelectContent>
                  {["Cash", "Credit Card", "Bank Transfer", "eWallet", "Class Pass"].map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {PAYMENT_SUB[empPayMode] && (
                <Select value={empPaySubMode} onValueChange={setEmpPaySubMode}>
                  <SelectTrigger><SelectValue placeholder={`Select ${empPayMode} method...`} /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_SUB[empPayMode].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
            {/* Amount */}
            <div className="rounded-md bg-muted/40 px-3 py-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-bold text-base">₱{empPayPrice.toLocaleString()}</span>
            </div>
            {/* Receipt */}
            <div className="space-y-1">
              <Label>Receipt / Proof of Payment (optional)</Label>
              {empPayReceiptPreview ? (
                <div className="relative rounded-lg overflow-hidden border">
                  <img src={empPayReceiptPreview} className="w-full max-h-36 object-cover" alt="receipt" />
                  <button className="absolute top-1 right-1 rounded-full bg-background/80 p-1" onClick={() => { setEmpPayReceipt(null); setEmpPayReceiptPreview(null); if (empPayReceiptRef.current) empPayReceiptRef.current.value = ""; }}>
                    <XIcon className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground border rounded-md px-3 py-2 hover:border-primary w-fit">
                  <span>📎 Upload receipt</span>
                  <input type="file" accept="image/*" capture="environment" className="hidden" ref={empPayReceiptRef} onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) { setEmpPayReceipt(f); setEmpPayReceiptPreview(URL.createObjectURL(f)); }
                  }} />
                </label>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmpPayDialog(false)} disabled={empPayLoading}>Cancel</Button>
            <Button onClick={confirmEmpPayment} disabled={empPayLoading || !empPayMode || (!!PAYMENT_SUB[empPayMode] && !empPaySubMode) || !empPayPackageId}>
              {empPayLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Processing...</> : "Confirm & Add to Class"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove booking confirmation dialog */}
      <Dialog open={!!removeBookingTarget} onOpenChange={(open) => { if (!open) setRemoveBookingTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove Booking</DialogTitle>
          </DialogHeader>
          {removeBookingTarget && (
            <p className="text-sm text-muted-foreground">
              This booking is marked as <strong>No Show</strong> and a session was deducted. Would you like to return the session to this member&apos;s balance?
            </p>
          )}
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button variant="outline" disabled={!!removingBookingId} onClick={() => setRemoveBookingTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="outline"
              disabled={!!removingBookingId}
              onClick={() => removeBookingTarget && removeBooking(removeBookingTarget.id, false)}
            >
              {removingBookingId === removeBookingTarget?.id && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              No, just remove
            </Button>
            <Button
              variant="destructive"
              disabled={!!removingBookingId}
              onClick={() => removeBookingTarget && removeBooking(removeBookingTarget.id, true)}
            >
              {removingBookingId === removeBookingTarget?.id && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              Yes, return session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {assignPackageTarget && (
        <AssignMembershipDialog
          open={!!assignPackageTarget}
          onOpenChange={(o) => { if (!o) setAssignPackageTarget(null); }}
          member={assignPackageTarget}
          services={assignPackageServices}
          timeZone={timeZone}
          onAssigned={() => { setAssignPackageTarget(null); handleAddSearch(addSearch); }}
        />
      )}
    </div>
  );
}
