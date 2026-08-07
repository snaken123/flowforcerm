import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { manilaDateStr, manilaDayBoundaries, manilaDayOfWeek } from "@/lib/time";

export async function GET() {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const dow = manilaDayOfWeek(now); // 0=Sun ... 6=Sat
  const todayStr = manilaDateStr(now);
  const todayMidnight = manilaDayBoundaries(todayStr).start;

  const schedules = await prisma.classSchedule.findMany({
    where: {
      dayOfWeek: dow,
      isActive: true,
      OR: [{ endDate: null }, { endDate: { gte: todayMidnight } }],
    },
    include: {
      classDef: {
        select: {
          id: true,
          name: true,
          color: true,
          location: true,
          allowedServices: { select: { serviceId: true } },
        },
      },
      coaches: {
        include: { employee: { select: { firstName: true, lastName: true } } },
      },
      exceptions: { select: { date: true } },
    },
    orderBy: { startTime: "asc" },
  });

  // Filter out exceptions for today
  const filtered = schedules.filter((s) => {
    return !s.exceptions.some((ex) => manilaDateStr(new Date(ex.date)) === todayStr);
  });

  return NextResponse.json(filtered);
}
