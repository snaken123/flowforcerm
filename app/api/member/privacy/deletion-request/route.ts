import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

// POST — submit a data deletion request (RA 10173 compliance)
// Logs the request; actual deletion is performed manually by admin within 30 days.
export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session || (session.user as any).role !== "MEMBER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = (session.user as any).id;
  const { reason } = await req.json().catch(() => ({}));

  const member = await prisma.member.findUnique({
    where: { userId },
    select: { id: true, firstName: true, lastName: true, memberNumber: true },
  });

  await logAudit({
    userId,
    userName: session.user?.name ?? session.user?.email ?? "Unknown",
    action: "DATA_DELETION_REQUEST",
    entityType: "Member",
    entityId: member?.id ?? userId,
    entityName: member ? `${member.firstName} ${member.lastName} (${member.memberNumber})` : session.user?.email ?? userId,
    description: `Member submitted a data deletion request.${reason ? ` Reason: ${reason}` : ""}`,
    metadata: { reason: reason ?? null },
  });

  return NextResponse.json({ ok: true });
}
