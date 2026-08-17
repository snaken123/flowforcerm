import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { manilaDateStr } from "@/lib/time";
import { z } from "zod";

const MEMBER_INCLUDE = {
  id: true,
  firstName: true,
  lastName: true,
  memberNumber: true,
  subscriptions: {
    where: { status: { in: ["ACTIVE", "PAUSED"] as ("ACTIVE" | "PAUSED")[] } },
    include: { service: { select: { name: true } } },
  },
};

const BOOKING_INCLUDE = {
  member: { select: MEMBER_INCLUDE },
  schedule: { select: { startTime: true, classDef: { select: { name: true } } } },
  subscription: {
    select: { id: true, sessionsUsed: true, sessionsTotal: true, endDate: true, service: { select: { name: true } } },
  },
};

// Calendar-date-string -> day-of-week (0=Sun...6=Sat), without going through a Date
// object re-interpreted in a timezone -- avoids the day possibly shifting for tenants
// behind UTC. Mirrors the math in lib/time.ts's manilaDayOfWeek().
function dayOfWeekFromDateStr(dateStr: string): number {
  const [y, m, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day)).getUTCDay();
}

// GET /api/logbook?date=YYYY-MM-DD (defaults to today) -- every booking that belongs to
// that day, whether it has an explicit scheduledDate or is a recurring booking (no
// scheduledDate) whose weekly schedule slot falls on that day. Mirrors the same
// OR-null-date pattern already used for the coach dashboard's "today's classes".
//
// GET /api/logbook?start=YYYY-MM-DD&end=YYYY-MM-DD -- for the Reports page's multi-date
// view instead. Deliberately does NOT expand null-scheduledDate recurring bookings across
// every matching weekday in the range (unlike the single-day case above) -- a report
// should show what was actually recorded, not a synthetic projection of classes that may
// not even have run yet.
export async function GET(req: NextRequest) {
  const session = await getAuthSession();
  if (!session || !["ADMIN", "STAFF"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const startParam = req.nextUrl.searchParams.get("start");
  const endParam = req.nextUrl.searchParams.get("end");

  const where = startParam
    ? {
        scheduledDate: {
          gte: new Date(startParam + "T00:00:00Z"),
          lte: new Date((endParam ?? startParam) + "T00:00:00Z"),
        },
      }
    : (() => {
        const dateStr = req.nextUrl.searchParams.get("date") ?? manilaDateStr();
        const dayOfWeek = dayOfWeekFromDateStr(dateStr);
        return {
          OR: [
            { scheduledDate: new Date(dateStr + "T00:00:00Z") },
            { scheduledDate: null, schedule: { dayOfWeek, isActive: true } },
          ],
        };
      })();

  const bookings = await prisma.booking.findMany({
    where,
    include: BOOKING_INCLUDE,
    orderBy: [{ scheduledDate: "asc" }, { schedule: { startTime: "asc" } }, { createdAt: "asc" }],
  });

  return NextResponse.json(bookings);
}

const postSchema = z.object({
  memberId: z.string(),
  scheduleId: z.string().optional(),
  subscriptionId: z.string().optional(),
});

// POST /api/logbook -- front-desk manual entry, distinct from the member-facing
// /api/bookings POST: no active-subscription requirement, no capacity/cutoff checks,
// and the class/schedule is optional (a walk-in doesn't have to belong to one).
export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session || !["ADMIN", "STAFF"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = postSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { memberId, scheduleId, subscriptionId } = parsed.data;

  let sessionId: string;
  if (scheduleId) {
    const schedule = await prisma.classSchedule.findUnique({ where: { id: scheduleId }, select: { classId: true } });
    if (!schedule) return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    sessionId = schedule.classId;
  } else {
    // No class chosen (pure walk-in) -- Booking.sessionId is required, so fall back to
    // any existing class session as a placeholder; the logbook display doesn't show it
    // when there's no scheduleId anyway.
    const firstSession = await prisma.classSession.findFirst({ select: { id: true } });
    if (!firstSession) return NextResponse.json({ error: "No classes configured yet." }, { status: 400 });
    sessionId = firstSession.id;
  }

  const booking = await prisma.booking.create({
    data: {
      memberId,
      sessionId,
      scheduleId: scheduleId ?? null,
      scheduledDate: new Date(manilaDateStr() + "T00:00:00Z"),
      subscriptionId: subscriptionId ?? null,
      status: "CONFIRMED",
      bookedById: (session.user as any).id,
    },
    include: BOOKING_INCLUDE,
  });

  return NextResponse.json(booking, { status: 201 });
}
