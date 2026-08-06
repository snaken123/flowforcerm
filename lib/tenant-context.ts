import { headers } from "next/headers";

// Reads the tenant middleware already resolved for this request (see middleware.ts).
// Works in Server Components and Route Handlers — headers() is request-scoped by Next.js.
// Throws rather than silently defaulting: a missing tenant header means either a request
// path that bypassed tenant-resolution middleware, or a real bug — either way, code that
// depends on "which gym's data am I touching" must never guess.

export function getTenantId(): string {
  const id = headers().get("x-tenant-id");
  if (!id) throw new Error("No tenant resolved for this request (missing x-tenant-id header)");
  return id;
}

export function getTenantSubdomain(): string {
  const subdomain = headers().get("x-tenant-subdomain");
  if (!subdomain) throw new Error("No tenant resolved for this request (missing x-tenant-subdomain header)");
  return subdomain;
}

export function getTenantBrandName(): string | null {
  return headers().get("x-tenant-brand-name") || null;
}

export function getTenantTimezone(): string {
  return headers().get("x-tenant-timezone") || "Asia/Manila";
}

// Non-throwing variant for code paths that can run with or without a resolved tenant
// (e.g. shared UI that also renders on the marketing/superadmin domains).
export function getTenantIdOrNull(): string | null {
  return headers().get("x-tenant-id");
}
