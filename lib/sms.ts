import { prisma } from "@/lib/db";
import { getTenantIdOrNull } from "@/lib/tenant-context";

const SEMAPHORE_API_KEY = process.env.SEMAPHORE_API_KEY!;
const SEMAPHORE_SENDER = process.env.SEMAPHORE_SENDER ?? "FlowForceRM";

// Resolves the sender name Semaphore should show: the tenant's own TenantBranding.smsSenderName
// when this request is running in a resolved tenant context, falling back to the platform default
// otherwise. Note: Semaphore requires each sender name to be pre-approved in its own dashboard —
// see sendSemaphoreSetupNotification in lib/email.ts, fired when a gym sets/changes theirs.
async function resolveSmsSender(): Promise<string> {
  const tenantId = getTenantIdOrNull();
  if (!tenantId) return SEMAPHORE_SENDER;
  try {
    const branding = await prisma.tenantBranding.findFirst();
    if (branding?.smsSenderName) return branding.smsSenderName;
  } catch (err) {
    console.error("[sms] failed to resolve tenant branding for sender name", err);
  }
  return SEMAPHORE_SENDER;
}

export async function sendSMS(to: string, message: string) {
  const phone = to.replace(/\D/g, "");
  const normalized = phone.startsWith("0") ? "63" + phone.slice(1) : phone.startsWith("63") ? phone : "63" + phone;
  const sendername = await resolveSmsSender();

  const res = await fetch("https://api.semaphore.co/api/v4/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apikey: SEMAPHORE_API_KEY,
      number: normalized,
      message,
      sendername,
    }),
  });

  if (!res.ok) throw new Error(`Semaphore error: ${res.status}`);
  const body = await res.json();
  // Semaphore returns HTTP 200 even when it rejects the request (bad/missing apikey,
  // invalid number, etc.) -- the error only shows up as a plain object of field errors
  // in the body instead of an array of sent messages, so res.ok alone can't tell success
  // from failure. Without this check a rejected send silently counts as delivered.
  if (!Array.isArray(body)) throw new Error(`Semaphore rejected the request: ${JSON.stringify(body)}`);
  return body;
}

export async function sendBulkSMS(recipients: { phone: string; name: string }[], message: string) {
  const results = { sent: 0, failed: 0 };
  for (const r of recipients) {
    try {
      await sendSMS(r.phone, message);
      results.sent++;
    } catch (e) {
      console.error(`[sms] failed to send to ${r.phone}:`, e instanceof Error ? e.message : e);
      results.failed++;
    }
  }
  return results;
}
