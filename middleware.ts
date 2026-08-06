import { NextRequest, NextResponse } from "next/server";
import { getEdgeToken } from "./lib/edge-jwt";

// DIAGNOSTIC step 3: swapped next-auth/jwt's getToken() for a custom jose-based
// decoder (lib/edge-jwt.ts) that bypasses next-auth/jwt's module graph entirely,
// which was confirmed as the actual crash source in the previous test.
export default async function middleware(req: NextRequest) {
  const token = await getEdgeToken(req);
  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
