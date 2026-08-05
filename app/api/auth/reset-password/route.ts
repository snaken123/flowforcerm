import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { getResetPasswordLimiter, getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  // Rate-limit by IP — 10 attempts per hour
  try {
    const limiter = getResetPasswordLimiter();
    const ip = getClientIp(req);
    const { success } = await limiter.limit(ip);
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Please wait before trying again." },
        { status: 429 }
      );
    }
  } catch {
    // If Redis is unavailable, fail open
  }

  const { token, password } = await req.json();
  if (!token || !password) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { passwordResetToken: token } });

  if (!user || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
    return NextResponse.json({ error: "This link has expired or is invalid. Please request a new one." }, { status: 400 });
  }

  const hashed = await bcrypt.hash(password, 12);
  // Consume the token atomically with the password update — prevents reuse
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashed,
      mustChangePassword: false,
      passwordResetToken: null,
      passwordResetExpires: null,
    },
  });

  return NextResponse.json({ ok: true });
}
