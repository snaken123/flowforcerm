import crypto from "crypto";

// Signs/verifies short-lived state for OAuth flows whose callback must land on one
// fixed, tenant-independent URL -- Google requires an exact, pre-registered
// redirect_uri and has no wildcard-subdomain support, so a per-gym callback (e.g.
// https://{subdomain}.flowforcerm.com/...) isn't an option; every gym has to share one
// callback on the platform's root domain instead. That callback runs with no tenant
// context from middleware and no session cookie (cookies don't cross subdomains), so
// this signed payload -- not a matching state cookie -- is what tells it which gym and
// which admin actually started the flow, and that it wasn't forged in transit.
function getSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is not set -- required to sign OAuth state tokens");
  return secret;
}

export function signOAuthState(payload: Record<string, unknown>): string {
  const body = Buffer.from(JSON.stringify({ ...payload, iat: Date.now() })).toString("base64url");
  const sig = crypto.createHmac("sha256", getSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyOAuthState<T = Record<string, unknown>>(token: string, maxAgeMs = 10 * 60 * 1000): T | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expectedSig = crypto.createHmac("sha256", getSecret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf-8"));
    if (typeof payload.iat !== "number" || Date.now() - payload.iat > maxAgeMs) return null;
    return payload as T;
  } catch {
    return null;
  }
}
