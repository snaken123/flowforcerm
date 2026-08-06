import { NextRequest, NextResponse } from "next/server";
import { getEdgeToken } from "./lib/edge-jwt";

type ResolvedTenant = {
  id: string;
  subdomain: string;
  status: "PROVISIONING" | "ACTIVE" | "SUSPENDED" | "FAILED";
  brandName: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  timezone: string;
};

const ROOT_DOMAIN_HOSTS = new Set([
  "flowforcerm.com",
  "www.flowforcerm.com",
  "localhost:3000", // local dev convenience: bare localhost has no subdomain
]);

function isSuperAdminHost(host: string): boolean {
  return host.startsWith("superadmin.");
}

function isRootDomainHost(host: string): boolean {
  return ROOT_DOMAIN_HOSTS.has(host);
}

function extractSubdomain(host: string): string {
  return host.split(":")[0].split(".")[0];
}

async function getCachedTenant(subdomain: string): Promise<ResolvedTenant | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null; // Redis not configured — caller falls back to DB
  try {
    const res = await fetch(`${url}/get/tenant:host:${subdomain}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const { result } = await res.json();
    return result ? (JSON.parse(result) as ResolvedTenant) : null;
  } catch {
    return null; // fail open — resolve via DB instead
  }
}

async function setCachedTenant(subdomain: string, tenant: ResolvedTenant): Promise<void> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return;
  try {
    await fetch(`${url}/set/tenant:host:${subdomain}/${encodeURIComponent(JSON.stringify(tenant))}/EX/300`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // best-effort cache write — a failure here just means the next request re-resolves
  }
}

async function resolveTenantFromDb(subdomain: string, req: NextRequest): Promise<ResolvedTenant | null> {
  const resolveUrl = new URL("/api/internal/resolve-tenant", req.url);
  resolveUrl.searchParams.set("subdomain", subdomain);
  try {
    const res = await fetch(resolveUrl, {
      headers: { "x-internal-secret": process.env.INTERNAL_API_SECRET ?? "" },
    });
    if (!res.ok) return null;
    return (await res.json()) as ResolvedTenant;
  } catch {
    return null;
  }
}

async function resolveTenant(host: string, req: NextRequest): Promise<ResolvedTenant | null> {
  const subdomain = extractSubdomain(host);
  const cached = await getCachedTenant(subdomain);
  if (cached) return cached;

  const tenant = await resolveTenantFromDb(subdomain, req);
  if (tenant) await setCachedTenant(subdomain, tenant);
  return tenant;
}

// The exact path set that previously drove withAuth's `matcher` — role-based auth
// logic below only runs for these, tenant resolution above runs for everything.
function needsTenantAuthCheck(pathname: string): boolean {
  const exact = ["/change-password", "/kiosk", "/"];
  const prefixed = ["/admin", "/staff", "/member", "/dashboard", "/api/member", "/api/auth/2fa"];
  return exact.includes(pathname) || prefixed.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const host = req.headers.get("host") ?? "";

  // Tenant resolution itself calls this route on a cache miss — if it went through
  // tenant resolution too, that self-fetch would re-enter the middleware and recurse
  // forever. It has its own shared-secret auth, so it doesn't need x-tenant-* headers.
  if (pathname.startsWith("/api/internal/")) {
    return NextResponse.next();
  }

  // superadmin.flowforcerm.com never goes through tenant resolution or gym auth —
  // it's a wholly separate system (see control-plane/lib/superadmin-auth.ts).
  if (isSuperAdminHost(host)) {
    return NextResponse.next();
  }

  // Bare flowforcerm.com — the platform marketing site (Phase 10), not any gym's app.
  if (isRootDomainHost(host)) {
    return NextResponse.next();
  }

  const tenant = await resolveTenant(host, req);
  if (!tenant) {
    return new NextResponse("No gym found at this address.", { status: 404 });
  }

  if (tenant.status === "SUSPENDED") {
    // Placeholder response — Phase 9 (billing) replaces this with a branded page and
    // a proper 402 for API requests.
    return new NextResponse(`This ${tenant.brandName ?? "gym"} account is currently inactive.`, { status: 402 });
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-tenant-id", tenant.id);
  requestHeaders.set("x-tenant-subdomain", tenant.subdomain);
  requestHeaders.set("x-tenant-brand-name", tenant.brandName ?? "");
  requestHeaders.set("x-tenant-timezone", tenant.timezone);

  if (needsTenantAuthCheck(pathname)) {
    const token = await getEdgeToken(req);

    if (pathname.startsWith("/kiosk")) {
      // /kiosk does its own auth check in-page — allow through either way.
    } else if (!token) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    } else {
      if (token.role === "KIOSK" && pathname !== "/kiosk") {
        return NextResponse.redirect(new URL("/kiosk", req.url));
      }
      if (token.role === "MEMBER" && !token.onboardingCompleted && pathname !== "/setup-account") {
        return NextResponse.redirect(new URL("/setup-account", req.url));
      }
      if (
        (token.role === "STAFF" || token.role === "ADMIN") &&
        token.mustChangePassword &&
        pathname !== "/change-password"
      ) {
        return NextResponse.redirect(new URL("/change-password", req.url));
      }
      const staffAllowedAdminPaths = ["/admin/members", "/admin/schedule", "/admin/classes", "/admin/shop", "/admin/logs"];
      if (pathname.startsWith("/admin") && token.role !== "ADMIN") {
        const allowed =
          (token.role === "STAFF" || token.role === "STORE") &&
          staffAllowedAdminPaths.some((p) => pathname === p || pathname.startsWith(p + "/"));
        if (!allowed) {
          return NextResponse.redirect(new URL("/dashboard", req.url));
        }
      }
      if (pathname.startsWith("/staff") && token.role !== "STAFF" && token.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon|manifest|sw\\.js|workbox-|icons/|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|json|js|css|woff2?)$).*)",
  ],
};
