export const revalidate = 30;

import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Users, UserCheck, TrendingUp, AlertCircle, CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, timeAgo } from "@/lib/utils";
import { DashboardSearch } from "./dashboard-search";
import { CoachDashboard } from "./coach-dashboard";

async function getCoachDashboardData(employeeId: string) {
  const now = new Date();
  const todayDow = now.getDay(); // 0=Sun
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      firstName: true,
      lastName: true,
      taughtServices: { select: { serviceId: true, service: { select: { id: true, name: true, color: true } } } },
    },
  });

  const taughtServiceIds = employee?.taughtServices.map((t) => t.serviceId) ?? [];

  const schedules = await prisma.classSchedule.findMany({
    where: {
      isActive: true,
      dayOfWeek: todayDow,
      coaches: { some: { employeeId } },
    },
    include: {
      coaches: { include: { employee: { select: { id: true, firstName: true, lastName: true } } } },
      exceptions: { select: { date: true } },
    },
    orderBy: { startTime: "asc" },
  });

  const classIds = [...new Set(schedules.map((s) => s.classId))];
  const classDefs = classIds.length > 0
    ? await prisma.classSession.findMany({ where: { id: { in: classIds } }, select: { id: true, name: true, color: true } })
    : [];
  const classMap = Object.fromEntries(classDefs.map((c) => [c.id, c]));

  const scheduleIds = schedules.map((s) => s.id);
  // Use Manila date explicitly so this works regardless of server TZ
  const manilaToday = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
  const todayUTC = new Date(manilaToday + "T00:00:00Z");

  // Manila day boundaries for check-in lookup
  const manilaTodayStart = new Date(`${manilaToday}T00:00:00+08:00`);
  const manilaTodayEnd   = new Date(`${manilaToday}T23:59:59.999+08:00`);

  const [bookings, checkInCounts] = await Promise.all([
    // Fetch booking records — include those with today's date OR no specific date
    // (recurring-class bookings are often stored without a scheduledDate)
    prisma.booking.findMany({
      where: {
        scheduleId: { in: scheduleIds },
        status: { not: "CANCELLED" },
        OR: [{ scheduledDate: todayUTC }, { scheduledDate: null }],
      },
      include: {
        member: { select: { id: true, firstName: true, lastName: true, photoUrl: true, memberNumber: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.checkIn.groupBy({
      by: ["scheduleId"],
      where: {
        scheduleId: { in: scheduleIds },
        checkedInAt: { gte: manilaTodayStart, lte: manilaTodayEnd },
      },
      _count: { id: true },
    }),
  ]);

  // Group bookings by scheduleId
  const bookingsBySchedule: Record<string, typeof bookings> = {};
  for (const b of bookings) {
    if (!b.scheduleId) continue;
    if (!bookingsBySchedule[b.scheduleId]) bookingsBySchedule[b.scheduleId] = [];
    bookingsBySchedule[b.scheduleId].push(b);
  }
  const checkInMap = Object.fromEntries(checkInCounts.map((c) => [c.scheduleId as string, c._count.id]));

  // Filter out exceptions for today (Manila date, not UTC)
  const todayStr = manilaToday;
  const activeSched = schedules.filter((s) =>
    !s.exceptions.some((e) =>
      new Date(e.date).toLocaleDateString("en-CA", { timeZone: "Asia/Manila" }) === todayStr
    )
  );
  const allSchedulesWithData = activeSched.map((s) => ({
    ...s,
    classDef: classMap[s.classId] ?? null,
    students: bookingsBySchedule[s.id] ?? [],
    bookings: (bookingsBySchedule[s.id] ?? []).length,
    checkIns: checkInMap[s.id] ?? 0,
  }));
  // Show all active classes (with and without bookings) so coach sees full picture
  const schedulesWithData = allSchedulesWithData;

  return { employee, schedulesWithData, taughtServices: employee?.taughtServices ?? [] };
}

async function getDashboardData(role: string, userId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const todayStart = new Date(now.setHours(0, 0, 0, 0));

  if (role === "MEMBER") {
    const member = await prisma.member.findUnique({
      where: { userId },
      include: {
        subscriptions: { include: { service: true }, where: { status: { in: ["ACTIVE", "PAUSED"] } } },
        checkIns: {
          orderBy: { checkedInAt: "desc" },
          take: 5,
        },
        rankRecords: { orderBy: { awardedAt: "desc" } },
      },
    });

    // Fetch service names for check-ins via serviceId
    let checkInsWithService: any[] = [];
    if (member?.checkIns?.length) {
      const serviceIds = [...new Set(member.checkIns.map((c: any) => c.serviceId).filter(Boolean))] as string[];
      const services = serviceIds.length
        ? await prisma.classSession.findMany({
            where: { id: { in: serviceIds } },
            select: { id: true, name: true, color: true },
          })
        : [];
      const serviceMap = Object.fromEntries(services.map((s) => [s.id, s]));
      checkInsWithService = member.checkIns.map((c: any) => ({
        ...c,
        service: c.serviceId ? serviceMap[c.serviceId] ?? null : null,
      }));
    }

    return { member: member ? { ...member, checkIns: checkInsWithService } : member };
  }

  const [
    totalMembers,
    activeMembers,
    newThisMonth,
    todayCheckins,
    overduePayments,
    recentCheckins,
    expiringSubscriptions,
    recentMembers,
  ] = await Promise.all([
    prisma.member.count(),
    prisma.member.count({ where: { status: "ACTIVE" } }),
    prisma.member.count({ where: { joinDate: { gte: startOfMonth } } }),
    prisma.checkIn.count({ where: { checkedInAt: { gte: todayStart } } }),
    prisma.payment.count({ where: { status: "OVERDUE" } }),
    prisma.checkIn.findMany({
      take: 8,
      orderBy: { checkedInAt: "desc" },
      include: { member: true },
    }),
    prisma.subscription.findMany({
      where: {
        status: "ACTIVE",
        endDate: { lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      },
      include: { member: true, service: true },
      take: 5,
    }),
    prisma.member.findMany({
      orderBy: { joinDate: "desc" },
      take: 5,
      include: { subscriptions: { include: { service: true } } },
    }),
  ]);

  return {
    stats: { totalMembers, activeMembers, newThisMonth, todayCheckins, overduePayments },
    recentCheckins,
    expiringSubscriptions,
    recentMembers,
  };
}

export default async function DashboardPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login");

  const role = (session.user as any).role;
  if (role === "STORE") redirect("/admin/store");
  const userId = (session.user as any).id;
  const employeeTypes: string[] = (session.user as any).employeeTypes ?? [];
  const employeeId: string | null = (session.user as any).employeeId ?? null;
  const isCoachOnly = employeeTypes.length > 0 && !employeeTypes.includes("ADMIN") && !employeeTypes.includes("STAFF");

  if (isCoachOnly && employeeId) {
    const coachData = await getCoachDashboardData(employeeId);
    const { employee, schedulesWithData } = coachData;
    const today = new Date();
    const dateStr = today.toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    const manilaToday = today.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });

    return (
      <CoachDashboard
        employeeName={employee?.firstName ?? "Coach"}
        dateStr={dateStr}
        schedulesWithData={schedulesWithData}
        todayStr={manilaToday}
      />
    );
  }

  const data = await getDashboardData(role, userId);

  if (role === "MEMBER") {
    const { member } = data as any;
    const ninetyDaysFromNow = Date.now() + 90 * 86400000;
    const sortPriority = (s: any) => {
      if (!s.sessionsTotal && s.endDate && new Date(s.endDate).getTime() > ninetyDaysFromNow) return 0;
      if (!s.sessionsTotal && !s.endDate) return 1;
      return 2;
    };
    const now2 = new Date();
    const visibleSubs = (member?.subscriptions ?? [])
      .filter((s: any) => {
        if (s.status !== "ACTIVE" && s.status !== "PAUSED") return false;
        // Hide session-based subs with no sessions left
        if (s.sessionsTotal !== null && s.sessionsUsed >= s.sessionsTotal) return false;
        // Hide date-based subs that have expired
        if (s.endDate && new Date(s.endDate) < now2) return false;
        return true;
      })
      .sort((a: any, b: any) => {
        const pa = sortPriority(a), pb = sortPriority(b);
        if (pa !== pb) return pa - pb;
        if (a.endDate && b.endDate) return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
        return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
      });

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {session.user?.name?.split(" ")[0]}!</h1>
          <p className="text-muted-foreground">Here's your membership overview.</p>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" />Memberships
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {visibleSubs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active memberships.</p>
            ) : (
              visibleSubs.map((sub: any) => {
                const isFrozen = sub.status === "PAUSED";
                const isSessionBased = sub.sessionsTotal !== null;
                const sessionsLeft = isSessionBased ? sub.sessionsTotal - sub.sessionsUsed : null;
                const daysLeft = !isSessionBased && sub.endDate
                  ? Math.max(0, Math.ceil((new Date(sub.endDate).getTime() - Date.now()) / 86400000))
                  : null;
                return (
                  <div key={sub.id} className={`rounded-md border p-3 space-y-2 ${isFrozen ? "bg-blue-50/50 border-blue-200" : ""}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full inline-block shrink-0" style={{ backgroundColor: sub.service.color }} />
                        <span className="font-medium text-sm">{sub.service.name}</span>
                      </div>
                      {isFrozen
                        ? <Badge variant="warning">FROZEN</Badge>
                        : <Badge variant="success">ACTIVE</Badge>
                      }
                    </div>
                    <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3">
                      <span>Started {formatDate(sub.startDate)}</span>
                      {sub.endDate && <span>Expires {formatDate(sub.endDate)}</span>}
                    </div>
                    {isFrozen && sub.frozenUntil && (
                      <p className="text-xs text-blue-600 font-medium">Frozen until {formatDate(sub.frozenUntil)}</p>
                    )}
                    {!isFrozen && isSessionBased ? (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Sessions used</span>
                          <span className={sessionsLeft === 0 ? "text-destructive font-medium" : sessionsLeft! <= 2 ? "text-yellow-600 font-medium" : "font-medium"}>
                            {sub.sessionsUsed} / {sub.sessionsTotal} &nbsp;·&nbsp; {sessionsLeft} left
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${sessionsLeft === 0 ? "bg-destructive" : sessionsLeft! <= 2 ? "bg-yellow-500" : "bg-green-500"}`}
                            style={{ width: `${(sub.sessionsUsed / sub.sessionsTotal) * 100}%` }}
                          />
                        </div>
                      </div>
                    ) : !isFrozen && daysLeft !== null ? (
                      <p className={`text-xs font-medium ${daysLeft === 0 ? "text-destructive" : daysLeft <= 7 ? "text-yellow-600" : "text-green-700"}`}>
                        {daysLeft === 0 ? "Expires today" : `${daysLeft} day${daysLeft !== 1 ? "s" : ""} remaining`}
                      </p>
                    ) : null}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          {/* Total sessions used */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Sessions Used</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {visibleSubs.filter((s: any) => s.sessionsTotal !== null).reduce((sum: number, s: any) => sum + s.sessionsUsed, 0)}
              </div>
              <p className="text-xs text-muted-foreground">across session-based memberships</p>
            </CardContent>
          </Card>

          {/* Active memberships count */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Plans</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{visibleSubs.length}</div>
              <p className="text-xs text-muted-foreground">current memberships</p>
            </CardContent>
          </Card>

          {/* Recent check-ins count */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Check-ins</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{member?.checkIns?.length ?? 0}</div>
              <p className="text-xs text-muted-foreground">recent visits</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Check-ins */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent Check-ins</CardTitle>
          </CardHeader>
          <CardContent>
            {member?.checkIns?.length === 0 ? (
              <p className="text-sm text-muted-foreground">No check-ins yet.</p>
            ) : (
              <ul className="space-y-3">
                {member?.checkIns?.map((c: any) => {
                  const d = new Date(c.checkedInAt);
                  const timeStr = d.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", hour12: true });
                  return (
                    <li key={c.id} className="flex items-center justify-between text-sm gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{formatDate(c.checkedInAt)} · {timeStr}</p>
                        {c.service && (
                          <p className="text-xs mt-0.5 flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: c.service.color ?? "#6366f1" }} />
                            <span className="text-muted-foreground">{c.service.name}</span>
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{timeAgo(c.checkedInAt)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const { stats, recentCheckins, expiringSubscriptions, recentMembers } = data as any;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your gym's activity today.</p>
        </div>
        <DashboardSearch />
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMembers}</div>
            <p className="text-xs text-muted-foreground">{stats.activeMembers} active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Today's Check-ins</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayCheckins}</div>
            <p className="text-xs text-muted-foreground">so far today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">New This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.newThisMonth}</div>
            <p className="text-xs text-muted-foreground">new members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Overdue Payments</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.overduePayments}</div>
            <p className="text-xs text-muted-foreground">need attention</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent check-ins */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Check-ins</CardTitle>
            <CardDescription>Members who checked in recently</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {recentCheckins.map((c: any) => (
                <li key={c.id} className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {(c.member.firstName?.[0] ?? "?") + (c.member.lastName?.[0] ?? "")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.member.firstName} {c.member.lastName}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{timeAgo(c.checkedInAt)}</span>
                </li>
              ))}
              {recentCheckins.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No check-ins today</p>
              )}
            </ul>
          </CardContent>
        </Card>

        {/* New members */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Newest Members</CardTitle>
            <CardDescription>Recently joined members</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {recentMembers.map((m: any) => (
                <li key={m.id} className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-xs font-bold text-green-700">
                    {m.firstName[0]}{m.lastName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{m.firstName} {m.lastName}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.subscriptions.map((s: any) => s.service.name).join(", ") || "No subscriptions"}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDate(m.joinDate)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Expiring subscriptions */}
      {expiringSubscriptions.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              Expiring Soon
            </CardTitle>
            <CardDescription>Subscriptions expiring in the next 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {expiringSubscriptions.map((sub: any) => (
                <li key={sub.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{sub.member.firstName} {sub.member.lastName}</span>
                  <span className="text-muted-foreground">{sub.service.name}</span>
                  <Badge variant="warning">Expires {formatDate(sub.endDate)}</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
