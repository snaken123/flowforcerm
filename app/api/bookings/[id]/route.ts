import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { manilaDateStr } from "@/lib/time";
import { isWithinCancellationCutoff, CANCELLATION_CUTOFF_HOURS } from "@/lib/booking-rules";
import { markBookingAttended } from "@/lib/booking-actions";
import { z } from "zod";

const cancelSchema = z.object({
  reason: z.string().optional(),
  returnSession: z.boolean().default(true),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAuthSession();
  if (!session || !["ADMIN", "STAFF", "STORE"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { status } = await req.json();
  if (!["CONFIRMED", "ATTENDED"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  if (status === "ATTENDED") {
    const booking = await markBookingAttended(params.id);
    if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(booking);
  }

  const existing = await prisma.booking.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const booking = await prisma.booking.update({
    where: { id: params.id },
    data: { status },
  });

  return NextResponse.json(booking);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  // Members can only cancel their own non-past, non-attended bookings
  if (!["ADMIN", "STAFF", "STORE"].includes(role)) {
    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: { member: { select: { userId: true } } },
    });
    if (!booking || booking.member?.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (booking.status === "ATTENDED") {
      return NextResponse.json({ error: "Cannot cancel a past or attended booking." }, { status: 403 });
    }
    if (booking.scheduledDate) {
      const manilaToday = manilaDateStr();
      const bookingDateStr = manilaDateStr(new Date(booking.scheduledDate));
      if (bookingDateStr < manilaToday) {
        return NextResponse.json({ error: "Cannot cancel a past or attended booking." }, { status: 403 });
      }
    }
  }

  const body = await req.json().catch(() => ({}));
  const parsed = cancelSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const booking = await prisma.booking.findUnique({
    where: { id: params.id },
    include: {
      subscription: true,
      schedule: { select: { startTime: true } },
    },
  });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (booking.status === "CANCELLED") {
    return NextResponse.json({ error: "Already cancelled" }, { status: 409 });
  }
  // Once attendance is marked, the booking is a historical record — nobody, including
  // admin/staff, can cancel it. Members already hit an equivalent check above; this
  // covers admin/staff/store, which previously had no such restriction.
  if (booking.status === "ATTENDED") {
    return NextResponse.json({ error: "Cannot cancel a booking that has already been attended." }, { status: 403 });
  }

  // For member self-cancellation, enforce the 4-hour rule server-side:
  // session is only returned if cancellation is more than 4 hours before class start.
  let effectiveReturnSession = parsed.data.returnSession;
  let withinCutoff = false;
  const isMemberCancelling = !["ADMIN", "STAFF", "STORE"].includes(role);
  if (isMemberCancelling && booking.scheduledDate && booking.schedule?.startTime) {
    const dateStr = booking.scheduledDate.toISOString().slice(0, 10);
    withinCutoff = isWithinCancellationCutoff(dateStr, booking.schedule.startTime);
    effectiveReturnSession = !withinCutoff;
  }

  // Auto-logged on the booking's own notes so anyone looking at the Logbook can see what
  // happened to a cancelled entry without opening the member's record -- appended, not
  // overwritten, so a front-desk note added before cancellation isn't lost.
  const cancellerName = session.user?.name ?? session.user?.email ?? "Unknown";
  const cancelNote = isMemberCancelling && withinCutoff
    ? `Canceled by ${cancellerName}. Canceled less than ${CANCELLATION_CUTOFF_HOURS} hours before class — session not returned.`
    : `Canceled by ${cancellerName}. ${effectiveReturnSession ? "Returned session." : "Session not returned."}`;

  await prisma.booking.update({
    where: { id: params.id },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelReason: parsed.data.reason ?? null,
      sessionReturned: effectiveReturnSession,
      notes: [booking.notes, cancelNote].filter(Boolean).join("\n"),
    },
  });

  // Return session to membership balance if applicable (prevent negative sessionsUsed)
  if (effectiveReturnSession && booking.subscriptionId && booking.subscription?.sessionsTotal != null) {
    await prisma.subscription.updateMany({
      where: { id: booking.subscriptionId, sessionsUsed: { gt: 0 } },
      data: { sessionsUsed: { decrement: 1 } },
    });
    // If it was expired due to sessions, re-activate it
    if (booking.subscription.status === "EXPIRED" && booking.subscription.sessionsUsed <= booking.subscription.sessionsTotal) {
      await prisma.subscription.update({
        where: { id: booking.subscriptionId },
        data: { status: "ACTIVE" },
      });
    }
  }

  return NextResponse.json({ success: true, withinCutoff, sessionReturned: effectiveReturnSession });
}
