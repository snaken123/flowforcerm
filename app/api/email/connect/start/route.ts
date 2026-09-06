import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getAuthSession } from "@/lib/auth";
import { requireFeature, FLAG_COMMUNICATIONS } from "@/lib/feature-flags";
import { signOAuthState } from "@/lib/oauth-state";

// The "Connect Gmail" button navigates the browser straight here rather than building
// the Google OAuth URL client-side -- GOOGLE_CLIENT_ID and the redirect_uri only need
// to exist server-side this way, and there's no client-exposed value that has to be
// kept in sync with it. Any admin, on any gym, can connect any Gmail account (their
// gym's own, or a personal one) -- nothing here is tied to a specific account; Google's
// own sign-in screen is what lets them pick which one.
export async function GET() {
  const gate = requireFeature(FLAG_COMMUNICATIONS);
  if (gate) return gate;

  const session = await getAuthSession();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "Google OAuth isn't configured yet." }, { status: 503 });
  }

  const subdomain = headers().get("x-tenant-subdomain");
  if (!subdomain) {
    return NextResponse.json({ error: "No tenant context" }, { status: 400 });
  }

  const state = signOAuthState({ userId: (session.user as any).id, subdomain });

  const params = new URLSearchParams({
    client_id: clientId,
    // Fixed and tenant-independent, registered exactly once in Google Cloud Console --
    // must byte-for-byte match what the callback's token exchange sends.
    redirect_uri: `${process.env.NEXTAUTH_URL}/api/email/callback/gmail`,
    response_type: "code",
    scope: "openid email profile https://www.googleapis.com/auth/gmail.modify",
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
