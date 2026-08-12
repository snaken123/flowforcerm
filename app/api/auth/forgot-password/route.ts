import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (isRateLimited(`forgot-password:${ip}`, 5, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  let user;
  try {
    user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  } catch (e) {
    // P2021 = table doesn't exist -- a misprovisioned tenant database. This isn't the
    // "email not in our system" case, so it's fine (and useful) to surface it as a real
    // error instead of folding it into the generic { ok: true } anti-enumeration response.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2021") {
      console.error("[forgot-password] tenant database is missing expected schema (table not found):", e.meta);
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }
    throw e;
  }

  // Always return success so we don't reveal whether an email exists
  if (!user || !user.password) {
    return NextResponse.json({ ok: true });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordResetToken: token, passwordResetExpires: expires },
  });

  const firstName = user.name?.split(" ")[0] ?? "there";
  await sendPasswordResetEmail({ to: user.email!, firstName, token });

  return NextResponse.json({ ok: true });
}
