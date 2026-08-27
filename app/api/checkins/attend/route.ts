import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { isValidKioskDevice } from "@/lib/kiosk-auth";
import { manilaDateStr, manilaDayBoundaries } from "@/lib/time";
import { z } from "zod";

const schema = z.object({
  memberId: z.string(),
  classIds: z.array(z.string()).min(1),
  scheduleId: z.string().optional(),
  scheduledDate: z.string().optional(),
});

// POST /api/checkins/attend
// Body: { memberId, classIds: string[], scheduleId?: string, scheduledDate?: string }
// - Records a check-in
// - For each class, finds the best matching active subscription and deducts 1 session if session-based
export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (!["ADMIN", "STAFF", "KIOSK"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (role === "KIOSK" && !(await isValidKioskDevice(req))) {
    return NextResponse.json({ error: "Unregistered device.", code: "invalid_device_token" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { memberId, classIds, scheduleId, scheduledDate: scheduledDateStr } = parsed.data;

  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: {
      subscriptions: {
        where: { status: "ACTIVE" },
        include: { service: true },
      },
    },
  });

  if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });
  if (member.status !== "ACTIVE") return NextResponse.json({ error: "Member is not active" }, { status: 400 });

  const scheduledDate = scheduledDateStr ? new Date(scheduledDateStr + "T00:00:00Z") : null;

  // Duplicate check-in guard — prevent double-attending the same day
  const manilaToday = manilaDateStr();
  const { start: dayStart, end: dayEnd } = manilaDayBoundaries(manilaToday);

  if (scheduleId) {
    const alreadyCheckedIn = await prisma.checkIn.findFirst({
      where: { memberId, scheduleId, checkedInAt: { gte: dayStart, lte: dayEnd } },
    });
    if (alreadyCheckedIn) {
      return NextResponse.json({ error: "Already checked in." }, { status: 409 });
    }
  } else {
    // HIGH-2: Walk-in duplicate check — same-day guard
    const alreadyCheckedIn = await prisma.checkIn.findFirst({
      where: { memberId, checkedInAt: { gte: dayStart, lte: dayEnd } },
    });
    if (alreadyCheckedIn) {
      return NextResponse.json({ error: "Already checked in today." }, { status: 409 });
    }
  }

  await prisma.$transaction(async (tx) => {
    // Record one check-in
    await tx.checkIn.create({ data: { memberId, scheduleId: scheduleId ?? null } });

    // For each selected class, deduct from the matching session-based subscription
    // and create/update a Booking record so attendance shows up on the schedule card
    for (const classId of classIds) {
      // Get allowed services for this class using ORM (no raw SQL)
      const allowed = await tx.classAllowedService.findMany({
        where: { classSessionId: classId },
        select: { serviceId: true },
      });
      const allowedServiceIds = allowed.map((a) => a.serviceId);

      // Find best matching active session-based subscription
      const matchingSub = member.subscriptions.find((s) => {
        const matches = allowedServiceIds.length === 0 || allowedServiceIds.includes(s.serviceId);
        return matches && s.sessionsTotal !== null && s.sessionsUsed < s.sessionsTotal;
      });

      // deductedSubId only gets set if the atomic guard below actually succeeded --
      // member.subscriptions was read outside the transaction, so a concurrent
      // check-in for the same member could have already exhausted this subscription's
      // sessions by the time we get here. updateMany + the sessionsUsed guard makes the
      // increment itself race-safe; a bare update() would let two concurrent requests
      // both pass the pre-check above and both increment past sessionsTotal.
      let deductedSubId: string | null = null;
      if (matchingSub) {
        const result = await tx.subscription.updateMany({
          where: { id: matchingSub.id, sessionsUsed: { lt: matchingSub.sessionsTotal! } },
          data: { sessionsUsed: { increment: 1 } },
        });
        if (result.count > 0) deductedSubId = matchingSub.id;
      }

      // Find the booking for this specific schedule+date occurrence; fall back to sessionId only if no scheduleId given
      const bookingWhere = scheduleId
        ? {
            memberId,
            scheduleId,
            status: { in: ["CONFIRMED", "ATTENDED"] as ("CONFIRMED" | "ATTENDED")[] },
            ...(scheduledDate ? { scheduledDate } : {}),
          }
        : { memberId, sessionId: classId, scheduleId: { not: null as string | null }, status: { in: ["CONFIRMED", "ATTENDED"] as ("CONFIRMED" | "ATTENDED")[] } };

      const existingBooking = await tx.booking.findFirst({ where: bookingWhere });

      if (existingBooking) {
        await tx.booking.update({
          where: { id: existingBooking.id },
          data: {
            status: "ATTENDED",
            // Only overwrite when a session-based subscription actually got deducted
            // here -- deductedSubId is null whenever the match was date-based/unlimited
            // (never considered for deduction above), and the booking's existing
            // subscriptionId from booking time is still the correct reference then.
            ...(deductedSubId ? { subscriptionId: deductedSubId } : {}),
          },
        });
      } else {
        await tx.booking.create({
          data: {
            memberId,
            sessionId: classId,
            scheduleId: scheduleId ?? null,
            scheduledDate,
            subscriptionId: deductedSubId,
            status: "ATTENDED",
            bookedById: (session.user as any).id ?? null,
          },
        });
      }
    }
  });

  return NextResponse.json({ ok: true });
}
