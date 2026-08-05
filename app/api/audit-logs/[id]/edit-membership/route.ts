import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  packageId: z.string().min(1),
  amount: z.number().positive(),
  paymentMethod: z.string().min(1),
  reason: z.string().min(1),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getAuthSession();
  const role = (session?.user as any)?.role;
  if (!session || !["ADMIN", "STAFF"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const log = await prisma.auditLog.findUnique({ where: { id: params.id } });
  if (!log || log.action !== "ASSIGN_MEMBERSHIP") {
    return NextResponse.json({ error: "Audit log not found or not an ASSIGN_MEMBERSHIP entry" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { packageId, amount, paymentMethod, reason } = parsed.data;
  const subscriptionId = log.entityId;
  if (!subscriptionId) {
    return NextResponse.json({ error: "No subscription linked to this log" }, { status: 400 });
  }

  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: {
      service: true,
      payments: { orderBy: { createdAt: "asc" }, take: 1 },
    },
  });
  if (!subscription) {
    return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
  }

  const pkg = await prisma.servicePackage.findUnique({ where: { id: packageId }, include: { service: true } });
  if (!pkg) {
    return NextResponse.json({ error: "Package not found" }, { status: 404 });
  }

  const beforeService = subscription.service.name;
  const afterService = pkg.service.name;
  const beforeAmount = subscription.price;
  const oldPayment = subscription.payments[0] ?? null;
  const oldMethod = oldPayment?.method ?? "";

  const meta = (log.metadata ?? {}) as Record<string, any>;

  await prisma.$transaction(async (tx) => {
    await tx.subscription.update({
      where: { id: subscriptionId },
      data: {
        serviceId: pkg.serviceId,
        price: amount,
        sessionsTotal: pkg.sessions ?? null,
      },
    });

    if (oldPayment) {
      await tx.payment.update({
        where: { id: oldPayment.id },
        data: { amount, method: paymentMethod },
      });
    }

    await tx.auditLog.create({
      data: {
        userId: (session.user as any).id,
        userName: (session.user as any).name ?? (session.user as any).email ?? "Unknown",
        action: "EDIT_MEMBERSHIP",
        entityType: "Subscription",
        entityId: subscriptionId,
        entityName: log.entityName,
        description: `Edited membership: ${beforeService} → ${afterService}, ₱${beforeAmount} → ₱${amount}, ${oldMethod} → ${paymentMethod}. Reason: ${reason}`,
        metadata: {
          before: { serviceId: subscription.serviceId, price: beforeAmount, paymentMethod: oldMethod },
          after: { packageId, serviceId: pkg.serviceId, amount, paymentMethod },
          reason,
        },
      },
    });
  });

  return NextResponse.json({ ok: true });
}
