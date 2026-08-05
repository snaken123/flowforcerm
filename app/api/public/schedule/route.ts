// Public schedule endpoint — returns only safe data (class names, times, days).
// No coach names, no capacity numbers, no internal IDs.
// The schedule embed widget (/embed/schedule) should use this endpoint instead of /api/schedules.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const schedules = await prisma.classSchedule.findMany({
    where: { isActive: true },
    select: {
      dayOfWeek: true,
      startTime: true,
      endTime: true,
      location: true,
      isRecurring: true,
      startDate: true,
      endDate: true,
      classDef: {
        select: {
          name: true,
          color: true,
          classType: true,
        },
      },
    },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  return NextResponse.json(schedules);
}
