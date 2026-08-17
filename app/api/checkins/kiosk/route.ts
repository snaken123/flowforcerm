import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { manilaNow } from "@/lib/time";
import { z } from "zod";
import { requireFeature, FLAG_SPECIALIZED_ROLES } from "@/lib/feature-flags";

const schema = z.object({
  memberId: z.string(),
});

const COOLDOWN_MINUTES = 30;

export async function POST(req: NextRequest) {
  const gate = requireFeature(FLAG_SPECIALIZED_ROLES);
  if (gate) return gate;

  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const now = new Date();
  const cooldownTime = new Date(Date.now() - COOLDOWN_MINUTES * 60 * 1000);

  const [member, validSub, recent] = await Promise.all([
    prisma.member.findUnique({
      where: { id: parsed.data.memberId },
      select: { id: true, firstName: true, lastName: true, photoUrl: true, status: true, memberNumber: true },
    }),
    prisma.subscription.findFirst({
      where: {
        memberId: parsed.data.memberId,
        status: "ACTIVE",
        OR: [
          { sessionsTotal: null, endDate: { gt: now } },
          { sessionsTotal: null, endDate: null },
          { sessionsTotal: { not: null } },
        ],
      },
    }),
    prisma.checkIn.findFirst({
      where: {
        memberId: parsed.data.memberId,
        checkedInAt: { gte: cooldownTime },
      },
    }),
  ]);

  if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });
  if (member.status !== "ACTIVE") {
    return NextResponse.json({ error: "Member is not active", member }, { status: 400 });
  }

  const hasValidSub = !!validSub && (
    validSub.sessionsTotal === null
      ? (!validSub.endDate || validSub.endDate > now)
      : validSub.sessionsUsed < (validSub.sessionsTotal ?? Infinity)
  );

  if (!hasValidSub) {
    return NextResponse.json({ error: "No active membership on file.", member }, { status: 403 });
  }

  if (recent) {
    return NextResponse.json(
      { error: "Already checked in recently", member, checkedInAt: recent.checkedInAt },
      { status: 409 }
    );
  }

  // Auto-link to the current schedule slot (Manila time, UTC+8)
  let autoScheduleId: string | null = null;
  try {
    const { dayOfWeek, hhmm } = manilaNow();

    // Get the member's active service IDs
    const activeSubs = await prisma.subscription.findMany({
      where: {
        memberId: parsed.data.memberId,
        status: { in: ["ACTIVE", "PAUSED"] },
      },
      select: { serviceId: true },
    });
    const serviceIds = [...new Set(activeSubs.map((s) => s.serviceId))];

    if (serviceIds.length > 0) {
      // Find schedule slots running right now for those services
      const slots = await prisma.classSchedule.findMany({
        where: {
          isActive: true,
          dayOfWeek,
          startTime: { lte: hhmm },
          endTime: { gt: hhmm },
          classDef: {
            allowedServices: { some: { serviceId: { in: serviceIds } } },
          },
        },
        select: { id: true },
      });
      if (slots.length === 1) autoScheduleId = slots[0].id;
    }
  } catch {}

  const checkIn = await prisma.checkIn.create({
    data: {
      memberId: parsed.data.memberId,
      scheduleId: autoScheduleId ?? undefined,
      notes: "Face recognition kiosk",
    },
  });

  return NextResponse.json({ ok: true, checkIn, member }, { status: 201 });
}
