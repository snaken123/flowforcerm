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

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAuthSession();
  if (!isAdminOrCoach(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const userId = (session!.user as any).id;

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

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAuthSession();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await prisma.rankRecord.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
