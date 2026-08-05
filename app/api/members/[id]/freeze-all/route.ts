import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import bcrypt from "bcryptjs";
import { z } from "zod";

const schema = z.object({
  days: z.number().int().positive(),
  reason: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAuthSession();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // Verify admin password
  const admin = await prisma.user.findUnique({
    where: { email: session.user!.email! },
    select: { password: true },
  });
  if (!admin?.password) return NextResponse.json({ error: "Cannot verify password" }, { status: 400 });
  const valid = await bcrypt.compare(parsed.data.password, admin.password);
  if (!valid) return NextResponse.json({ error: "Incorrect password" }, { status: 401 });

  const now = new Date();
  const days = parsed.data.days;
  const frozenUntil = new Date(now.getTime() + days * 86400000);
  const toFreeze = await prisma.subscription.findMany({
    where: {
      memberId: params.id,
      status: "ACTIVE",
    },
  });

  for (const sub of toFreeze) {
    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: "PAUSED",
        frozenAt: now,
        frozenUntil,
        ...(sub.endDate ? { endDate: new Date(sub.endDate.getTime() + days * 86400000) } : {}),
      },
    });
  }

  const member = await prisma.member.update({
    where: { id: params.id },
    data: { status: "FROZEN" },
  });

  await logAudit({
    userId: (session.user as any).id,
    userName: session.user?.name ?? session.user?.email ?? "Unknown",
    action: "FREEZE_MEMBER",
    entityType: "Member",
    entityId: params.id,
    entityName: `${member.firstName} ${member.lastName}`,
    description: `Froze all memberships for ${member.firstName} ${member.lastName} for ${days} day(s). Reason: ${parsed.data.reason}`,
    metadata: { days, reason: parsed.data.reason, frozenUntil, subscriptionCount: toFreeze.length },
  });

  return NextResponse.json({ success: true, frozenUntil });
}
