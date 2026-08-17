import { headers } from "next/headers";
import { NextResponse } from "next/server";

export { FLAG_COMMUNICATIONS, FLAG_SPECIALIZED_ROLES, FLAG_WEB_INTEGRATION } from "./feature-flags-constants";

// Reads the tenant's active feature flags already resolved by middleware (see the
// x-tenant-flags header set in middleware.ts) -- zero extra network round trip, usable
// in Server Components, Route Handlers, and middleware alike. Unknown or missing keys
// default to false (fail-closed): a flag that was never explicitly turned on for this
// tenant is off, full stop.
export function isFeatureEnabled(key: string): boolean {
  const raw = headers().get("x-tenant-flags");
  if (!raw) return false;
  return raw.split(",").filter(Boolean).includes(key);
}

// Route Handlers call this first and return its result immediately if non-null --
// defense in depth alongside the page-level block in middleware.ts, so a disabled
// feature's API can't be reached even by calling it directly.
export function requireFeature(key: string): NextResponse | null {
  if (isFeatureEnabled(key)) return null;
  return NextResponse.json({ error: "This feature is not enabled for your gym." }, { status: 403 });
}
