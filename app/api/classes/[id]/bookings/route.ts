import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAuthSession();
  if (!session || !["ADMIN", "STAFF", "STORE"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(_req.url);
  const scheduleId = url.searchParams.get("scheduleId");
  const scheduledDate = url.searchParams.get("scheduledDate");

  const bookings = await prisma.booking.findMany({
    where: {
      sessionId: params.id,
      status: { in: ["CONFIRMED", "ATTENDED"] },
      ...(scheduleId ? { scheduleId } : {}),
      ...(scheduledDate ? { scheduledDate: new Date(scheduledDate + "T00:00:00Z") } : {}),
    },
    include: {
      member: { select: { id: true, firstName: true, lastName: true, memberNumber: true, photoUrl: true } },
      subscription: { select: { service: { select: { name: true, color: true } } } },
    },
    orderBy: [{ member: { lastName: "asc" } }, { member: { firstName: "asc" } }],
  });

  return NextResponse.json(bookings);
}
