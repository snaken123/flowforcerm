import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getAuthSession } from "@/lib/auth";
import { controlPlanePrisma } from "@/control-plane/lib/db";
import { getXenditPaymentMethodStatus, createXenditSubscriptionPlan } from "@/control-plane/lib/xendit-api";

// Xendit's hosted payment-method flow redirects the browser back here. The redirect
// itself isn't proof of anything -- re-check the payment method's actual status before
// starting the trial clock. Only on confirmed ACTIVE does the 30-day trial begin and
// the recurring plan get created (anchor_date = trialEndsAt, so the first real charge
// attempt naturally lands exactly at trial end -- no separate cron needed to start it).
export async function GET(req: NextRequest) {
  const session = await getAuthSession();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const tenantId = headers().get("x-tenant-id");
  const subscription = tenantId
    ? await controlPlanePrisma.subscription.findUnique({ where: { tenantId } })
    : null;

  if (!subscription?.xenditPaymentMethodId) {
    return NextResponse.redirect(new URL("/billing-setup?error=missing", req.url));
  }

  try {
    const { status } = await getXenditPaymentMethodStatus(subscription.xenditPaymentMethodId);
    if (status !== "ACTIVE") {
      return NextResponse.redirect(new URL("/billing-setup?error=incomplete", req.url));
    }

    const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const plan = await createXenditSubscriptionPlan({
      referenceId: `${tenantId}-plan`,
      customerId: subscription.xenditCustomerId!,
      amountCentavos: subscription.baseRateCentavos,
      billingCycle: subscription.billingCycle,
    });

    await controlPlanePrisma.subscription.update({
      where: { id: subscription.id },
      data: { paymentMethodSetupAt: new Date(), trialEndsAt, xenditPlanId: plan.id },
    });

    return NextResponse.redirect(new URL("/dashboard", req.url));
  } catch (err) {
    console.error("[billing-setup/complete] failed", err);
    return NextResponse.redirect(new URL("/billing-setup?error=failed", req.url));
  }
}
