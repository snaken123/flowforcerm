// Placeholder Xendit client -- built against Xendit's real, current API docs
// (docs.xendit.co) so the shapes are correct, but written before this project had a
// live Xendit account to test against. Every function throws a clear error if called
// without XENDIT_SECRET_KEY set, rather than silently no-oping -- this touches real
// money, so failing loudly beats a lazy-client pattern that pretends to work.

const XENDIT_API_BASE = "https://api.xendit.co";

function getAuthHeader(): string {
  const key = process.env.XENDIT_SECRET_KEY;
  if (!key) {
    throw new Error(
      "XENDIT_SECRET_KEY is not set -- platform billing isn't configured yet. Add it once a Xendit account exists."
    );
  }
  // Xendit uses HTTP Basic Auth with the secret key as the username and an empty password.
  return `Basic ${Buffer.from(`${key}:`).toString("base64")}`;
}

async function xenditFetch(path: string, init?: RequestInit & { idempotencyKey?: string }) {
  const { idempotencyKey, ...rest } = init ?? {};
  const res = await fetch(`${XENDIT_API_BASE}${path}`, {
    ...rest,
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "idempotency-key": idempotencyKey } : {}),
      ...rest.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Xendit API ${rest.method ?? "GET"} ${path} failed (${res.status}): ${body}`);
  }
  return res.json();
}

export type XenditCustomer = { id: string; referenceId: string };

// POST /customers -- https://docs.xendit.co/apidocs/create-customer-request
export async function createXenditCustomer(input: {
  referenceId: string; // use the control-plane Tenant.id
  givenNames: string;
  email?: string;
}): Promise<XenditCustomer> {
  const data = await xenditFetch("/customers", {
    method: "POST",
    idempotencyKey: input.referenceId,
    body: JSON.stringify({
      reference_id: input.referenceId,
      type: "INDIVIDUAL",
      individual_detail: { given_names: input.givenNames },
      email: input.email,
    }),
  });
  return { id: data.id, referenceId: data.reference_id };
}

export type XenditSubscriptionPlan = { id: string; status: string };

// POST /recurring/plans -- https://docs.xendit.co/apidocs/create-recurring-plan
// `amountCentavos / 100` assumes Xendit wants PHP in its main unit (pesos, with
// decimals), matching the `amount: number` field in their schema -- unverified against
// a real PH-currency response since there's no live account yet; re-check this
// specifically once one exists, currency subunit conventions vary by provider.
export async function createXenditSubscriptionPlan(input: {
  referenceId: string;
  customerId: string;
  amountCentavos: number;
  billingCycle: "MONTHLY" | "QUARTERLY" | "SEMI_ANNUAL" | "ANNUAL";
  totalRetry?: number;
}): Promise<XenditSubscriptionPlan> {
  const intervalCount = { MONTHLY: 1, QUARTERLY: 3, SEMI_ANNUAL: 6, ANNUAL: 12 }[input.billingCycle];
  const data = await xenditFetch("/recurring/plans", {
    method: "POST",
    idempotencyKey: input.referenceId,
    body: JSON.stringify({
      reference_id: input.referenceId,
      customer_id: input.customerId,
      currency: "PHP",
      amount: input.amountCentavos / 100,
      schedule: {
        interval: "MONTH",
        interval_count: intervalCount,
        anchor_date: new Date().toISOString(),
        retry_interval: "DAY",
        retry_interval_count: 1,
        total_retry: input.totalRetry ?? 3,
      },
    }),
  });
  return { id: data.id, status: data.status };
}

// Compares the inbound `x-callback-token` header against XENDIT_WEBHOOK_TOKEN (from
// Dashboard > Settings > Webhooks). Returns false -- reject everything -- if the token
// isn't configured yet, rather than treating "not configured" as "allow all".
export function verifyXenditWebhookToken(receivedToken: string | null): boolean {
  const expected = process.env.XENDIT_WEBHOOK_TOKEN;
  if (!expected) return false;
  return receivedToken === expected;
}
