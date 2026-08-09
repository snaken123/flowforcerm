import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import { addMonths } from "date-fns";
import { nextMemberNumber } from "@/lib/member-number";

const createSchema = z.object({
  memberId: z.string().optional(),
  employeeId: z.string().optional(),
  serviceId: z.string(),
  packageId: z.string().optional(),
  billingCycle: z.enum(["MONTHLY", "QUARTERLY", "SEMI_ANNUAL", "ANNUAL"]).default("MONTHLY"),
  price: z.number().min(0),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sessionsTotal: z.number().int().positive().nullable().optional(),
  notes: z.string().max(500).optional(),
  paymentMethod: z.string().optional(),
  needsReceipt: z.boolean().optional(),
  receiptUrl: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  const { searchParams } = new URL(req.url);
  const memberId = searchParams.get("memberId");
  const employeeId = searchParams.get("employeeId");
  const status = searchParams.get("status");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = 100;

  if (role === "MEMBER") {
    // Members can only view their own subscriptions
    const ownMember = await prisma.member.findUnique({ where: { userId }, select: { id: true } });
    if (!ownMember || memberId !== ownMember.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (!["ADMIN", "STAFF"].includes(role)) {
    // HIGH-6: STORE role blocked from subscription enumeration
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const where = {
    ...(memberId ? { memberId } : {}),
    ...(employeeId ? { employeeId } : {}),
    ...(status ? { status: status as any } : {}),
  };

  const [subs, total] = await Promise.all([
    prisma.subscription.findMany({
      where,
      include: {
        member: { select: { id: true, firstName: true, lastName: true, memberNumber: true } },
        employee: { select: { id: true, firstName: true, lastName: true } },
        service: true,
      },
      orderBy: { createdAt: "desc" },
      take: pageSize,
      skip: (page - 1) * pageSize,
    }),
    prisma.subscription.count({ where }),
  ]);

  return NextResponse.json({ subscriptions: subs, total, page, pageSize });
}

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session || !["ADMIN", "STAFF", "STORE"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  if (!parsed.data.memberId && !parsed.data.employeeId) {
    return NextResponse.json({ error: "memberId or employeeId required" }, { status: 400 });
  }

  const startDate = parsed.data.startDate ? new Date(parsed.data.startDate) : new Date();
  const endDate = parsed.data.endDate ? new Date(parsed.data.endDate) : undefined;
  const nextBillDate = addMonths(startDate, 1);

  // For employee subscriptions skip the frozen-member check
  let isFrozen = false;
  let frozenRef: { frozenAt: Date | null; frozenUntil: Date | null } | undefined;

  if (parsed.data.memberId) {
    const memberStatus = await prisma.member.findUnique({
      where: { id: parsed.data.memberId },
      select: {
        status: true,
        subscriptions: {
          where: { status: "PAUSED" },
          select: { frozenAt: true, frozenUntil: true },
          orderBy: { frozenAt: "desc" },
          take: 1,
        },
      },
    });
    isFrozen = memberStatus?.status === "FROZEN";
    frozenRef = memberStatus?.subscriptions[0];
  }

  const sub = await prisma.subscription.create({
    data: {
      memberId: parsed.data.memberId ?? null,
      employeeId: parsed.data.employeeId ?? null,
      serviceId: parsed.data.serviceId,
      billingCycle: parsed.data.billingCycle,
      price: parsed.data.price,
      startDate,
      endDate,
      nextBillDate,
      sessionsTotal: parsed.data.sessionsTotal ?? null,
      notes: parsed.data.notes,
      status: isFrozen ? "PAUSED" : "ACTIVE",
      ...(isFrozen && frozenRef ? {
        frozenAt: frozenRef.frozenAt ?? new Date(),
        frozenUntil: frozenRef.frozenUntil,
        ...(endDate && frozenRef.frozenUntil ? {
          endDate: new Date(endDate.getTime() + Math.max(0, frozenRef.frozenUntil.getTime() - Date.now())),
        } : {}),
      } : {}),
    },
    include: { service: true, member: true, employee: { select: { id: true, firstName: true, lastName: true } } },
  });

  // Create a payment record. If payment info is complete (method provided and receipt
  // requirements met), status is PAID. Otherwise PENDING — surfaces in the To-Do list.
  if (parsed.data.price > 0) {
    const needsReceipt = parsed.data.needsReceipt !== false; // defaults to true
    const isComplete = !!parsed.data.paymentMethod && (!needsReceipt || !!parsed.data.receiptUrl);
    await prisma.payment.create({
      data: {
        memberId: parsed.data.memberId ?? null,
        employeeId: parsed.data.employeeId ?? null,
        subscriptionId: sub.id,
        amount: parsed.data.price,
        status: isComplete ? "PAID" : "PENDING",
        method: parsed.data.paymentMethod ?? null,
        paidAt: isComplete ? startDate : null,
        needsReceipt,
        receiptUrl: parsed.data.receiptUrl ?? null,
      },
    });
  }

  // Auto-activate INACTIVE members when a membership is assigned
  if (parsed.data.memberId && sub.member?.status === "INACTIVE") {
    const memberUpdateData: Record<string, unknown> = {
      status: "ACTIVE",
      activatedAt: sub.member.activatedAt ?? new Date(),
    };
    // Auto-assign member number if they don't have one
    if (!sub.member.memberNumber) {
      memberUpdateData.memberNumber = await nextMemberNumber();
    }
    await prisma.member.update({ where: { id: parsed.data.memberId }, data: memberUpdateData });
  }

  const entityName = sub.member
    ? `${sub.member.firstName} ${sub.member.lastName} — ${sub.service.name}`
    : sub.employee
    ? `${sub.employee.firstName} ${sub.employee.lastName} — ${sub.service.name}`
    : sub.service.name;

  await logAudit({
    userId: (session.user as any).id,
    userName: session.user?.name ?? session.user?.email ?? "Unknown",
    action: "ASSIGN_MEMBERSHIP",
    entityType: "Subscription",
    entityId: sub.id,
    entityName,
    description: `Assigned ${sub.service.name} membership (₱${parsed.data.price}, ${parsed.data.billingCycle})`,
    metadata: {
      memberId: parsed.data.memberId,
      employeeId: parsed.data.employeeId,
      serviceId: parsed.data.serviceId,
      price: parsed.data.price,
      billingCycle: parsed.data.billingCycle,
      paymentMethod: parsed.data.paymentMethod,
      startDate: startDate.toISOString(),
      endDate: endDate?.toISOString(),
      sessionsTotal: parsed.data.sessionsTotal,
    },
  });

  return NextResponse.json(sub, { status: 201 });
}
