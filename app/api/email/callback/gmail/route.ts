import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { verifyOAuthState } from "@/lib/oauth-state";
import { findTenantBySubdomain } from "@/control-plane/lib/tenant-resolution";
import { getPrismaClientForTenant } from "@/lib/db";
import { tenantOrigin } from "@/lib/email";
import { FLAG_COMMUNICATIONS } from "@/lib/feature-flags-constants";

// This callback's URL is fixed and shared by every gym (see api/email/connect/start) --
// it does NOT run with the originating tenant's middleware context (no x-tenant-*
// headers) or a usable session cookie (cookies don't cross subdomains), so it can't use
// the ambient `prisma` export or getAuthSession() the way a normal tenant-side route
// would. Everything it needs -- which gym, which admin -- comes from the signed state
// instead, and it talks to that one tenant's database via getPrismaClientForTenant().
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const rawState = searchParams.get("state");

  const fallbackHome = process.env.NEXTAUTH_URL ?? "https://flowforcerm.com";
  const state = rawState ? verifyOAuthState<{ userId: string; subdomain: string }>(rawState) : null;
  if (!state) {
    // No valid state means we don't know which gym to send them back to.
    return NextResponse.redirect(fallbackHome);
  }

  const backTo = (path: string) => NextResponse.redirect(new URL(path, tenantOrigin(state.subdomain)));

  if (error || !code) {
    return backTo("/admin/email?error=oauth_denied");
  }

  const tenant = await findTenantBySubdomain(state.subdomain);
  if (!tenant || !tenant.activeFlags.includes(FLAG_COMMUNICATIONS)) {
    return backTo("/admin/email?error=oauth_failed");
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXTAUTH_URL}/api/email/callback/gmail`
  );

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    const tenantPrisma = await getPrismaClientForTenant(tenant.id);
    await tenantPrisma.emailIntegration.upsert({
      where: { userId: state.userId },
      update: {
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token ?? undefined,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
        email: userInfo.data.email!,
        provider: "gmail",
      },
      create: {
        userId: state.userId,
        provider: "gmail",
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
        email: userInfo.data.email!,
      },
    });

    return backTo("/admin/email?connected=true");
  } catch (err) {
    console.error("Gmail OAuth callback error:", err);
    return backTo("/admin/email?error=oauth_failed");
  }
}
