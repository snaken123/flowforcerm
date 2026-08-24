import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { getAuthSession } from "@/lib/auth";
import { controlPlanePrisma } from "@/control-plane/lib/db";
import { createXenditCustomer, createXenditPaymentMethodSetup, cancelXenditSubscriptionPlan } from "@/control-plane/lib/xendit-api";
import { refreshReferrerDiscount } from "@/control-plane/lib/pricing";

const bodySchema = z.object({ action: z.enum(["start", "cancel"]) });

export async function GET() {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const tenantId = headers().get("x-tenant-id");
  const subscription = tenantId
    ? await controlPlanePrisma.subscription.findUnique({
        where: { tenantId },
        select: { baseRateCentavos: true, status: true, trialEndsAt: true, paymentMethodSetupAt: true },
      })
    : null;
  if (!subscription) return NextResponse.json({ error: "This gym isn't billed." }, { status: 404 });

  return NextResponse.json(subscription);
}

// ADMIN-only, gated to billed tenants -- see lib/billing-setup.ts and middleware.ts's
// needsPaymentSetup redirect. "start" kicks off the Xendit hosted payment-method flow;
// "cancel" is the trial's free-cancellation path (only while status is still
// PENDING_FIRST_CHARGE and within the 30-day window, i.e. before any real charge).
export async function POST(req: Request) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const tenantId = headers().get("x-tenant-id");
  if (!tenantId) return NextResponse.json({ error: "No tenant context" }, { status: 400 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const [tenant, subscription] = await Promise.all([
    controlPlanePrisma.tenant.findUnique({ where: { id: tenantId } }),
    controlPlanePrisma.subscription.findUnique({ where: { tenantId } }),
  ]);
  if (!tenant || !subscription) return NextResponse.json({ error: "This gym isn't billed." }, { status: 400 });

  if (parsed.data.action === "cancel") {
    if (subscription.status !== "PENDING_FIRST_CHARGE") {
      return NextResponse.json({ error: "Only cancellable before the first charge." }, { status: 400 });
    }
    try {
      if (subscription.xenditPlanId) await cancelXenditSubscriptionPlan(subscription.xenditPlanId);
    } catch (err) {
      console.error("[billing-setup] cancel failed", err);
      return NextResponse.json({ error: err instanceof Error ? err.message : "Cancellation failed" }, { status: 500 });
    }
    await controlPlanePrisma.subscription.update({ where: { id: subscription.id }, data: { status: "CANCELLED" } });
    await refreshReferrerDiscount(tenantId);
    return NextResponse.json({ cancelled: true });
  }

  try {
    const customer = await createXenditCustomer({
      referenceId: tenant.id,
      givenNames: session.user.name ?? tenant.name,
      email: session.user.email ?? undefined,
    });
    const setup = await createXenditPaymentMethodSetup({ customerId: customer.id, referenceId: `${tenant.id}-pm` });
    await controlPlanePrisma.subscription.update({
      where: { id: subscription.id },
      data: { xenditCustomerId: customer.id, xenditPaymentMethodId: setup.id },
    });
    return NextResponse.json({ actionUrl: setup.actionUrl });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Billing isn't connected yet." }, { status: 503 });
  }
}
