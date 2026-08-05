import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { google } from "googleapis";

export async function GET(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const returnedState = searchParams.get("state");

  if (error || !code) {
    return NextResponse.redirect(new URL("/admin/email?error=oauth_denied", req.url));
  }

  // Verify CSRF state parameter
  const cookieHeader = req.headers.get("cookie") ?? "";
  const storedState = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("gmail_oauth_state="))
    ?.split("=")[1];

  if (!returnedState || !storedState || returnedState !== storedState) {
    console.error("[gmail-callback] State mismatch — possible CSRF");
    return NextResponse.redirect(new URL("/admin/email?error=oauth_state_mismatch", req.url));
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

    const userId = (session.user as any).id;

    await prisma.emailIntegration.upsert({
      where: { userId },
      update: {
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token ?? undefined,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
        email: userInfo.data.email!,
        provider: "gmail",
      },
      create: {
        userId,
        provider: "gmail",
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
        email: userInfo.data.email!,
      },
    });

    const redirectResponse = NextResponse.redirect(new URL("/admin/email?connected=true", req.url));
    redirectResponse.cookies.set("gmail_oauth_state", "", { path: "/", maxAge: 0 });
    return redirectResponse;
  } catch (err) {
    console.error("Gmail OAuth callback error:", err);
    return NextResponse.redirect(new URL("/admin/email?error=oauth_failed", req.url));
  }
}
