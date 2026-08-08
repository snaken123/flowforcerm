import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import { nextMemberNumber } from "@/lib/member-number";

const createChildSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  guardianUserId: z.string().min(1),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createChildSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const guardian = await prisma.user.findUnique({ where: { id: parsed.data.guardianUserId } });
  if (!guardian) return NextResponse.json({ error: "Guardian not found" }, { status: 404 });

  const memberNumber = await nextMemberNumber();

  const member = await prisma.member.create({
    data: {
      memberNumber,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      guardianUserId: parsed.data.guardianUserId,
      phone: parsed.data.phone,
      dateOfBirth: parsed.data.dateOfBirth ? new Date(parsed.data.dateOfBirth) : undefined,
      gender: parsed.data.gender,
      status: "ACTIVE",
    },
  });

  await logAudit({
    userId: (session.user as any).id,
    userName: session.user?.name ?? session.user?.email ?? "Unknown",
    action: "CREATE_MEMBER",
    entityType: "Member",
    entityId: member.id,
    entityName: `${member.firstName} ${member.lastName}`,
    description: `Created child member ${member.firstName} ${member.lastName} under guardian ${guardian.name ?? guardian.email}`,
    metadata: { memberNumber, guardianUserId: parsed.data.guardianUserId, guardianEmail: guardian.email },
  });

  return NextResponse.json(member, { status: 201 });
}
