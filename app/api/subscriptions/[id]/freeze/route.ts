import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { z } from "zod";

const freezeSchema = z.object({ days: z.number().int().positive() });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAuthSession();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = freezeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const sub = await prisma.subscription.findUnique({ where: { id: params.id } });
  if (!sub) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (sub.status !== "ACTIVE") return NextResponse.json({ error: "Only active memberships can be frozen" }, { status: 400 });

  const now = new Date();
  const frozenUntil = new Date(now.getTime() + parsed.data.days * 86400000);

  await prisma.subscription.update({
    where: { id: params.id },
    data: { status: "PAUSED", frozenAt: now, frozenUntil },
  });

  // Freeze the athlete (guard against null memberId)
  if (sub.memberId) {
    await prisma.member.update({
      where: { id: sub.memberId },
      data: { status: "FROZEN" },
    });
  }

  return NextResponse.json({ success: true, frozenUntil });
}
