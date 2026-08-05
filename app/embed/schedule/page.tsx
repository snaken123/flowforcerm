import { prisma } from "@/lib/db";
import { ScheduleEmbedClient } from "./schedule-embed-client";

export const revalidate = 60;

export const metadata = { title: "Class Schedule — NorthSouth Fight Sports" };

export default async function EmbedSchedulePage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

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

  return <ScheduleEmbedClient schedules={schedules} classes={classes} />;
}
