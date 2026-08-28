import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { markBookingAttended, cancelBookingByStaff } from "@/lib/booking-actions";
import { z } from "zod";

const patchSchema = z.object({
  notes: z.string().max(2000).optional(),
  subscriptionId: z.string().optional(),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  scheduleId: z.string().optional(),
  status: z.enum(["CONFIRMED", "ATTENDED", "CANCELLED"]).optional(),
});

const BOOKING_INCLUDE = {
  member: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      memberNumber: true,
      subscriptions: {
        where: { status: { in: ["ACTIVE", "PAUSED"] as ("ACTIVE" | "PAUSED")[] } },
        include: { service: { select: { name: true } } },
      },
    },
  },
  schedule: { select: { startTime: true, classDef: { select: { name: true } } } },
  subscription: {
    select: { id: true, sessionsUsed: true, sessionsTotal: true, endDate: true, service: { select: { name: true } } },
  },
};

// `status` transitions (ATTENDED/CANCELLED) delegate to lib/booking-actions.ts so the
// session-deduction/refund and CheckIn side effects stay identical to every other path
// that can attend or cancel a booking (api/bookings/[id], api/checkins/attend). The
// other fields here (notes, subscriptionId swap, date/schedule correction) have no side
// effects of their own and are applied directly.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAuthSession();
  if (!session || !["ADMIN", "STAFF"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { notes, subscriptionId, scheduledDate, scheduleId, status } = parsed.data;
  if (notes === undefined && subscriptionId === undefined && scheduledDate === undefined && scheduleId === undefined && status === undefined) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  if (status === "ATTENDED") {
    const booking = await markBookingAttended(params.id);
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  } else if (status === "CANCELLED") {
    const booking = await cancelBookingByStaff(params.id);
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  } else if (status === "CONFIRMED") {
    // Reverting to CONFIRMED is a direct status set only -- there's no defined behavior
    // for un-deducting a session or un-checking-in from an ATTENDED entry, and no caller
    // currently offers that transition, so it's intentionally out of scope here.
    const existing = await prisma.booking.findUnique({ where: { id: params.id }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    await prisma.booking.update({ where: { id: params.id }, data: { status: "CONFIRMED" } });
  }

  if (subscriptionId !== undefined) {
    const existing = await prisma.booking.findUnique({ where: { id: params.id }, select: { memberId: true } });
    if (!existing?.memberId) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    const ownsSub = await prisma.subscription.findFirst({
      where: { id: subscriptionId, memberId: existing.memberId },
    });
    if (!ownsSub) return NextResponse.json({ error: "Subscription does not belong to this member" }, { status: 403 });
  }

  // Correcting which class this entry is for -- keep sessionId (the class def) in sync
  // with the new schedule, same as /api/logbook's POST, so the "Class" column stays right.
  let sessionId: string | undefined;
  if (scheduleId !== undefined) {
    const schedule = await prisma.classSchedule.findUnique({ where: { id: scheduleId }, select: { classId: true } });
    if (!schedule) return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    sessionId = schedule.classId;
  }

  const hasOtherFields = notes !== undefined || subscriptionId !== undefined || scheduledDate !== undefined || scheduleId !== undefined;

  // A status-only PATCH already persisted its change via the helpers above -- avoid a
  // second, field-less prisma.update() call here and just re-fetch for the response.
  const booking = hasOtherFields
    ? await prisma.booking.update({
        where: { id: params.id },
        data: {
          ...(notes !== undefined ? { notes } : {}),
          ...(subscriptionId !== undefined ? { subscriptionId } : {}),
          ...(scheduledDate !== undefined ? { scheduledDate: new Date(scheduledDate + "T00:00:00Z") } : {}),
          ...(scheduleId !== undefined ? { scheduleId, sessionId } : {}),
        },
        include: BOOKING_INCLUDE,
      })
    : await prisma.booking.findUnique({ where: { id: params.id }, include: BOOKING_INCLUDE });

  return NextResponse.json(booking);
}
