import { PrismaClient } from "@prisma/client";
import { headers } from "next/headers";
import { getTenantConnectionInfo } from "@/control-plane/lib/tenant-resolution";

const MAX_CACHED_CLIENTS = 20;

type CacheEntry = { clientPromise: Promise<PrismaClient>; lastUsedAt: number };

// Keyed by tenant id. Promise-cached (not just the resolved client) so concurrent
// requests for a not-yet-cached tenant share one in-flight client construction
// instead of racing to create duplicate, never-disconnected clients. Survives warm
// serverless-instance reuse the same way the old single-tenant singleton did.
const globalForTenantClients = globalThis as unknown as { tenantClients?: Map<string, CacheEntry> };
const tenantClients = globalForTenantClients.tenantClients ?? new Map<string, CacheEntry>();
if (process.env.NODE_ENV !== "production") globalForTenantClients.tenantClients = tenantClients;

async function createClientForTenant(tenantId: string): Promise<PrismaClient> {
  const connectionInfo = await getTenantConnectionInfo(tenantId);
  if (!connectionInfo) {
    throw new Error(`No connection info found for tenant ${tenantId} — cannot construct a database client`);
  }
  return new PrismaClient({
    datasources: { db: { url: connectionInfo.databaseUrl } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function evictLeastRecentlyUsedIfNeeded() {
  if (tenantClients.size <= MAX_CACHED_CLIENTS) return;
  let oldestId: string | null = null;
  let oldestAt = Infinity;
  for (const [id, entry] of tenantClients) {
    if (entry.lastUsedAt < oldestAt) {
      oldestAt = entry.lastUsedAt;
      oldestId = id;
    }
  }
  if (oldestId) {
    const entry = tenantClients.get(oldestId);
    tenantClients.delete(oldestId);
    entry?.clientPromise.then((client) => client.$disconnect()).catch(() => {});
  }
}

async function getClientForTenant(tenantId: string): Promise<PrismaClient> {
  const cached = tenantClients.get(tenantId);
  if (cached) {
    cached.lastUsedAt = Date.now();
    return cached.clientPromise;
  }
  const clientPromise = createClientForTenant(tenantId);
  tenantClients.set(tenantId, { clientPromise, lastUsedAt: Date.now() });
  evictLeastRecentlyUsedIfNeeded();
  return clientPromise;
}

// For non-request contexts (crons, background jobs) that already know which tenant
// they're operating on and have no request headers to resolve one from.
export async function getPrismaClientForTenant(tenantId: string): Promise<PrismaClient> {
  return getClientForTenant(tenantId);
}

function resolveTenantIdFromRequest(): string {
  const tenantId = headers().get("x-tenant-id");
  if (!tenantId) {
    // Fail loudly, never silently fall back to a default database — an unresolved
    // tenant here means either a code path outside tenant-resolution middleware, or
    // a real bug. Either way, guessing which gym's data to touch is not acceptable.
    throw new Error(
      "prisma was accessed with no tenant resolved for this request. If this is a " +
        "cron/background job, use getPrismaClientForTenant(tenantId) instead of the " +
        "shared prisma export."
    );
  }
  return tenantId;
}

function wrapModelMethod(modelProp: string, method: string) {
  return async (...args: unknown[]) => {
    const client = await getClientForTenant(resolveTenantIdFromRequest());
    return (client as any)[modelProp][method](...args);
  };
}

// The exported `prisma` looks and behaves exactly like a normal PrismaClient to every
// existing call site (`prisma.member.findMany(...)`, `prisma.$transaction(...)`, etc.)
// but transparently resolves and forwards to the correct tenant's real client per
// request. Two proxy levels: the outer one handles direct client methods ($transaction,
// $queryRaw, ...) and model-name access (.member, .user, ...); the inner one wraps each
// model's methods (.findMany, .create, ...).
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop: string | symbol) {
    if (typeof prop !== "string") return undefined;

    if (prop.startsWith("$")) {
      return async (...args: unknown[]) => {
        const client = await getClientForTenant(resolveTenantIdFromRequest());
        return (client as any)[prop](...args);
      };
    }

    return new Proxy(
      {},
      {
        get(_innerTarget, methodProp: string | symbol) {
          if (typeof methodProp !== "string") return undefined;
          return wrapModelMethod(prop, methodProp);
        },
      }
    );
  },
}) as PrismaClient;
