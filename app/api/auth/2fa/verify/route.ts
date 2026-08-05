import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import * as OTPAuth from "otpauth";

// POST — verify a TOTP code and enable 2FA
export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await req.json();
  if (!code) return NextResponse.json({ error: "Code is required." }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    select: { totpSecret: true, totpEnabled: true },
  });

  if (!user?.totpSecret) {
    return NextResponse.json({ error: "No setup in progress. Generate a QR code first." }, { status: 400 });
  }

  const totp = new OTPAuth.TOTP({
    issuer: "FlowForceRM",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(user.totpSecret),
  });

  const delta = totp.validate({ token: code.replace(/\s/g, ""), window: 1 });
  if (delta === null) {
    return NextResponse.json({ error: "Invalid or expired code. Try again." }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: (session.user as any).id },
    data: { totpEnabled: true },
  });

  return NextResponse.json({ ok: true });
}
