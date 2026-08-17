import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { google } from "googleapis";
import { requireFeature, FLAG_COMMUNICATIONS } from "@/lib/feature-flags";

export async function POST(req: NextRequest) {
  const gate = requireFeature(FLAG_COMMUNICATIONS);
  if (gate) return gate;

  const session = await getAuthSession();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { provider, code } = await req.json();
  const userId = (session.user as any).id;

  if (provider === "gmail") {
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

      return NextResponse.json({ success: true, email: userInfo.data.email });
    } catch (err: any) {
      console.error(err);
      return NextResponse.json({ error: "OAuth exchange failed" }, { status: 400 });
    }
  }

  return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });
}

export async function GET(req: NextRequest) {
  const gate = requireFeature(FLAG_COMMUNICATIONS);
  if (gate) return gate;

  const session = await getAuthSession();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = (session.user as any).id;
  const integration = await prisma.emailIntegration.findUnique({
    where: { userId },
    select: { provider: true, email: true, createdAt: true },
  });

  return NextResponse.json(integration);
}

export async function DELETE(req: NextRequest) {
  const gate = requireFeature(FLAG_COMMUNICATIONS);
  if (gate) return gate;

  const session = await getAuthSession();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = (session.user as any).id;
  await prisma.emailIntegration.deleteMany({ where: { userId } });
  return NextResponse.json({ success: true });
}
