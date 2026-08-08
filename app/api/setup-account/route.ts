import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { nextMemberNumber } from "@/lib/member-number";

const schema = z.discriminatedUnion("step", [
  z.object({ step: z.literal("password"), newPassword: z.string().min(8) }),
  z.object({ step: z.literal("waiver") }),
  z.object({ step: z.literal("privacy") }),
  z.object({ step: z.literal("rules") }),
  z.object({ step: z.literal("handbook") }),
  z.object({ step: z.literal("welcome") }),
]);

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id as string;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const now = new Date();

  if (parsed.data.step === "password") {
    const hashed = await bcrypt.hash(parsed.data.newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashed, mustChangePassword: false },
    });
    return NextResponse.json({ ok: true });
  }

  const member = await prisma.member.findUnique({ where: { userId } });
  if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  if (parsed.data.step === "waiver") {
    await prisma.member.update({ where: { id: member.id }, data: { waiverSigned: true, waiverDate: now } });
  } else if (parsed.data.step === "privacy") {
    await prisma.member.update({ where: { id: member.id }, data: { privacyAcceptedAt: now } });
  } else if (parsed.data.step === "rules") {
    await prisma.member.update({ where: { id: member.id }, data: { rulesAcknowledgedAt: now } });
  } else if (parsed.data.step === "handbook" || parsed.data.step === "welcome") {
    // Auto-assign an Athlete ID if not already set
    const memberNumber = member.memberNumber ?? (await nextMemberNumber());
    await prisma.member.update({
      where: { id: member.id },
      data: { handbookReadAt: now, onboardingCompletedAt: now, activatedAt: now, memberNumber },
    });
    // Clear the mustChangePassword flag — this triggers JWT refresh to drop the redirect
    await prisma.user.update({ where: { id: userId }, data: { mustChangePassword: false } });
  }

  return NextResponse.json({ ok: true });
}
