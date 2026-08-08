import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { isAdminOrCoach } from "@/lib/permissions";
import { z } from "zod";

const patchSchema = z.object({
  martialArt: z.string().min(1).optional(),
  rank: z.string().min(1).optional(),
  stripes: z.number().int().min(1).max(4).nullish(),
  awardedAt: z.string().optional(),
  awardedBy: z.string().optional(),
  details: z.string().optional(),
  photoUrl: z.string().optional(),
  status: z.enum(["APPROVED", "PENDING", "REJECTED"]).optional(),
  rejectionReason: z.string().optional(),
});

// Members editing their own record can only touch the content fields — never status
// or rejectionReason directly (that stays Admin/Coach-only, via the schema above).
const memberPatchSchema = z.object({
  martialArt: z.string().min(1).optional(),
  rank: z.string().min(1).optional(),
  stripes: z.number().int().min(1).max(4).nullish(),
  awardedAt: z.string().optional(),
  awardedBy: z.string().optional(),
  details: z.string().optional(),
  photoUrl: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  if (isAdminOrCoach(session)) {
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    if (parsed.data.status === "REJECTED" && !parsed.data.rejectionReason?.trim()) {
      return NextResponse.json({ error: "A reason is required to reject a record." }, { status: 400 });
    }

    const data: any = { ...parsed.data };
    if (data.awardedAt) data.awardedAt = new Date(data.awardedAt);

    if (data.status === "APPROVED") {
      data.approvedById = userId;
      data.approvedAt = new Date();
      data.rejectionReason = null;
    } else if (data.status === "REJECTED") {
      data.approvedById = null;
      data.approvedAt = null;
    }

    const record = await prisma.rankRecord.update({ where: { id: params.id }, data });
    return NextResponse.json(record);
  }

  if (role !== "MEMBER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Members may edit their own PENDING or REJECTED records — never an already-APPROVED
  // one. Editing a REJECTED record resubmits it: status resets to PENDING and the prior
  // rejection is cleared, sending it back into the To Do queue for a fresh review.
  const existing = await prisma.rankRecord.findUnique({
    where: { id: params.id },
    select: { status: true, member: { select: { userId: true } } },
  });
  if (!existing || existing.member.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (existing.status === "APPROVED") {
    return NextResponse.json({ error: "Approved records can't be edited." }, { status: 403 });
  }

  const body = await req.json();
  const parsed = memberPatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data: any = { ...parsed.data };
  if (data.awardedAt) data.awardedAt = new Date(data.awardedAt);
  if (existing.status === "REJECTED") {
    data.status = "PENDING";
    data.rejectionReason = null;
    data.approvedById = null;
    data.approvedAt = null;
  }

  const record = await prisma.rankRecord.update({ where: { id: params.id }, data });
  return NextResponse.json(record);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  if (role === "ADMIN") {
    await prisma.rankRecord.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  }

  if (role !== "MEMBER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Members may delete their own record regardless of status (PENDING, REJECTED, or
  // even an already-APPROVED one) — unlike editing, deletion needs no re-review.
  const existing = await prisma.rankRecord.findUnique({
    where: { id: params.id },
    select: { member: { select: { userId: true } } },
  });
  if (!existing || existing.member.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.rankRecord.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
