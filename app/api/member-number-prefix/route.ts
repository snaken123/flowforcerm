import { NextResponse } from "next/server";
import { getOrLockMemberNumberPrefix } from "@/lib/member-number";

// Unauthenticated — the kiosk and QR-scanner surfaces that need this run without a
// staff session, and the prefix itself (e.g. "FF") isn't sensitive. Tenant is still
// resolved normally via the x-tenant-id header set by subdomain middleware.
export async function GET() {
  const prefix = await getOrLockMemberNumberPrefix();
  return NextResponse.json({ prefix });
}
