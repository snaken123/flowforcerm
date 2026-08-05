import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { sendActivationLinkEmail } from "@/lib/email";
import crypto from "crypto";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const member = await prisma.member.findUnique({
    where: { id: params.id },
    include: { user: { select: { id: true, email: true } } },
  });

  if (!member || !member.user) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (!member.user.email || member.user.email.endsWith("@flowforcerm.local")) {
    return NextResponse.json({ error: "This member has no valid email address on file." }, { status: 400 });
  }

  // Generate a reset token valid for 24 hours — password is NOT changed
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24);

  await prisma.user.update({
    where: { id: member.user.id },
    data: { passwordResetToken: token, passwordResetExpires: expires },
  });

  try {
    await sendActivationLinkEmail({
      to: member.user.email,
      firstName: member.firstName,
      token,
    });
  } catch (err: any) {
    console.error("sendActivationLinkEmail failed:", err);
    return NextResponse.json({ error: err?.message ?? "Email send failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
