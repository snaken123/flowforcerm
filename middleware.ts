import { NextRequest, NextResponse } from "next/server";

// DIAGNOSTIC step 6: read the raw Cookie header string directly instead of using
// NextRequest's .cookies convenience API, isolating whether that specific API
// wrapper (not just "reading a cookie" in general) is the trigger.
export default function middleware(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie") ?? "";
  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
