import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
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

  const existing = await prisma.booking.findUnique({
    where: { id: params.id },
    include: { subscription: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const booking = await prisma.booking.update({
    where: { id: params.id },
    data: { status },
  });

  // Deduct a session when manually marking ATTENDED (mirrors the check-in flow)
  if (status === "ATTENDED" && existing.status !== "ATTENDED" && existing.subscriptionId && existing.subscription?.sessionsTotal != null) {
    await prisma.subscription.updateMany({
      where: { id: existing.subscriptionId, sessionsUsed: { lt: existing.subscription.sessionsTotal } },
      data: { sessionsUsed: { increment: 1 } },
    });
    // Auto-expire if sessions exhausted
    const updated = await prisma.subscription.findUnique({ where: { id: existing.subscriptionId } });
    if (updated && updated.sessionsUsed >= (updated.sessionsTotal ?? Infinity)) {
      await prisma.subscription.update({ where: { id: existing.subscriptionId }, data: { status: "EXPIRED" } });
    }
  }

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
      const manilaToday = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
      const bookingDateStr = new Date(booking.scheduledDate).toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
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
    include: { subscription: true },
  });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (booking.status === "CANCELLED") {
    return NextResponse.json({ error: "Already cancelled" }, { status: 409 });
  }

  await prisma.booking.update({
    where: { id: params.id },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelReason: parsed.data.reason ?? null,
      sessionReturned: parsed.data.returnSession,
    },
  });

  // Return session to membership balance if applicable (prevent negative sessionsUsed)
  if (parsed.data.returnSession && booking.subscriptionId && booking.subscription?.sessionsTotal != null) {
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

  return NextResponse.json({ success: true });
}
