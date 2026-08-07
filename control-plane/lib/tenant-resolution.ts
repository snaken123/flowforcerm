import { controlPlanePrisma } from "./db";
import { decryptSecret } from "./crypto";

export type ResolvedTenant = {
  id: string;
  subdomain: string;
  status: "PROVISIONING" | "ACTIVE" | "SUSPENDED" | "FAILED";
  brandName: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  timezone: string;
  activeFlags: string[];
};

const RESOLVED_TENANT_SELECT = {
  id: true,
  subdomain: true,
  status: true,
  brandName: true,
  logoUrl: true,
  primaryColor: true,
  timezone: true,
  featureFlags: { select: { flagKey: true } },
} as const;

function toResolvedTenant<T extends { featureFlags: { flagKey: string }[] }>(
  tenant: T
): Omit<T, "featureFlags"> & { activeFlags: string[] } {
  const { featureFlags, ...rest } = tenant;
  return { ...rest, activeFlags: featureFlags.map((f) => f.flagKey) };
}

// Looked up by the internal /api/internal/resolve-tenant route (Node runtime — this
// file touches the control-plane Prisma client, which can't run on the Edge runtime
// middleware itself). Kept intentionally small: only what's needed to route a request
// and render a suspended/branded fallback without opening the tenant's own database.
export async function findTenantBySubdomain(subdomain: string): Promise<ResolvedTenant | null> {
  const tenant = await controlPlanePrisma.tenant.findUnique({
    where: { subdomain },
    select: RESOLVED_TENANT_SELECT,
  });
  return tenant ? toResolvedTenant(tenant) : null;
}

// Same shape, looked up by id — used by the superadmin flag-toggle route to rebuild the
// cache entry immediately after a change, without waiting out the Redis TTL.
export async function findTenantById(id: string): Promise<ResolvedTenant | null> {
  const tenant = await controlPlanePrisma.tenant.findUnique({
    where: { id },
    select: RESOLVED_TENANT_SELECT,
  });
  return tenant ? toResolvedTenant(tenant) : null;
}

// Decrypted connection info for a specific tenant's own database — used by lib/db.ts's
// per-tenant Prisma client resolver. Never cache/log the decrypted values beyond
// constructing a PrismaClient with them.
export async function getTenantConnectionInfo(tenantId: string): Promise<{ databaseUrl: string; directUrl: string } | null> {
  const tenant = await controlPlanePrisma.tenant.findUnique({
    where: { id: tenantId },
    select: { databaseUrlEnc: true, directUrlEnc: true },
  });
  if (!tenant) return null;
  return {
    databaseUrl: decryptSecret(tenant.databaseUrlEnc),
    directUrl: decryptSecret(tenant.directUrlEnc),
  };
}

// Every ACTIVE tenant — used by crons/jobs that need to run their logic once per gym
// instead of resolving from a request's subdomain (there is none for a cron trigger).
export async function getActiveTenants(): Promise<{ id: string; subdomain: string; brandName: string | null }[]> {
  return controlPlanePrisma.tenant.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, subdomain: true, brandName: true },
  });
}
