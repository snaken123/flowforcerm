import { prisma } from "./db";

// Shared by every code path that can transition a booking to ATTENDED (member check-in
// flow has its own inline copy for transactional reasons -- see api/checkins/attend --
// but the manual "mark attended" paths all funnel through here now) so session
// deduction and CheckIn creation can't drift out of sync between them. Only applies
// side effects on an actual CONFIRMED -> ATTENDED transition, not a redundant call.
export async function markBookingAttended(bookingId: string) {
  const existing = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { subscription: true },
  });
  if (!existing) return null;

  const booking = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "ATTENDED" },
  });

  if (existing.status !== "ATTENDED") {
    if (existing.subscriptionId && existing.subscription?.sessionsTotal != null) {
      await prisma.subscription.updateMany({
        where: { id: existing.subscriptionId, sessionsUsed: { lt: existing.subscription.sessionsTotal } },
        data: { sessionsUsed: { increment: 1 } },
      });
      const updated = await prisma.subscription.findUnique({ where: { id: existing.subscriptionId } });
      if (updated && updated.sessionsUsed >= (updated.sessionsTotal ?? Infinity)) {
        await prisma.subscription.update({ where: { id: existing.subscriptionId }, data: { status: "EXPIRED" } });
      }
    }
    // The dashboard's "Today's Check-ins" card queries CheckIn, not booking.status --
    // every attendance path needs to write one or that counter silently undercounts.
    if (existing.memberId) {
      await prisma.checkIn.create({ data: { memberId: existing.memberId, scheduleId: existing.scheduleId ?? null } });
    }
  }

  return booking;
}

// Staff-initiated cancellation from the logbook's status field. Deliberately simpler
// than DELETE /api/bookings/[id]'s member-facing path (no 4-hour cutoff calculation,
// no audit-note trail) -- this is only reachable by ADMIN/STAFF, who already bypass
// the cutoff entirely on that route too.
export async function cancelBookingByStaff(bookingId: string, returnSession = true) {
  const existing = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { subscription: true },
  });
  if (!existing || existing.status === "CANCELLED") return existing ?? null;

  const booking = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED", cancelledAt: new Date(), sessionReturned: returnSession },
  });

  if (returnSession && existing.subscriptionId && existing.subscription?.sessionsTotal != null) {
    await prisma.subscription.updateMany({
      where: { id: existing.subscriptionId, sessionsUsed: { gt: 0 } },
      data: { sessionsUsed: { decrement: 1 } },
    });
    if (existing.subscription.status === "EXPIRED") {
      const updated = await prisma.subscription.findUnique({ where: { id: existing.subscriptionId } });
      if (updated && updated.sessionsUsed <= (updated.sessionsTotal ?? 0)) {
        await prisma.subscription.update({ where: { id: existing.subscriptionId }, data: { status: "ACTIVE" } });
      }
    }
  }

  return booking;
}
