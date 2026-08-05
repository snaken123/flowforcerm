import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";

// GET — generate a new TOTP secret and return QR code (not yet enabled)
export async function GET() {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    select: { email: true, totpEnabled: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const totp = new OTPAuth.TOTP({
    issuer: "FlowForceRM",
    label: user.email!,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
  });

  const secret = totp.secret.base32;

  // Store the pending secret (not enabled until verified)
  await prisma.user.update({
    where: { id: (session.user as any).id },
    data: { totpSecret: secret },
  });

  const uri = totp.toString();
  const qrDataUrl = await QRCode.toDataURL(uri);

  return NextResponse.json({ secret, qrDataUrl, enabled: user.totpEnabled });
}
