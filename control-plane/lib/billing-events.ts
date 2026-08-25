// Business logic behind the three recurring-plan webhook events FlowForceRM acts on
// (see app/api/webhooks/xendit/route.ts, which just verifies/dedupes and dispatches
// here). Field mapping (`recurring_plan_id` for the plan, `id` for the cycle) follows
// https://docs.xendit.co/apidocs/subscription-webhook but is UNVERIFIED against a real
// payload -- there's no live Xendit account yet. Re-check this file first once sandbox
// webhook deliveries can actually be inspected.

import type { Prisma } from "../generated/client";
import { controlPlanePrisma } from "./db";
import { refreshReferrerDiscount } from "./pricing";

type XenditWebhookPayload = {
  event: string;
  data?: {
    id?: string;
    recurring_plan_id?: string;
    plan_id?: string;
  };
};

function resolveXenditPlanId(payload: XenditWebhookPayload): string | null {
  return payload.data?.recurring_plan_id ?? payload.data?.plan_id ?? null;
}

async function nextInvoiceNumber(tx: Prisma.TransactionClient): Promise<string> {
  const seq = await tx.invoiceNumberSequence.upsert({
    where: { id: "singleton" },
    update: { lastVal: { increment: 1 } },
    create: { id: "singleton", lastVal: 1 },
  });
  return `INV-${String(seq.lastVal).padStart(6, "0")}`;
}

const CYCLE_MONTHS: Record<string, number> = { MONTHLY: 1, QUARTERLY: 3, SEMI_ANNUAL: 6, ANNUAL: 12 };

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export async function handleCycleSucceeded(payload: XenditWebhookPayload): Promise<void> {
  const planId = resolveXenditPlanId(payload);
  if (!planId) return;

  const subscription = await controlPlanePrisma.subscription.findFirst({
    where: { xenditPlanId: planId },
    include: { tenant: true },
  });
  if (!subscription) return;

  const priorPaidCount = await controlPlanePrisma.invoice.count({
    where: { subscriptionId: subscription.id, status: "PAID" },
  });
  const isFirstCharge = priorPaidCount === 0;

  // VAT intentionally left at 0 -- PlatformSetting.vatRegistered is false platform-wide
  // right now, and no VAT rate/rule was specified to implement once it flips on.
  const discountCentavos = Math.round((subscription.baseRateCentavos * subscription.referralDiscountPercent) / 100);
  const totalCentavos = subscription.baseRateCentavos - discountCentavos;
  const now = new Date();
  const cycleMonths = CYCLE_MONTHS[subscription.billingCycle];

  await controlPlanePrisma.$transaction(async (tx) => {
    const invoiceNumber = await nextInvoiceNumber(tx);
    const invoice = await tx.invoice.create({
      data: {
        invoiceNumber,
        subscriptionId: subscription.id,
        baseCentavos: subscription.baseRateCentavos,
        discountCentavos,
        vatCentavos: 0,
        totalCentavos,
        status: "PAID",
        xenditCycleId: payload.data?.id,
        rawWebhookPayload: payload as object,
      },
    });

    await tx.subscription.update({
      where: { id: subscription.id },
      data: {
        status: "ACTIVE",
        currentPeriodStart: now,
        currentPeriodEnd: addMonths(now, cycleMonths),
        pendingSuspensionAt: null,
      },
    });

    const { tenant } = subscription;
    if (tenant.agentId && tenant.commissionPercent != null && tenant.commissionMonths != null) {
      const firstChargeDate = isFirstCharge
        ? now
        : (await tx.invoice.findFirst({
            where: { subscriptionId: subscription.id, status: "PAID" },
            orderBy: { createdAt: "asc" },
            select: { createdAt: true },
          }))?.createdAt ?? now;
      const windowEnd = addMonths(firstChargeDate, tenant.commissionMonths);
      if (now < windowEnd) {
        await tx.commissionEntry.create({
          data: {
            tenantId: tenant.id,
            agentId: tenant.agentId,
            invoiceId: invoice.id,
            commissionPercent: tenant.commissionPercent,
            amountCentavos: Math.round((totalCentavos * tenant.commissionPercent) / 100),
          },
        });
      }
    }
  });

  if (isFirstCharge) {
    await refreshReferrerDiscount(subscription.tenantId);
  }
}

export async function handleCycleRetrying(payload: XenditWebhookPayload): Promise<void> {
  const planId = resolveXenditPlanId(payload);
  if (!planId) return;
  await controlPlanePrisma.subscription.updateMany({
    where: { xenditPlanId: planId },
    data: { status: "PAST_DUE" },
  });
}

// Xendit's own retry schedule (see createXenditSubscriptionPlan's totalRetry) is
// exhausted by the time this fires. suspensionGraceHours > 0 defers the actual lockout
// (a pendingSuspensionAt cron sweep, not yet built -- see the billing plan) instead of
// suspending immediately.
export async function handleCycleFailed(payload: XenditWebhookPayload): Promise<void> {
  const planId = resolveXenditPlanId(payload);
  if (!planId) return;

  const subscription = await controlPlanePrisma.subscription.findFirst({ where: { xenditPlanId: planId } });
  if (!subscription) return;

  if (subscription.suspensionGraceHours > 0) {
    await controlPlanePrisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: "SUSPENDED_PENDING",
        pendingSuspensionAt: new Date(Date.now() + subscription.suspensionGraceHours * 60 * 60 * 1000),
      },
    });
  } else {
    await controlPlanePrisma.$transaction([
      controlPlanePrisma.subscription.update({
        where: { id: subscription.id },
        data: { status: "SUSPENDED_PENDING" },
      }),
      controlPlanePrisma.tenant.update({
        where: { id: subscription.tenantId },
        data: { status: "SUSPENDED" },
      }),
    ]);
  }

  await refreshReferrerDiscount(subscription.tenantId);
}
