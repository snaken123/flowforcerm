import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization");
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Find all CONFIRMED bookings where the scheduled class date has already passed
  const overdueBookings = await prisma.booking.findMany({
    where: {
      status: "CONFIRMED",
      scheduledDate: { lt: now },
    },
    include: {
      subscription: true,
    },
  });

  let deducted = 0;
  let skipped = 0;

  async function processBooking(booking: (typeof overdueBookings)[number]) {
    // Mark as NO_SHOW regardless of subscription type
    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: "NO_SHOW" },
    });

    // Deduct session only if subscription exists and is not unlimited
    if (booking.subscriptionId && booking.subscription && booking.subscription.sessionsTotal !== null) {
      const updated = await prisma.subscription.update({
        where: { id: booking.subscriptionId },
        data: { sessionsUsed: { increment: 1 } },
      });
      if (updated.sessionsUsed >= updated.sessionsTotal!) {
        await prisma.subscription.update({ where: { id: booking.subscriptionId }, data: { status: "EXPIRED" } });
      }
      deducted++;
    } else {
      skipped++;
    }
  }

  // Process in small batches instead of one booking at a time -- each booking is
  // independent, so this cuts wall-clock time roughly by the batch size with no
  // added risk.
  const BATCH_SIZE = 10;
  for (let i = 0; i < overdueBookings.length; i += BATCH_SIZE) {
    const batch = overdueBookings.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(processBooking));
  }

  return NextResponse.json({ processed: overdueBookings.length, deducted, skipped });
}
