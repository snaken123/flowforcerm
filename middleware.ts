import { NextRequest, NextResponse } from "next/server";

// TEMPORARY DIAGNOSTIC: stripped to the bare minimum to isolate a persistent
// "__dirname is not defined" crash on Vercel's Edge Runtime that survived three
// targeted fixes. If this minimal version still crashes, the problem isn't in
// middleware's own code/imports at all. Full logic backed up in git history
// (the commit right before this one) -- restore once the cause is found.
export default async function middleware(req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon|manifest|sw\\.js|workbox-|icons/|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|json|js|css|woff2?)$).*)",
  ],
};
