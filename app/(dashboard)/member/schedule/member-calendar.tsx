"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, MapPin, User, Loader2, CheckSquare, Square, Calendar, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/lib/use-toast";
import { useTenantTimezone } from "@/components/tenant-timezone-provider";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_NAMES_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS = [0, 1, 2, 3, 4, 5, 6];
const START_HOUR = 5;
const END_HOUR = 23;
const HOUR_PX = 60;

function getWeekStart(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return m === 0 ? `${hour} ${ampm}` : `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function layoutDay(items: any[]) {
  const sorted = [...items].sort((a, b) => {
    const diff = timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
    return diff !== 0 ? diff : (a.classDef?.name ?? "").localeCompare(b.classDef?.name ?? "");
  });
  const cols: number[] = [];
  const result = sorted.map((item) => {
    const start = timeToMinutes(item.startTime);
    const end = timeToMinutes(item.endTime);
    let col = cols.findIndex((e) => e <= start);
    if (col === -1) { col = cols.length; cols.push(end); } else cols[col] = end;
    return { item, col };
  });
  return result.map(({ item, col }) => ({ item, col, totalCols: cols.length }));
}

function getVisibleItems(weekGrid: Record<number, any[]>, dow: number, cellMidnight: Date) {
  return (weekGrid[dow] ?? []).filter((item: any) => {
    const sd = item.startDate ? new Date(item.startDate) : null;
    const ed = item.endDate ? new Date(item.endDate) : null;
    if (sd) { sd.setHours(0,0,0,0); if (cellMidnight < sd) return false; }
    if (ed) { ed.setHours(0,0,0,0); if (cellMidnight > ed) return false; }
    if (!item.isRecurring) {
      return sd !== null && cellMidnight.getTime() === sd.getTime();
    }
    // Hide recurring class on dates where a one-time override (exception) was created
    const hasException = (item.exceptions ?? []).some((ex: any) => {
      const exDate = new Date(ex.date); exDate.setHours(0,0,0,0);
      return exDate.getTime() === cellMidnight.getTime();
    });
    return !hasException;
  });
}

export function MemberCalendar({
  schedules,
  hasActiveMembership,
  memberId,
  subscriptionId,
  existingBookings,
}: {
  schedules: any[];
  hasActiveMembership: boolean;
  memberId: string;
  subscriptionId: string;
  existingBookings: { id: string; sessionId: string; scheduleId: string | null; status: string }[];
}) {
  const router = useRouter();
  const timeZone = useTenantTimezone();
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [viewMode, setViewMode] = useState<"week" | "day">("week");
  const [dayView, setDayView] = useState(() => { const d = new Date(); d.setHours(0,0,0,0); return d; });
  const [selected, setSelected] = useState<any | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [bookings, setBookings] = useState<{ id: string; sessionId: string; scheduleId: string | null; status: string }[]>(existingBookings);
  const [loading, setLoading] = useState(false);
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);
  const [cancelWithinCutoff, setCancelWithinCutoff] = useState(false);

  const today = new Date(); today.setHours(0,0,0,0);
  const weekDates = DAYS.map((d) => addDays(weekStart, d));

  const firstDate = weekDates[0];
  const lastDate = weekDates[6];
  const weekLabel = firstDate.getFullYear() === lastDate.getFullYear()
    ? `${MONTH_NAMES[firstDate.getMonth()]} ${firstDate.getDate()} – ${MONTH_NAMES[lastDate.getMonth()]} ${lastDate.getDate()}, ${lastDate.getFullYear()}`
    : `${MONTH_NAMES[firstDate.getMonth()]} ${firstDate.getDate()}, ${firstDate.getFullYear()} – ${MONTH_NAMES[lastDate.getMonth()]} ${lastDate.getDate()}, ${lastDate.getFullYear()}`;
  const dayLabel = dayView.toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const dayViewDow = dayView.getDay();

  const weekGrid: Record<number, any[]> = {};
  for (const day of DAYS) weekGrid[day] = [];
  for (const s of schedules) weekGrid[s.dayOfWeek].push(s);

  const totalHeight = (END_HOUR - START_HOUR) * HOUR_PX;
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

  function getBooking(scheduleId: string) {
    return bookings.find((b) => b.scheduleId === scheduleId) ?? null;
  }

  function isClassExpired(item: any, cellDate: Date): boolean {
    const cell = new Date(cellDate); cell.setHours(0,0,0,0);
    const todayMidnight = new Date(); todayMidnight.setHours(0,0,0,0);
    if (cell < todayMidnight) return true; // past day
    if (cell.getTime() !== todayMidnight.getTime()) return false; // future day — not expired
    // Same day: check if end time has passed (tenant-local time)
    const [endH, endM] = item.endTime.split(":").map(Number);
    const parts = new Intl.DateTimeFormat("en-US", { timeZone, hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
    const nowH = Number(parts.find((p) => p.type === "hour")?.value ?? "0") % 24;
    const nowM = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
    return nowH * 60 + nowM > endH * 60 + endM;
  }

  async function handleBook() {
    if (!selected) return;
    setLoading(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: selected.classId, scheduleId: selected.id, subscriptionId: subscriptionId || undefined, scheduledDate: selectedDate ? selectedDate.toLocaleDateString("en-CA") : null }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to book");
      }
      const booking = await res.json();
      setBookings((prev) => [...prev, { id: booking.id, sessionId: selected.classId, scheduleId: selected.id, status: "CONFIRMED" }]);
      toast({ title: "Class booked!", description: `${selected.classDef?.name} reserved. Attendance will be marked when you visit.` });
      setSelected(null);
      router.refresh();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Could not book", description: err.message });
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel(bookingId: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error("Failed to cancel");
      const data = await res.json().catch(() => ({}));
      setBookings((prev) => prev.filter((b) => b.id !== bookingId));
      toast({
        title: "Booking cancelled",
        description: data.sessionReturned
          ? "Your session has been returned to your balance."
          : data.withinCutoff
          ? "You cancelled within 4 hours of class start — your session was not returned."
          : undefined,
      });
      setSelected(null);
      router.refresh();
    } catch {
      toast({ variant: "destructive", title: "Could not cancel booking" });
    } finally {
      setLoading(false);
    }
  }

  if (!hasActiveMembership) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">My Schedule</h1>
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          You have no active memberships. Purchase a package to see your schedule.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">My Schedule</h1>
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
            setWeekStart(getWeekStart(new Date()));
            setDayView(() => { const d = new Date(); d.setHours(0,0,0,0); return d; });
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
              onClick={() => setViewMode("week")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${viewMode === "week" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Week
            </button>
            <button
              type="button"
              onClick={() => setViewMode("day")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors border-l ${viewMode === "day" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              <Calendar className="h-3.5 w-3.5" /> Day
            </button>
          </div>
        </div>
      </div>

      {schedules.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          No classes scheduled for your memberships yet.
        </div>
      ) : viewMode === "day" ? (() => {
        const cellMidnight = new Date(dayView); cellMidnight.setHours(0,0,0,0);
        const isToday = cellMidnight.getTime() === today.getTime();
        const visibleItems = getVisibleItems(weekGrid, dayViewDow, cellMidnight);
        const laid = layoutDay(visibleItems);
        return (
          <div className="rounded-md border">
            <div className="flex border-b">
              <div className="w-12 shrink-0" />
              <div className="flex-1 py-2 text-center border-l">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{DAY_NAMES[dayViewDow]}</p>
                <p className={`text-sm font-bold mt-0.5 w-7 h-7 flex items-center justify-center rounded-full mx-auto ${isToday ? "bg-primary text-primary-foreground" : "text-foreground"}`}>
                  {dayView.getDate()}
                </p>
              </div>
            </div>
            <div className="flex">
              <div className="w-12 shrink-0 relative" style={{ height: totalHeight }}>
                {hours.map((h) => (
                  <div key={h} className="absolute right-2 text-[9px] text-muted-foreground leading-none" style={{ top: (h - START_HOUR) * HOUR_PX - 5 }}>
                    {h % 12 || 12}{h < 12 ? "a" : "p"}
                  </div>
                ))}
              </div>
              <div className="flex-1 border-l relative" style={{ height: totalHeight }}>
                {hours.map((h) => (
                  <div key={h} className="absolute left-0 right-0 border-t border-border/40" style={{ top: (h - START_HOUR) * HOUR_PX }} />
                ))}
                {hours.map((h) => (
                  <div key={`${h}h`} className="absolute left-0 right-0 border-t border-border/20" style={{ top: (h - START_HOUR) * HOUR_PX + HOUR_PX / 2 }} />
                ))}
                {laid.map(({ item, col, totalCols }) => {
                  const startMin = timeToMinutes(item.startTime);
                  const endMin = timeToMinutes(item.endTime);
                  const top = ((startMin / 60) - START_HOUR) * HOUR_PX;
                  const height = Math.max(((endMin - startMin) / 60) * HOUR_PX, 20);
                  const widthPct = 100 / totalCols;
                  const color = item.classDef?.color ?? "#3b82f6";
                  const booking = getBooking(item.id);
                  const isBooked = !!booking;
                  const isAttended = booking?.status === "ATTENDED";
                  const expired = isClassExpired(item, dayView);
                  return (
                    <div
                      key={item.id}
                      onClick={() => { setSelected({ ...item, expired }); setSelectedDate(dayView); }}
                      className={`absolute rounded text-white text-[10px] overflow-hidden transition-[filter] ${expired ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:brightness-110 active:brightness-90"} ${isBooked ? "ring-2 ring-white ring-offset-1" : ""}`}
                      style={{ top, height, left: `calc(${col * widthPct}% + 2px)`, width: `calc(${widthPct}% - 4px)`, backgroundColor: color }}
                    >
                      <div className="p-1 h-full flex flex-col gap-0.5">
                        <p className="font-semibold truncate leading-tight">{item.classDef?.name}</p>
                        {height > 30 && <p className="opacity-90 truncate leading-tight">{formatTime(item.startTime)}</p>}
                        {isBooked && height > 20 && (
                          <div className="mt-auto">
                            {isAttended
                              ? <span className="inline-flex items-center gap-0.5 bg-green-400 text-white rounded px-1 py-0.5 text-[9px] font-bold leading-none"><CheckSquare className="h-2.5 w-2.5" />ATTENDED</span>
                              : <span className="inline-flex items-center gap-0.5 bg-white/30 text-white rounded px-1 py-0.5 text-[9px] font-bold leading-none"><CheckSquare className="h-2.5 w-2.5" />BOOKED</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })() : (
        <div className="overflow-x-auto rounded-md border">
          <div className="min-w-[560px]">
            {/* Day headers */}
            <div className="flex border-b">
              <div className="w-12 shrink-0" />
              {DAYS.map((day) => {
                const date = weekDates[day];
                const isToday = date.getTime() === today.getTime();
                return (
                  <div key={day} className="flex-1 py-2 text-center border-l">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{DAY_NAMES[day]}</p>
                    <p className={`text-sm font-bold mt-0.5 w-7 h-7 flex items-center justify-center rounded-full mx-auto ${isToday ? "bg-primary text-primary-foreground" : "text-foreground"}`}>
                      {date.getDate()}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Time grid */}
            <div className="flex">
              {/* Hour labels */}
              <div className="w-12 shrink-0 relative" style={{ height: totalHeight }}>
                {hours.map((h) => (
                  <div key={h} className="absolute right-2 text-[9px] text-muted-foreground leading-none" style={{ top: (h - START_HOUR) * HOUR_PX - 5 }}>
                    {h % 12 || 12}{h < 12 ? "a" : "p"}
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {DAYS.map((day) => {
                const cellDate = weekDates[day];
                const cellMidnight = new Date(cellDate); cellMidnight.setHours(0,0,0,0);
                const isPast = cellMidnight < today;
                const visibleItems = getVisibleItems(weekGrid, day, cellMidnight);
                const laid = layoutDay(visibleItems);

                return (
                  <div key={day} className="flex-1 border-l relative" style={{ height: totalHeight }}>
                    {hours.map((h) => (
                      <div key={h} className="absolute left-0 right-0 border-t border-border/40" style={{ top: (h - START_HOUR) * HOUR_PX }} />
                    ))}
                    {hours.map((h) => (
                      <div key={`${h}h`} className="absolute left-0 right-0 border-t border-border/20" style={{ top: (h - START_HOUR) * HOUR_PX + HOUR_PX / 2 }} />
                    ))}
                    {laid.map(({ item, col, totalCols }) => {
                      const startMin = timeToMinutes(item.startTime);
                      const endMin = timeToMinutes(item.endTime);
                      const top = ((startMin / 60) - START_HOUR) * HOUR_PX;
                      const height = Math.max(((endMin - startMin) / 60) * HOUR_PX, 20);
                      const widthPct = 100 / totalCols;
                      const color = item.classDef?.color ?? "#3b82f6";
                      const booking = getBooking(item.id);
                      const isBooked = !!booking;
                      const isAttended = booking?.status === "ATTENDED";
                      const expired = isClassExpired(item, cellDate);
                      return (
                        <div
                          key={item.id}
                          onClick={() => { setSelected({ ...item, expired }); setSelectedDate(cellDate); }}
                          className={`absolute rounded text-white text-[10px] overflow-hidden transition-[filter] ${expired ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:brightness-110 active:brightness-90"} ${isPast ? "opacity-30" : ""} ${isBooked ? "ring-2 ring-white ring-offset-1" : ""}`}
                          style={{ top, height, left: `calc(${col * widthPct}% + 2px)`, width: `calc(${widthPct}% - 4px)`, backgroundColor: color }}
                        >
                          <div className="p-1 h-full flex flex-col gap-0.5">
                            <p className="font-semibold truncate leading-tight">{item.classDef?.name}</p>
                            {height > 30 && <p className="opacity-90 truncate leading-tight">{formatTime(item.startTime)}</p>}
                            {isBooked && height > 20 && (
                              <div className="mt-auto">
                                {isAttended
                                  ? <span className="inline-flex items-center gap-0.5 bg-green-400 text-white rounded px-1 py-0.5 text-[9px] font-bold leading-none"><CheckSquare className="h-2.5 w-2.5" />ATTENDED</span>
                                  : <span className="inline-flex items-center gap-0.5 bg-white/30 text-white rounded px-1 py-0.5 text-[9px] font-bold leading-none"><CheckSquare className="h-2.5 w-2.5" />BOOKED</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Class detail dialog */}

      {selected && (() => {
        const booking = getBooking(selected.id);
        const isBooked = !!booking;
        const isAttended = booking?.status === "ATTENDED";
        const expired = !!selected.expired;
        return (
          <Dialog open={!!selected} onOpenChange={(o) => { if (!o) { setSelected(null); setSelectedDate(null); } }}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: selected?.classDef?.color ?? "#3b82f6" }} />
                  {selected?.classDef?.name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                  <div className="flex gap-3">
                    <span className="text-xs font-semibold text-muted-foreground uppercase w-16 shrink-0 mt-0.5">Day</span>
                    <span>{DAY_NAMES_FULL[selected.dayOfWeek]}</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-xs font-semibold text-muted-foreground uppercase w-16 shrink-0 mt-0.5">Time</span>
                    <span>{formatTime(selected.startTime)} – {formatTime(selected.endTime)}</span>
                  </div>
                  {selected.location && (
                    <div className="flex gap-3">
                      <span className="text-xs font-semibold text-muted-foreground uppercase w-16 shrink-0 mt-0.5">Location</span>
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{selected.location}</span>
                    </div>
                  )}
                  {selected.maxCapacity && (
                    <div className="flex gap-3">
                      <span className="text-xs font-semibold text-muted-foreground uppercase w-16 shrink-0 mt-0.5">Capacity</span>
                      <span>{selected.maxCapacity} athletes max</span>
                    </div>
                  )}
                  {selected.coaches?.length > 0 && (
                    <div className="flex gap-3">
                      <span className="text-xs font-semibold text-muted-foreground uppercase w-16 shrink-0 mt-0.5">Coach</span>
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {selected.coaches.map((c: any) => `${c.employee?.firstName ?? ""} ${c.employee?.lastName ?? ""}`.trim()).join(", ")}
                      </span>
                    </div>
                  )}
                </div>

                {/* Attendance status */}
                <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
                  isAttended ? "bg-green-50 text-green-700 border border-green-200" :
                  isBooked ? "bg-blue-50 text-blue-700 border border-blue-200" :
                  "bg-muted text-muted-foreground border"
                }`}>
                  {isAttended
                    ? <><CheckSquare className="h-4 w-4" /> Attended</>
                    : isBooked
                    ? <><Square className="h-4 w-4" /> Reserved — attendance will be marked at the gym</>
                    : <><Square className="h-4 w-4" /> Not booked</>}
                </div>
              </div>

              <DialogFooter>
                {expired ? (
                  <p className="text-sm text-muted-foreground w-full text-center">This class has already ended.</p>
                ) : !isAttended && (
                  isBooked ? (
                    cancelConfirmId === booking!.id ? (
                      <div className="flex flex-col gap-2 w-full">
                        <p className="text-sm text-muted-foreground">
                          {cancelWithinCutoff
                            ? "You are canceling within 4 hours of class start — your session will NOT be returned. If you believe this should be an exception, please coordinate with the front desk. Are you sure?"
                            : "Cancel this booking? Your session will be returned to your balance."}
                        </p>
                        <div className="flex gap-2 justify-end">
                          <Button variant="ghost" size="sm" onClick={() => setCancelConfirmId(null)}>Keep it</Button>
                          <Button variant="destructive" size="sm" onClick={() => { setCancelConfirmId(null); handleCancel(booking!.id); }} disabled={loading}>
                            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                            Yes, cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                    <Button variant="outline" onClick={() => {
                      const hours = selected?.startTime && selectedDate
                        ? (new Date(`${selectedDate.toLocaleDateString("en-CA")}T${selected.startTime}:00+08:00`).getTime() - Date.now()) / 3600000
                        : Infinity;
                      setCancelWithinCutoff(hours < 4);
                      setCancelConfirmId(booking!.id);
                    }} disabled={loading} className="text-destructive border-destructive/30 hover:bg-destructive/10">
                      Cancel Reservation
                    </Button>
                    )
                  ) : (
                    <Button onClick={handleBook} disabled={loading}>
                      {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                      Book Class
                    </Button>
                  )
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}
    </div>
  );
}
