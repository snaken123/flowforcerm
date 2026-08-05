import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ScheduleClient } from "./schedule-client";

export const metadata = { title: "Schedule" };
export const revalidate = 60;

export default async function SchedulePage() {
  const session = await getAuthSession();
  if (!session) redirect("/login");
  const role = (session.user as any).role;
  if (!["ADMIN", "STAFF"].includes(role)) redirect("/dashboard");

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [schedules, classes, employees, bookingCounts, checkInCounts] = await Promise.all([
    prisma.classSchedule.findMany({
      where: { isActive: true },
      include: {
        coaches: { include: { employee: { select: { id: true, firstName: true, lastName: true } } } },
        exceptions: { select: { date: true } },
      },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    }),
    prisma.classSession.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, color: true, location: true, allowedServices: { select: { serviceId: true } } },
    }),
    prisma.employee.findMany({
      where: { isActive: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: {
        id: true, firstName: true, lastName: true, title: true,
        employeeTypes: true,
        taughtServices: { select: { serviceId: true } },
      },
    }),
    prisma.booking.groupBy({
      by: ["scheduleId"],
      where: { scheduleId: { not: null }, status: { not: "CANCELLED" } },
      _count: { id: true },
    }),
    prisma.checkIn.groupBy({
      by: ["scheduleId"],
      where: { scheduleId: { not: null }, checkedInAt: { gte: todayStart, lte: todayEnd } },
      _count: { id: true },
    }),
  ]);

  const classMap = Object.fromEntries(classes.map((c) => [c.id, c]));
  const schedulesWithClass = schedules.map((s) => ({ ...s, classDef: classMap[s.classId] ?? null }));
  const bookingCountMap: Record<string, number> = Object.fromEntries(
    bookingCounts.map((b) => [b.scheduleId as string, b._count.id])
  );
  const checkInCountMap: Record<string, number> = Object.fromEntries(
    checkInCounts.map((c) => [c.scheduleId as string, c._count.id])
  );

  const taughtServiceIds: string[] = (session.user as any).taughtServiceIds ?? [];
  const employeeTypes: string[] = (session.user as any).employeeTypes ?? [];
  const isCoachOnly = employeeTypes.length > 0 && !employeeTypes.includes("ADMIN") && !employeeTypes.includes("STAFF");

  return <ScheduleClient schedules={schedulesWithClass} classes={classes} employees={employees} isAdmin={role === "ADMIN"} userRole={role} bookingCountMap={bookingCountMap} checkInCountMap={checkInCountMap} coachServiceIds={isCoachOnly ? taughtServiceIds : []} />;
}
