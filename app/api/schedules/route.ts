import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const schema = z.object({
  classId: z.string(),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  location: z.string().optional(),
  maxCapacity: z.number().int().positive().optional(),
  coachIds: z.array(z.string()).optional(),
  isRecurring: z.boolean().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { coachIds, startDate, endDate, ...rest } = parsed.data;

  const schedule = await prisma.classSchedule.create({
    data: {
      ...rest,
      startDate: startDate ? new Date(startDate + "T00:00:00Z") : null,
      endDate: endDate ? new Date(endDate + "T00:00:00Z") : null,
      coaches: coachIds?.length
        ? { create: coachIds.map((eid) => ({ employeeId: eid })) }
        : undefined,
    },
    include: {
      classDef: true,
      coaches: { include: { employee: { select: { id: true, firstName: true, lastName: true } } } },
    },
  });

  await logAudit({
    userId: (session.user as any).id,
    userName: session.user?.name ?? session.user?.email ?? "Unknown",
    action: "CREATE_SCHEDULE",
    entityType: "ClassSchedule",
    entityId: schedule.id,
    entityName: schedule.classDef?.name ?? "Unknown class",
    description: `Created schedule for ${schedule.classDef?.name} on day ${schedule.dayOfWeek} at ${schedule.startTime}–${schedule.endTime}`,
    metadata: { classId: schedule.classId, dayOfWeek: schedule.dayOfWeek, startTime: schedule.startTime, endTime: schedule.endTime },
  });

  return NextResponse.json(schedule, { status: 201 });
}

export async function GET() {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const schedules = await prisma.classSchedule.findMany({
    where: { isActive: true },
    include: {
      classDef: true,
      coaches: { include: { employee: { select: { id: true, firstName: true, lastName: true } } } },
    },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
  return NextResponse.json(schedules);
}
