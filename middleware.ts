import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// DIAGNOSTIC step 2 of isolating the __dirname crash: with middleware.ts entirely
// absent, the crash disappeared (confirmed -- became a normal 404). This step adds
// back only the next-auth/jwt import and an actual getToken() call, nothing else,
// to test whether that specific import is the real cause now that Next.js has been
// upgraded (the earlier "even an empty middleware crashes" finding was on the old
// Next.js version, before the upgrade -- never re-tested in isolation afterward).
export default async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
