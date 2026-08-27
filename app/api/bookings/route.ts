import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { manilaNow } from "@/lib/time";
import { z } from "zod";

const postSchema = z.object({
  sessionId: z.string(),
  scheduleId: z.string(),
  subscriptionId: z.string().optional().nullable(),
  memberId: z.string().optional(),
  employeeId: z.string().optional(),
  scheduledDate: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const session = await getAuthSession();
  if (!session || !["ADMIN", "STAFF", "STORE"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const scheduleId = req.nextUrl.searchParams.get("scheduleId");
  if (!scheduleId) return NextResponse.json({ error: "scheduleId required" }, { status: 400 });
  const dateParam = req.nextUrl.searchParams.get("date");

  const bookings = await prisma.booking.findMany({
    where: {
      scheduleId,
      status: { not: "CANCELLED" },
      ...(dateParam ? { scheduledDate: new Date(dateParam + "T00:00:00Z") } : {}),
    },
    include: {
      member: {
        select: {
          id: true, firstName: true, lastName: true, photoUrl: true, memberNumber: true,
          subscriptions: {
            where: { status: "ACTIVE", OR: [{ endDate: null }, { endDate: { gte: new Date() } }] },
            include: { service: { select: { id: true, name: true, color: true } } },
            take: 10,
          },
        },
      },
      employee: {
        select: { id: true, firstName: true, lastName: true, photoUrl: true, employeeTypes: true },
      },
      subscription: {
        select: { id: true, sessionsTotal: true, sessionsUsed: true, status: true },
      },
    },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  return NextResponse.json(bookings);
}

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  const userId = (session.user as any).id;
  const parsed = postSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { sessionId, scheduleId, subscriptionId, memberId: bodyMemberId, employeeId: bodyEmployeeId, scheduledDate: scheduledDateRaw } = parsed.data;

  const scheduledDate = scheduledDateRaw ? new Date(scheduledDateRaw + "T00:00:00Z") : null;

  // Employee booking (staff adding an employee/coach)
  if (bodyEmployeeId && ["ADMIN", "STAFF", "STORE"].includes(role)) {
    if (subscriptionId) {
      const ownsSub = await prisma.subscription.findFirst({ where: { id: subscriptionId, employeeId: bodyEmployeeId } });
      if (!ownsSub) return NextResponse.json({ error: "Subscription does not belong to this employee" }, { status: 403 });
    }

    const existing = await prisma.booking.findFirst({
      where: {
        employeeId: bodyEmployeeId,
        scheduleId,
        status: { in: ["CONFIRMED", "ATTENDED"] },
        ...(scheduledDate ? { scheduledDate } : {}),
      },
    });
    if (existing) return NextResponse.json({ error: "Already booked" }, { status: 409 });

    const booking = await prisma.booking.create({
      data: {
        employeeId: bodyEmployeeId,
        sessionId,
        scheduleId,
        scheduledDate,
        subscriptionId: subscriptionId ?? null,
        status: "CONFIRMED",
        bookedById: userId,
      },
    });
    return NextResponse.json(booking, { status: 201 });
  }

  // Member booking
  let memberId: string;
  if (["ADMIN", "STAFF", "STORE"].includes(role) && bodyMemberId) {
    memberId = bodyMemberId;
  } else {
    const member = await prisma.member.findUnique({ where: { userId } });
    if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });
    memberId = member.id;
  }

  // All bookings require an active non-exhausted subscription — no exceptions for staff
  {
    const now = new Date();
    const activeSub = await prisma.subscription.findFirst({
      where: {
        memberId,
        status: "ACTIVE",
        OR: [
          { sessionsTotal: null, endDate: { gt: now } },
          { sessionsTotal: null, endDate: null },
          { sessionsTotal: { not: null } },
        ],
      },
    });
    const hasValidSub = !!activeSub && (
      activeSub.sessionsTotal === null
        ? (!activeSub.endDate || activeSub.endDate > now)
        : activeSub.sessionsUsed < (activeSub.sessionsTotal ?? Infinity)
    );
    if (!hasValidSub) {
      return NextResponse.json({
        error: "This member has no active membership. Assign a package first, then book the class.",
      }, { status: 403 });
    }
  }

  // Members cannot book classes whose end time has already passed today (tenant-local time)
  if (!["ADMIN", "STAFF", "STORE"].includes(role)) {
    const schedule = await prisma.classSchedule.findUnique({ where: { id: scheduleId }, select: { endTime: true, dayOfWeek: true } });
    if (schedule) {
      const { dayOfWeek: nowDay, hhmm } = manilaNow();
      const [endH, endM] = schedule.endTime.split(":").map(Number);
      const endMinutes = endH * 60 + endM;
      const [nowH, nowM] = hhmm.split(":").map(Number);
      const nowMinutes = nowH * 60 + nowM;
      if (nowDay === schedule.dayOfWeek && nowMinutes > endMinutes) {
        return NextResponse.json({ error: "This class has already ended. You can no longer book it." }, { status: 403 });
      }
    }
  }

  if (subscriptionId) {
    const ownsSub = await prisma.subscription.findFirst({ where: { id: subscriptionId, memberId } });
    if (!ownsSub) return NextResponse.json({ error: "Subscription does not belong to this member" }, { status: 403 });

    // Members can't book against a subscription that's already expired for this sport --
    // staff/admin bypass this the same way they bypass the "class already ended" check
    // above, since they may be recording something retroactively.
    if (!["ADMIN", "STAFF", "STORE"].includes(role) && ownsSub.endDate && ownsSub.endDate < new Date()) {
      return NextResponse.json({ error: "This subscription has expired and can't be used to book." }, { status: 403 });
    }
  }

  const existing = await prisma.booking.findFirst({
    where: {
      memberId,
      scheduleId,
      status: { in: ["CONFIRMED", "ATTENDED"] },
      ...(scheduledDate ? { scheduledDate } : {}),
    },
  });
  if (existing) return NextResponse.json({ error: "Already booked" }, { status: 409 });

  // Enforce class capacity
  const scheduleForCapacity = await prisma.classSchedule.findUnique({
    where: { id: scheduleId },
    select: { maxCapacity: true },
  });
  if (scheduleForCapacity?.maxCapacity != null) {
    const currentCount = await prisma.booking.count({
      where: {
        scheduleId,
        status: { not: "CANCELLED" },
        memberId: { not: null }, // employee/coach bookings don't count toward member capacity
        ...(scheduledDate ? { scheduledDate } : {}),
      },
    });
    if (currentCount >= scheduleForCapacity.maxCapacity) {
      return NextResponse.json({ error: "Class is full." }, { status: 409 });
    }
  }

  const booking = await prisma.booking.create({
    data: { memberId, sessionId, scheduleId, scheduledDate, subscriptionId: subscriptionId ?? null, status: "CONFIRMED", bookedById: userId },
  });

  return NextResponse.json(booking, { status: 201 });
}

// Transfer bookings from one schedule to another for a specific date
// Used when "edit this class" creates a one-time override and existing bookings need to follow
export async function PATCH(req: NextRequest) {
  const session = await getAuthSession();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { fromScheduleId, toScheduleId, date } = await req.json();
  if (!fromScheduleId || !toScheduleId || !date) {
    return NextResponse.json({ error: "fromScheduleId, toScheduleId and date required" }, { status: 400 });
  }
  const scheduledDate = new Date(date + "T00:00:00Z");
  const result = await prisma.booking.updateMany({
    where: { scheduleId: fromScheduleId, scheduledDate, status: { not: "CANCELLED" } },
    data: { scheduleId: toScheduleId },
  });
  return NextResponse.json({ transferred: result.count });
}
