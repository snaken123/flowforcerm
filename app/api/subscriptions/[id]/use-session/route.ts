import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAuthSession();
  if (!session || !["ADMIN", "STAFF", "STORE"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sub = await prisma.subscription.findUnique({ where: { id: params.id } });
  if (!sub) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (sub.status !== "ACTIVE") return NextResponse.json({ error: "Subscription is not active" }, { status: 400 });
  if (sub.sessionsTotal === null) return NextResponse.json({ error: "Not a session-based subscription" }, { status: 400 });

  // Atomic conditional increment — prevents overbilling under concurrent check-ins
  const result = await prisma.subscription.updateMany({
    where: { id: params.id, sessionsUsed: { lt: sub.sessionsTotal! } },
    data: { sessionsUsed: { increment: 1 } },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "No sessions remaining" }, { status: 400 });
  }

  const updated = await prisma.subscription.findUnique({ where: { id: params.id } });
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isExhausted = updated.sessionsUsed >= (updated.sessionsTotal ?? Infinity);
  if (isExhausted) {
    await prisma.subscription.update({ where: { id: params.id }, data: { status: "EXPIRED" } });
    updated.status = "EXPIRED";
  }

  return NextResponse.json({ subscription: updated, expired: isExhausted });
}
