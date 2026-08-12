import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { dispatchAnnouncement } from "@/lib/announcement-dispatch";

// Picks up announcements whose scheduled send time has arrived and haven't been
// notified yet (immediate ones are dispatched synchronously in POST /api/announcements
// and stamp notifiedAt right away, so this only ever finds future-scheduled ones).
export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization");
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const due = await prisma.announcement.findMany({
    where: {
      notifiedAt: null,
      sendAt: { lte: new Date() },
      OR: [{ sendEmail: true }, { sendSms: true }],
    },
  });

  let dispatched = 0;
  for (const a of due) {
    try {
      await dispatchAnnouncement(a);
      await prisma.announcement.update({ where: { id: a.id }, data: { notifiedAt: new Date() } });
      dispatched++;
    } catch (e) {
      console.error(`[cron/dispatch-announcements] failed for ${a.id}:`, e instanceof Error ? e.message : e);
    }
  }

  return NextResponse.json({ processed: due.length, dispatched });
}
