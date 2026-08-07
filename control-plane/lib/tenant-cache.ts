import type { ResolvedTenant } from "./tenant-resolution";

// Mirrors middleware.ts's own tenant cache write (same key format, same TTL) but is
// deliberately a separate implementation rather than a shared import -- middleware.ts
// runs on the Edge runtime and this project has a real history of that file being
// fragile around its imports, so this stays isolated to avoid touching it. Used by the
// superadmin flag-toggle route to immediately overwrite a tenant's cached entry after a
// change, instead of waiting out the cache's TTL.
export async function overwriteTenantCache(subdomain: string, tenant: ResolvedTenant): Promise<void> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return;
  try {
    await fetch(`${url}/set/tenant:host:${subdomain}/${encodeURIComponent(JSON.stringify(tenant))}/EX/300`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // best-effort — a failure here just means the next request re-resolves via DB
  }
}
