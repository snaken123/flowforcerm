import { NextRequest, NextResponse } from "next/server";
import { controlPlanePrisma } from "@/control-plane/lib/db";
import { verifyXenditWebhookToken } from "@/control-plane/lib/xendit-api";

// Fixed, non-tenant-routed webhook URL for Xendit's recurring-plan events
// (recurring.cycle.succeeded / .retrying / .failed / .created / .plan.activated /
// .plan.inactivated -- see https://docs.xendit.co/apidocs/subscription-webhook).
// Bypasses the subdomain-based tenant middleware entirely and uses the control-plane
// client directly, matching /api/internal/resolve-tenant's pattern.
//
// Placeholder: verifies the token and records every event for idempotency/audit, but
// does NOT yet act on them (advance billing periods, suspend/reactivate tenants, create
// Invoice rows). There's no live Xendit account to test the real `data` payload shape
// against yet, and guessing the field mapping here risks silently mishandling real
// money events later -- wire up the actual enforcement logic once sandbox testing is
// possible.
export async function POST(req: NextRequest) {
  const token = req.headers.get("x-callback-token");
  if (!verifyXenditWebhookToken(token)) {
    return NextResponse.json({ error: "Invalid or unconfigured webhook token" }, { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  if (!payload?.event) {
    return NextResponse.json({ error: "Malformed payload" }, { status: 400 });
  }

  // Xendit's payload has no single dedicated delivery-id field to key on, so this is
  // constructed from the event type + the underlying plan/cycle id.
  const xenditEventId = `${payload.event}:${payload.data?.id ?? "unknown"}`;

  const existing = await controlPlanePrisma.xenditWebhookEvent.findUnique({ where: { xenditEventId } });
  if (existing) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  await controlPlanePrisma.xenditWebhookEvent.create({
    data: { xenditEventId, eventType: payload.event, payload },
  });

  // TODO once XENDIT_SECRET_KEY/XENDIT_WEBHOOK_TOKEN are configured and real webhook
  // deliveries can be inspected: resolve the Subscription from payload.data (likely by
  // xenditPlanId), then handle each event type -- succeeded advances the billing period
  // and creates a PAID Invoice; retrying sets Subscription.status = PAST_DUE; failed
  // (after Xendit's own retries are exhausted) sets SUSPENDED_PENDING or suspends the
  // Tenant outright depending on suspensionGraceHours, per the Phase 9 plan.

  return NextResponse.json({ received: true });
}
