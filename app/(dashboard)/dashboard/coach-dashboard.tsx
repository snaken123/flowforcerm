"use client";

import { useState, useTransition, useEffect } from "react";
import { Calendar, Clock, CheckCircle2, Circle, UserPlus, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/lib/use-toast";
import { TodaysWodCard } from "@/components/dashboard/todays-wod-card";
import { AnnouncementBoardCard } from "@/components/dashboard/announcement-board-card";

interface Student {
  id: string;
  memberId: string | null;
  status: string;
  member: { id: string; firstName: string; lastName: string; photoUrl?: string | null; memberNumber?: string | null } | null;
}

interface ScheduleItem {
  id: string;
  startTime: string;
  endTime: string;
  classId: string;
  classDef: { id: string; name: string; color: string } | null;
  students: Student[];
  bookings: number;
  checkIns: number;
  coaches: { employee: { id: string; firstName: string; lastName: string } }[];
}

function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return m === 0 ? `${hour} ${ampm}` : `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function AttendanceCard({ schedule, todayStr }: { schedule: ScheduleItem; todayStr: string }) {
  // Track which bookingIds have been marked present this session
  const [attended, setAttended] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const s of schedule.students) {
      if (s.status === "ATTENDED") init[s.id] = true;
    }
    return init;
  });
  const [isPending, startTransition] = useTransition();
  const [walkInQuery, setWalkInQuery] = useState("");
  const [walkInResults, setWalkInResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [checkingInId, setCheckingInId] = useState<string | null>(null);
  const [showWalkIn, setShowWalkIn] = useState(false);
  const { toast } = useToast();

  async function markPresent(booking: Student) {
    if (attended[booking.id] || !booking.member) return;
    startTransition(async () => {
      try {
        const res = await fetch("/api/checkins/attend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            memberId: booking.member!.id,
            classIds: [schedule.classId],
            scheduleId: schedule.id,
            scheduledDate: todayStr,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          toast({ title: "Error", description: err.error ?? "Failed to mark attendance", variant: "destructive" });
          return;
        }
        setAttended((prev) => ({ ...prev, [booking.id]: true }));
        toast({ title: `${booking.member!.firstName} marked present` });
      } catch {
        toast({ title: "Network error", variant: "destructive" });
      }
    });
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      searchWalkIn(walkInQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [walkInQuery]);

  async function searchWalkIn(q: string) {
    if (q.length < 2) { setWalkInResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/members/lookup?q=${encodeURIComponent(q)}&limit=5`);
      if (res.ok) setWalkInResults(await res.json());
    } finally {
      setSearching(false);
    }
  }

  async function checkInWalkIn(member: any) {
    setCheckingInId(member.id);
    try {
      const res = await fetch("/api/checkins/attend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: member.id,
          classIds: [schedule.classId],
          scheduleId: schedule.id,
          scheduledDate: todayStr,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast({ title: "Error", description: err.error ?? "Failed to check in", variant: "destructive" });
        return;
      }
      toast({ title: `${member.firstName} ${member.lastName} checked in` });
      setWalkInQuery("");
      setWalkInResults([]);
      setShowWalkIn(false);
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setCheckingInId(null);
    }
  }

  const booked = schedule.students.length;
  const presentCount = schedule.students.filter((s) => attended[s.id] || s.status === "ATTENDED").length;

  return (
    <Card className={`border-l-4 ${booked > 0 ? "border-l-green-500" : "border-l-muted"}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-semibold">{schedule.classDef?.name ?? "Class"}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTime(schedule.startTime)} – {formatTime(schedule.endTime)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            {booked > 0
              ? <Badge variant="success" className="text-[10px]">{presentCount}/{booked} present</Badge>
              : <Badge variant="outline" className="text-[10px]">No bookings</Badge>
            }
            {schedule.checkIns > 0 && (
              <span className="text-[10px] text-green-600 font-medium">{schedule.checkIns} checked in</span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Booked athletes list */}
        {booked > 0 ? (
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Members</p>
            <ul className="space-y-1.5">
              {schedule.students.map((b) => {
                if (!b.member) return null;
                const isPresent = attended[b.id] || b.status === "ATTENDED";
                return (
                  <li key={b.id} className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                      {b.member.firstName?.[0]}{b.member.lastName?.[0]}
                    </div>
                    <span className="flex-1 text-sm truncate">{b.member.firstName} {b.member.lastName}</span>
                    {isPresent ? (
                      <span className="flex items-center gap-1 text-[11px] text-green-600 font-semibold shrink-0">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Present
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-[10px] shrink-0"
                        disabled={isPending}
                        onClick={() => markPresent(b)}
                      >
                        <Circle className="h-3 w-3 mr-1" /> Mark Present
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">No athletes booked yet.</p>
        )}

        {/* Walk-in check-in */}
        {showWalkIn ? (
          <div className="pt-1 space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Walk-in Check-in</p>
            <Input
              placeholder="Search by name or member #"
              value={walkInQuery}
              onChange={(e) => setWalkInQuery(e.target.value)}
              className="h-7 text-xs"
              autoFocus
            />
            {walkInResults.length > 0 && (
              <ul className="border rounded-md divide-y text-sm">
                {walkInResults.map((m) => (
                  <li key={m.id} className="flex items-center justify-between px-2 py-1.5 hover:bg-muted/50">
                    <span>{m.firstName} {m.lastName} <span className="text-muted-foreground text-xs">#{m.memberNumber}</span></span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-[10px]"
                      disabled={checkingInId === m.id}
                      onClick={() => checkInWalkIn(m)}
                    >
                      {checkingInId === m.id && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                      Check In
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {searching && <p className="text-xs text-muted-foreground">Searching…</p>}
            <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] w-full" onClick={() => { setShowWalkIn(false); setWalkInQuery(""); setWalkInResults([]); }}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] w-full border border-dashed" onClick={() => setShowWalkIn(true)}>
            <UserPlus className="h-3 w-3 mr-1" /> Walk-in Check-in
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function CoachDashboard({
  employeeName,
  dateStr,
  schedulesWithData,
  todayStr,
  showWod = true,
  showAnnouncements = true,
}: {
  employeeName: string;
  dateStr: string;
  schedulesWithData: ScheduleItem[];
  todayStr: string;
  showWod?: boolean;
  showAnnouncements?: boolean;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Good day, {employeeName}!</h1>
        <p className="text-muted-foreground">{dateStr}</p>
      </div>

      {(showWod || showAnnouncements) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {showWod && <TodaysWodCard showPlanLink={true} />}
          {showAnnouncements && <AnnouncementBoardCard canManage={true} />}
        </div>
      )}

      <div>
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Today's Classes
        </h2>
        {schedulesWithData.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              No classes scheduled for today.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {schedulesWithData.map((s) => (
              <AttendanceCard key={s.id} schedule={s} todayStr={todayStr} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
