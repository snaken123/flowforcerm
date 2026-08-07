import { headers } from "next/headers";

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
