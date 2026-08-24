import { NextRequest, NextResponse } from "next/server";
import { controlPlanePrisma } from "@/control-plane/lib/db";
import { verifyXenditWebhookToken } from "@/control-plane/lib/xendit-api";
import { handleCycleSucceeded, handleCycleRetrying, handleCycleFailed } from "@/control-plane/lib/billing-events";

// Fixed, non-tenant-routed webhook URL for Xendit's recurring-plan events
// (recurring.cycle.succeeded / .retrying / .failed / .created / .plan.activated /
// .plan.inactivated -- see https://docs.xendit.co/apidocs/subscription-webhook).
// Bypasses the subdomain-based tenant middleware entirely and uses the control-plane
// client directly, matching /api/internal/resolve-tenant's pattern.
//
// The three cycle events are dispatched to control-plane/lib/billing-events.ts (advance
// billing periods, create Invoice/CommissionEntry rows, suspend on failure). That file's
// payload field mapping is UNVERIFIED against a real Xendit account -- there's none to
// test against yet. Every other event type is still just recorded for audit, not acted on.
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

  // Process BEFORE recording: each handler's writes are one atomic transaction, so on
  // failure nothing was persisted. Recording the event only after a successful process
  // means a legitimate Xendit retry (non-2xx response) finds no row yet and genuinely
  // retries -- recording first would make a failed attempt look like an already-handled
  // duplicate forever.
  try {
    if (payload.event === "recurring.cycle.succeeded") {
      await handleCycleSucceeded(payload);
    } else if (payload.event === "recurring.cycle.retrying") {
      await handleCycleRetrying(payload);
    } else if (payload.event === "recurring.cycle.failed") {
      await handleCycleFailed(payload);
    }
  } catch (err) {
    console.error(`[xendit-webhook] failed to process ${payload.event}`, err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  await controlPlanePrisma.xenditWebhookEvent.create({
    data: { xenditEventId, eventType: payload.event, payload },
  });

  return NextResponse.json({ received: true });
}
