import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { z } from "zod";

const patchSchema = z.object({
  notes: z.string().max(2000).optional(),
  subscriptionId: z.string().optional(),
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

// Attendance-marking and cancellation reuse the existing /api/bookings/[id] PATCH and
// DELETE routes (same session-deduction/re-activation logic) -- this route only covers
// the two logbook-specific edits those don't handle: notes and swapping which
// subscription a booking is attributed to.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAuthSession();
  if (!session || !["ADMIN", "STAFF"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  if (parsed.data.notes === undefined && parsed.data.subscriptionId === undefined) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const booking = await prisma.booking.update({
    where: { id: params.id },
    data: {
      ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
      ...(parsed.data.subscriptionId !== undefined ? { subscriptionId: parsed.data.subscriptionId } : {}),
    },
    include: BOOKING_INCLUDE,
  });

  return NextResponse.json(booking);
}
