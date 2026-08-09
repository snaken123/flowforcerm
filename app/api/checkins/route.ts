import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { manilaDateStr, manilaDayBoundaries } from "@/lib/time";
import { isValidKioskDevice } from "@/lib/kiosk-auth";
import { z } from "zod";

const schema = z.object({
  memberId: z.string(),
  serviceId: z.string().optional(),
  classSessionId: z.string().optional(),
  scheduleId: z.string().optional(),
  notes: z.string().optional(),
  force: z.boolean().optional(),
});

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

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const member = await prisma.member.findUnique({ where: { id: parsed.data.memberId } });
  if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });
  if (member.status !== "ACTIVE") {
    // Allow INACTIVE members who have an active trial subscription
    const trialSub = await prisma.subscription.findFirst({
      where: {
        memberId: member.id,
        status: "ACTIVE",
        OR: [{ isTrial: true }, { price: 0, notes: { contains: "Free trial" } }],
      },
    });
    if (!trialSub) {
      return NextResponse.json({ error: "Member is not active" }, { status: 400 });
    }
  }

  // Same-day duplicate guard (Manila timezone) — warn staff, allow override with force: true
  if (!parsed.data.force) {
    const todayStr = manilaDateStr();
    const { start: dayStart, end: dayEnd } = manilaDayBoundaries(todayStr);
    const existing = await prisma.checkIn.findFirst({
      where: { memberId: parsed.data.memberId, checkedInAt: { gte: dayStart, lte: dayEnd } },
      orderBy: { checkedInAt: "desc" },
    });
    if (existing) {
      return NextResponse.json(
        { code: "already_checked_in_today", checkedInAt: existing.checkedInAt },
        { status: 409 }
      );
    }
  }

  // If a serviceId is provided, validate the oldest non-exhausted subscription (FIFO)
  if (parsed.data.serviceId) {
    const subs = await prisma.subscription.findMany({
      where: {
        memberId: parsed.data.memberId,
        serviceId: parsed.data.serviceId,
        status: { in: ["ACTIVE", "PAUSED"] },
      },
      orderBy: { startDate: "asc" },
    });
    const validSub = subs.find((s) => s.sessionsTotal === null || s.sessionsUsed < s.sessionsTotal);
    if (!validSub) {
      return NextResponse.json({ error: "No sessions remaining for this membership." }, { status: 400 });
    }
  }

  const checkIn = await prisma.checkIn.create({
    data: {
      memberId: parsed.data.memberId,
      serviceId: parsed.data.serviceId,
      classSessionId: parsed.data.classSessionId,
      scheduleId: parsed.data.scheduleId,
      notes: parsed.data.notes,
    },
    include: { member: true },
  });

  // Link check-in to an open free-trial follow-up (if any)
  if (parsed.data.serviceId) {
    const trialSub = await prisma.subscription.findFirst({
      where: {
        memberId: parsed.data.memberId,
        serviceId: parsed.data.serviceId,
        status: "ACTIVE",
        OR: [{ isTrial: true }, { price: 0, notes: { contains: "Free trial" } }],
      },
    });
    if (trialSub) {
      const existing = await prisma.freeTrialFollowUp.findUnique({
        where: { subscriptionId: trialSub.id },
      });
      if (existing && !existing.checkInId) {
        await prisma.freeTrialFollowUp.update({
          where: { id: existing.id },
          data: { checkInId: checkIn.id },
        });
      } else if (!existing) {
        await prisma.freeTrialFollowUp.create({
          data: {
            memberId: parsed.data.memberId,
            subscriptionId: trialSub.id,
            checkInId: checkIn.id,
          },
        });
      }
    }
  }

  return NextResponse.json(checkIn, { status: 201 });
}

export async function GET(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const getRole = (session.user as any).role;
  const getUserId = (session.user as any).id;

  if (!["ADMIN", "STAFF", "KIOSK", "MEMBER"].includes(getRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  let memberId = searchParams.get("memberId");

  // Members can only view their own check-ins
  if (getRole === "MEMBER") {
    const ownMember = await prisma.member.findUnique({ where: { userId: getUserId }, select: { id: true } });
    if (!ownMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    memberId = ownMember.id;
  }
  const scheduleId = searchParams.get("scheduleId");
  const dateParam = searchParams.get("date"); // YYYY-MM-DD in Manila time
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);

  let where: any = {};
  if (memberId) where.memberId = memberId;
  if (scheduleId) {
    where.scheduleId = scheduleId;
    // Use the provided date (Manila YYYY-MM-DD), or fall back to today in Manila (UTC+8)
    const str = dateParam ?? manilaDateStr();
    const { start: dayStart, end: dayEnd } = manilaDayBoundaries(str);
    where.checkedInAt = { gte: dayStart, lte: dayEnd };
  }

  const checkIns = await prisma.checkIn.findMany({
    where,
    orderBy: { checkedInAt: "desc" },
    take: limit,
    include: {
      member: { select: { id: true, firstName: true, lastName: true, memberNumber: true, photoUrl: true } },
    },
  });

  return NextResponse.json(checkIns);
}
