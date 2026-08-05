import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Resend } from "resend";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";
import crypto from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY);
const APP_URL = process.env.NEXTAUTH_URL ?? "https://flowforcerm.com";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (isRateLimited(`register-initiate:${ip}`, 3, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many registration attempts. Please try again later." }, { status: 429 });
  }

  const { firstName, lastName, email, phone } = await req.json();

  if (!firstName || !lastName || !email || !phone) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Check if email already exists in the system
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json({ exists: true });
  }

  // Delete any existing unused tokens for this email
  await prisma.freeTrialToken.deleteMany({
    where: { email, usedAt: null },
  });

  // Create new token (expires in 1 hour)
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.freeTrialToken.create({
    data: { token, email, firstName, lastName, phone, expiresAt },
  });

  const verifyUrl = `${APP_URL}/register/select?token=${token}`;

  await resend.emails.send({
    from: "FlowForceRM <noreply@flowforcerm.com>",
    replyTo: "members@flowforcerm.com",
    to: email,
    subject: "Confirm your free trial at FlowForceRM",
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#111">
        <div style="margin-bottom:24px"><strong style="font-size:18px">FlowForceRM</strong></div>
        <h2 style="margin:0 0 12px">Hi ${firstName}! You're almost there 🥋</h2>
        <p style="font-size:15px;line-height:1.6;color:#444">
          Click the button below to confirm your email and choose your free trial class.
          This link expires in <strong>1 hour</strong>.
        </p>
        <a href="${verifyUrl}"
          style="display:inline-block;margin:24px 0;padding:14px 28px;background:#111;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px">
          Choose My Free Class →
        </a>
        <p style="font-size:13px;color:#888">If you didn't request this, you can ignore this email.</p>
        <hr style="margin:32px 0;border:none;border-top:1px solid #e5e7eb"/>
        <p style="font-size:12px;color:#aaa">FlowForceRM · members@flowforcerm.com</p>
      </div>
    `,
  });

  return NextResponse.json({ sent: true });
}
