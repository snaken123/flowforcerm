import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { manilaDateStr } from "@/lib/time";
import { z } from "zod";

const schema = z.object({
  classId: z.string().optional(),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  location: z.string().nullable().optional(),
  maxCapacity: z.number().int().positive().nullable().optional(),
  coachIds: z.array(z.string()).optional(),
  endDate: z.string().nullable().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAuthSession();
  if (!session || !["ADMIN", "STAFF", "STORE"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const schedule = await prisma.classSchedule.findUnique({ where: { id: params.id } });
  if (!schedule) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const bookingCount = await prisma.booking.count({
    where: { scheduleId: params.id, status: { not: "CANCELLED" } },
  });
  return NextResponse.json({ bookingCount });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAuthSession();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { coachIds, endDate, ...rest } = parsed.data;

  const updated = await prisma.classSchedule.update({
    where: { id: params.id },
    data: {
      ...rest,
      ...(endDate !== undefined && { endDate: endDate ? new Date(endDate + "T00:00:00Z") : null }),
      ...(coachIds !== undefined && {
        coaches: {
          deleteMany: {},
          create: coachIds.map((eid) => ({ employeeId: eid })),
        },
      }),
    },
    include: {
      classDef: true,
      coaches: { include: { employee: { select: { id: true, firstName: true, lastName: true } } } },
    },
  });

  await logAudit({
    userId: (session.user as any).id,
    userName: session.user?.name ?? session.user?.email ?? "Unknown",
    action: "UPDATE_SCHEDULE",
    entityType: "ClassSchedule",
    entityId: params.id,
    entityName: updated.classDef?.name ?? "Unknown class",
    description: `Updated schedule for ${updated.classDef?.name}`,
    metadata: parsed.data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAuthSession();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  // mode: "this" | "succeeding" | "all"
  // date: ISO date string of the clicked session (required for "this" and "succeeding")
  // force: skip booking warning
  const { mode = "all", date: dateStr, force = false } = body;

  const schedule = await prisma.classSchedule.findUnique({
    where: { id: params.id },
    include: { classDef: true },
  });
  if (!schedule) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Block past sessions — compare Manila date strings to avoid UTC/local mismatch
  if (dateStr && dateStr < manilaDateStr()) {
    return NextResponse.json({ error: "Past sessions cannot be deleted." }, { status: 400 });
  }

  // Check bookings (warn unless forced)
  const bookings = await prisma.booking.findMany({
    where: { scheduleId: params.id, status: { not: "CANCELLED" } },
    include: {
      member: { select: { firstName: true, lastName: true } },
      employee: { include: { user: { select: { name: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });

  if (bookings.length > 0 && !force) {
    return NextResponse.json({
      hasBookings: true,
      count: bookings.length,
      className: schedule.classDef?.name,
      athletes: bookings.map((b) =>
        b.member
          ? `${b.member.firstName} ${b.member.lastName}`
          : b.employee
            ? `${b.employee.user?.name ?? "Staff"} (staff)`
            : "Unknown"
      ),
    }, { status: 409 });
  }

  if (mode === "this" && dateStr) {
    const date = new Date(`${dateStr}T00:00:00Z`);
    await prisma.classScheduleException.upsert({
      where: { scheduleId_date: { scheduleId: params.id, date } },
      create: { scheduleId: params.id, date },
      update: {},
    });
    await logAudit({
      userId: (session.user as any).id,
      userName: session.user?.name ?? session.user?.email ?? "Unknown",
      action: "CANCEL_SCHEDULE_SESSION",
      entityType: "ClassSchedule",
      entityId: params.id,
      entityName: schedule.classDef?.name ?? "Unknown class",
      description: `Cancelled single session of ${schedule.classDef?.name} on ${dateStr}`,
      metadata: { mode, date: dateStr },
    });
    return NextResponse.json({ ok: true, action: "exception_created" });
  }

  if (mode === "succeeding" && dateStr) {
    const date = new Date(`${dateStr}T00:00:00Z`);
    const dayBefore = new Date(date);
    dayBefore.setDate(dayBefore.getDate() - 1);
    await prisma.classSchedule.update({
      where: { id: params.id },
      data: { endDate: dayBefore },
    });
    await logAudit({
      userId: (session.user as any).id,
      userName: session.user?.name ?? session.user?.email ?? "Unknown",
      action: "END_SCHEDULE",
      entityType: "ClassSchedule",
      entityId: params.id,
      entityName: schedule.classDef?.name ?? "Unknown class",
      description: `Ended ${schedule.classDef?.name} schedule from ${dateStr} onwards`,
      metadata: { mode, date: dateStr },
    });
    return NextResponse.json({ ok: true, action: "end_date_set" });
  }

  // Default: delete entire schedule
  await prisma.classSchedule.delete({ where: { id: params.id } });
  await logAudit({
    userId: (session.user as any).id,
    userName: session.user?.name ?? session.user?.email ?? "Unknown",
    action: "DELETE_SCHEDULE",
    entityType: "ClassSchedule",
    entityId: params.id,
    entityName: schedule.classDef?.name ?? "Unknown class",
    description: `Deleted entire schedule for ${schedule.classDef?.name}`,
    metadata: { mode },
  });
  return NextResponse.json({ ok: true, action: "deleted" });
}
