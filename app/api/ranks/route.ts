import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { isAdminOrCoach } from "@/lib/permissions";
import { z } from "zod";

const createSchema = z.object({
  memberId: z.string(),
  martialArt: z.string().min(1),
  rank: z.string().min(1),
  stripes: z.number().int().min(1).max(4).nullish(),
  awardedAt: z.string(),
  awardedBy: z.string().optional(),
  details: z.string().optional(),
  photoUrl: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  const userId = (session.user as any).id;
  const staffCreated = isAdminOrCoach(session);
  if (!staffCreated && role !== "MEMBER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  let memberId = parsed.data.memberId;
  if (!staffCreated) {
    // Members can only create records for themselves — ignore any client-supplied memberId.
    const ownMember = await prisma.member.findUnique({ where: { userId }, select: { id: true } });
    if (!ownMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    memberId = ownMember.id;
  }

  const { awardedAt, ...rest } = parsed.data;
  try {
    const record = await prisma.rankRecord.create({
      data: {
        ...rest,
        memberId,
        awardedAt: new Date(awardedAt),
        createdById: userId,
        status: staffCreated ? "APPROVED" : "PENDING",
        ...(staffCreated ? { approvedById: userId, approvedAt: new Date() } : {}),
      },
    });
    return NextResponse.json(record, { status: 201 });
  } catch (e: any) {
    console.error("[rank-create]", e);
    return NextResponse.json({ error: "An unexpected error occurred. Please try again." }, { status: 500 });
  }
}
