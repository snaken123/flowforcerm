import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import bcrypt from "bcryptjs";
import { z } from "zod";

const schema = z.object({
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

  const admin = await prisma.user.findUnique({
    where: { email: session.user!.email! },
    select: { password: true },
  });
  if (!admin?.password) return NextResponse.json({ error: "Cannot verify password" }, { status: 400 });
  const valid = await bcrypt.compare(parsed.data.password, admin.password);
  if (!valid) return NextResponse.json({ error: "Incorrect password" }, { status: 401 });

  const now = new Date();
  const frozen = await prisma.subscription.findMany({
    where: { memberId: params.id, status: "PAUSED" },
  });

  for (const sub of frozen) {
    const remainingFrozenMs = sub.frozenUntil ? Math.max(0, sub.frozenUntil.getTime() - now.getTime()) : 0;
    const remainingFrozenDays = Math.ceil(remainingFrozenMs / 86400000);

    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: "ACTIVE",
        frozenAt: null,
        frozenUntil: null,
        ...(sub.endDate && remainingFrozenDays > 0
          ? { endDate: new Date(sub.endDate.getTime() - remainingFrozenDays * 86400000) }
          : {}),
      },
    });
  }

  const member = await prisma.member.update({
    where: { id: params.id },
    data: { status: "ACTIVE" },
  });

  await logAudit({
    userId: (session.user as any).id,
    userName: session.user?.name ?? session.user?.email ?? "Unknown",
    action: "UNFREEZE_MEMBER",
    entityType: "Member",
    entityId: params.id,
    entityName: `${member.firstName} ${member.lastName}`,
    description: `Unfroze all memberships for ${member.firstName} ${member.lastName}. Reason: ${parsed.data.reason}`,
    metadata: { reason: parsed.data.reason, subscriptionCount: frozen.length },
  });

  return NextResponse.json({ success: true });
}
