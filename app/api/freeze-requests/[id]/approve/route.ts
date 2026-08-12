import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

// Executes the actual freeze — mirrors /api/members/[id]/freeze-all's mutation, just
// triggered by an admin approving a staff-submitted request instead of a direct action.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAuthSession();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const freezeRequest = await prisma.membershipFreezeRequest.findUnique({
    where: { id: params.id },
    include: { member: true },
  });
  if (!freezeRequest) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (freezeRequest.status !== "PENDING") {
    return NextResponse.json({ error: "This request has already been reviewed." }, { status: 409 });
  }

  const now = new Date();
  const days = freezeRequest.days;
  const frozenUntil = new Date(now.getTime() + days * 86400000);
  const toFreeze = await prisma.subscription.findMany({
    where: { memberId: freezeRequest.memberId, status: "ACTIVE" },
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

  await prisma.member.update({ where: { id: freezeRequest.memberId }, data: { status: "FROZEN" } });

  const updated = await prisma.membershipFreezeRequest.update({
    where: { id: params.id },
    data: { status: "APPROVED", reviewedById: (session.user as any).id, reviewedAt: now },
  });

  await logAudit({
    userId: (session.user as any).id,
    userName: session.user?.name ?? session.user?.email ?? "Unknown",
    action: "FREEZE_MEMBER",
    entityType: "Member",
    entityId: freezeRequest.memberId,
    entityName: `${freezeRequest.member.firstName} ${freezeRequest.member.lastName}`,
    description: `Approved a staff freeze request for ${freezeRequest.member.firstName} ${freezeRequest.member.lastName} for ${days} day(s). Reason: ${freezeRequest.reason}`,
    metadata: { days, reason: freezeRequest.reason, frozenUntil, subscriptionCount: toFreeze.length, freezeRequestId: freezeRequest.id },
  });

  return NextResponse.json(updated);
}
