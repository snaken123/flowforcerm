import { NextRequest, NextResponse } from "next/server";

// DIAGNOSTIC step 5: only a synchronous cookie read, zero crypto.subtle calls,
// zero other local imports. Isolating whether crypto.subtle itself is the
// trigger, since every crashing variant so far has called it.
export default function middleware(req: NextRequest) {
  const cookie = req.cookies.get("next-auth.session-token")?.value ?? null;
  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
