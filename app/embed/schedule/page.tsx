import { prisma } from "@/lib/db";
import { ScheduleEmbedClient } from "./schedule-embed-client";
import { manilaDateStr } from "@/lib/time";

export const revalidate = 60;

export const metadata = { title: "Class Schedule — FlowForceRM" };

export default async function EmbedSchedulePage() {
  // Resolved in the tenant's own timezone (not the server's UTC, not the visitor's
  // browser timezone) and passed down as a fixed string so server and client agree on
  // exactly what "today" is -- computing `new Date()` independently on each side is
  // what caused the hydration mismatch this used to have.
  const todayStr = manilaDateStr();
  const today = new Date(todayStr + "T00:00:00Z");

  const [schedules, classes] = await Promise.all([
    prisma.classSchedule.findMany({
      where: {
        isActive: true,
        classDef: { name: { not: "Gym Use" } },
        OR: [{ endDate: null }, { endDate: { gte: today } }],
      },
      include: {
        coaches: { include: { employee: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    }),
    prisma.classSession.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, color: true, location: true },
    }),
  ]);

  return <ScheduleEmbedClient schedules={schedules} classes={classes} todayStr={todayStr} />;
}
