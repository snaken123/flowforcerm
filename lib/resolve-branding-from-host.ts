import { findTenantBySubdomain, type ResolvedTenant } from "@/control-plane/lib/tenant-resolution";

const ROOT_DOMAIN_HOSTS = new Set(["flowforcerm.com", "www.flowforcerm.com", "localhost:3000"]);

// Shared by every metadata convention file (app/manifest.ts, app/kiosk/manifest.ts, ...)
// that can't rely on the usual x-tenant-id request header: middleware's own matcher
// deliberately skips anything with "manifest" in the path (bundled with favicon/icons/
// static-asset exclusions, to avoid a tenant-resolution round trip on every static-
// asset-shaped request), so that header never reaches these routes. Resolves directly
// from the Host header instead, going straight to the control-plane DB rather than
// middleware's Redis-cached resolver -- fine here since browsers fetch these rarely and
// cache them aggressively.
export async function resolveBrandingFromHost(host: string): Promise<ResolvedTenant | null> {
  if (host.startsWith("superadmin.") || ROOT_DOMAIN_HOSTS.has(host)) return null;
  const subdomain = host.split(":")[0].split(".")[0];
  return findTenantBySubdomain(subdomain).catch(() => null);
}
