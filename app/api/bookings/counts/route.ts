import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";

// Returns { bookings: { [scheduleId]: count }, checkIns: { [scheduleId]: count } }
// scoped to the 7-day window starting at weekStart (YYYY-MM-DD, stored as UTC midnight).
export async function GET(req: NextRequest) {
  const session = await getAuthSession();
  if (!session || !["ADMIN", "STAFF", "STORE"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const weekStartParam = req.nextUrl.searchParams.get("weekStart");
  if (!weekStartParam) return NextResponse.json({ bookings: {}, checkIns: {} });

  const weekStart = new Date(weekStartParam + "T00:00:00Z");
  // weekEnd is the start of day 7 (exclusive upper bound inclusive of day 6)
  const weekEndInclusive = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);

  const [bookingCounts, checkInCounts] = await Promise.all([
    prisma.booking.groupBy({
      by: ["scheduleId"],
      where: {
        scheduleId: { not: null },
        status: { not: "CANCELLED" },
        scheduledDate: { gte: weekStart, lte: weekEndInclusive },
      },
      _count: { id: true },
    }),
    prisma.checkIn.groupBy({
      by: ["scheduleId"],
      where: {
        scheduleId: { not: null },
        checkedInAt: { gte: weekStart, lte: weekEndInclusive },
      },
      _count: { id: true },
    }),
  ]);

  const bookings: Record<string, number> = {};
  for (const c of bookingCounts) {
    if (c.scheduleId) bookings[c.scheduleId] = c._count.id;
  }
  const checkIns: Record<string, number> = {};
  for (const c of checkInCounts) {
    if (c.scheduleId) checkIns[c.scheduleId] = c._count.id;
  }

  return NextResponse.json({ bookings, checkIns });
}
