import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import crypto from "crypto";

const schema = z.object({
  memberNumber: z.string().optional(), // if blank, auto-generate
  serviceId: z.string(),
  startDate: z.string(), // YYYY-MM-DD
  endDate: z.string().optional(), // YYYY-MM-DD for date-based
  sessionsTotal: z.number().int().positive().optional(), // for session-based
  price: z.number().min(0),
  paymentMethod: z.string().optional(),
  needsReceipt: z.boolean().optional(),
  receiptUrl: z.string().optional(),
  billingCycle: z.enum(["MONTHLY", "QUARTERLY", "SEMI_ANNUAL", "ANNUAL"]).default("MONTHLY"),
});

function generateMemberNumber(last: number): string {
  return `NS-${String(last + 1).padStart(5, "0")}`;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAuthSession();
  if (!session || !["ADMIN", "STAFF", "STORE"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const member = await prisma.member.findUnique({
    where: { id: params.id },
    select: { id: true, firstName: true, lastName: true, status: true, memberNumber: true },
  });
  if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });
  if (member.status !== "INACTIVE") {
    return NextResponse.json({ error: "Member is not in INACTIVE/trial status" }, { status: 409 });
  }

  // This route has no packageId selector (unlike /api/subscriptions) -- staff type a price
  // directly. Cap it at the highest listed rate among the service's own packages so it can't
  // be set arbitrarily high or belong to some unrelated pricing; skip the check for services
  // with no packages configured (custom/legacy pricing).
  const packages = await prisma.servicePackage.findMany({ where: { serviceId: parsed.data.serviceId } });
  if (packages.length > 0) {
    const maxAllowed = Math.max(...packages.map((p) => Math.max(p.memberPrice ?? 0, p.nonMemberPrice ?? 0)));
    if (parsed.data.price > maxAllowed) {
      return NextResponse.json({
        error: `Price (₱${parsed.data.price}) exceeds this service's highest listed rate (₱${maxAllowed}).`,
      }, { status: 400 });
    }
  }

  // Assign member number safely inside a transaction to avoid TOCTOU race
  const result = await prisma.$transaction(async (tx) => {
    let memberNumber = parsed.data.memberNumber?.trim() || null;
    if (!memberNumber) {
      // Find the highest existing member number
      const lastMember = await tx.member.findFirst({
        where: { memberNumber: { startsWith: "NS-" } },
        orderBy: { memberNumber: "desc" },
        select: { memberNumber: true },
      });
      const lastNum = lastMember?.memberNumber
        ? parseInt(lastMember.memberNumber.replace("NS-", ""), 10) || 0
        : 0;
      memberNumber = generateMemberNumber(lastNum);
    }

    // Verify member number is unique
    const conflict = await tx.member.findUnique({ where: { memberNumber }, select: { id: true } });
    if (conflict && conflict.id !== params.id) {
      throw new Error(`MEMBER_NUMBER_CONFLICT:${memberNumber}`);
    }

    const startDate = new Date(parsed.data.startDate + "T00:00:00Z");
    const endDate = parsed.data.endDate ? new Date(parsed.data.endDate + "T00:00:00Z") : undefined;

    const updatedMember = await tx.member.update({
      where: { id: params.id },
      data: {
        memberNumber,
        status: "ACTIVE",
        activatedAt: new Date(),
      },
    });

    const sub = await tx.subscription.create({
      data: {
        memberId: params.id,
        serviceId: parsed.data.serviceId,
        status: "ACTIVE",
        price: parsed.data.price,
        billingCycle: parsed.data.billingCycle,
        startDate,
        endDate,
        sessionsTotal: parsed.data.sessionsTotal ?? null,
        sessionsUsed: 0,
      },
      include: { service: true },
    });

    if (parsed.data.price > 0) {
      // Mirrors /api/subscriptions: only mark PAID when a payment method was actually given
      // (and a receipt too, if required) -- otherwise PENDING so it surfaces in the To-Do list.
      const needsReceipt = parsed.data.needsReceipt !== false; // defaults to true
      const isComplete = !!parsed.data.paymentMethod && (!needsReceipt || !!parsed.data.receiptUrl);
      await tx.payment.create({
        data: {
          memberId: params.id,
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

    return { member: updatedMember, subscription: sub };
  }).catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.startsWith("MEMBER_NUMBER_CONFLICT:")) {
      return { _conflict: msg.replace("MEMBER_NUMBER_CONFLICT:", "") };
    }
    throw err;
  });

  if ("_conflict" in (result as object)) {
    return NextResponse.json(
      { error: `Member number "${(result as any)._conflict}" is already taken.` },
      { status: 409 }
    );
  }

  const { member: updatedMember, subscription } = result as any;

  await logAudit({
    userId: (session.user as any).id,
    userName: session.user?.name ?? session.user?.email ?? "Unknown",
    action: "CONVERT_TRIAL_TO_MEMBER",
    entityType: "Member",
    entityId: params.id,
    entityName: `${member.firstName} ${member.lastName}`,
    description: `Converted trial member to full member. Member #${updatedMember.memberNumber}, service: ${subscription.service.name}`,
    metadata: {
      memberNumber: updatedMember.memberNumber,
      serviceId: parsed.data.serviceId,
      price: parsed.data.price,
      paymentMethod: parsed.data.paymentMethod,
    },
  });

  return NextResponse.json({ member: updatedMember, subscription });
}
