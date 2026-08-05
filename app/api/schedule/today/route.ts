import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";

export async function GET() {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Manila time: UTC+8
  const now = new Date();
  const manilaOffset = 8 * 60;
  const manilaMs = now.getTime() + (manilaOffset - now.getTimezoneOffset()) * 60000;
  const manila = new Date(manilaMs);
  const dow = manila.getDay(); // 0=Sun ... 6=Sat

  const todayMidnight = new Date(manila);
  todayMidnight.setHours(0, 0, 0, 0);

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
    return !s.exceptions.some((ex) => {
      const exDate = new Date(ex.date);
      return (
        exDate.getFullYear() === manila.getFullYear() &&
        exDate.getMonth() === manila.getMonth() &&
        exDate.getDate() === manila.getDate()
      );
    });
  });

  return NextResponse.json(filtered);
}
