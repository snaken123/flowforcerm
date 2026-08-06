import { NextRequest, NextResponse } from "next/server";
import { findTenantBySubdomain } from "@/control-plane/lib/tenant-resolution";

// Internal-only: called by middleware (Edge runtime, can't open a Postgres connection
// directly) to resolve a subdomain to a tenant via the control-plane database, which
// only a Node-runtime route handler like this one can query. Never exposed to tenants
// or the public — gated by a shared secret, not by NextAuth (there is no session yet
// at this point in the request lifecycle).
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-internal-secret");
  if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const subdomain = req.nextUrl.searchParams.get("subdomain");
  if (!subdomain) {
    return NextResponse.json({ error: "Missing subdomain" }, { status: 400 });
  }

  const tenant = await findTenantBySubdomain(subdomain);
  if (!tenant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(tenant);
}
