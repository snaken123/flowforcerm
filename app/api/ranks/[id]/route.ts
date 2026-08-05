import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { z } from "zod";

const patchSchema = z.object({
  martialArt: z.string().min(1).optional(),
  rank: z.string().min(1).optional(),
  stripes: z.number().int().min(1).max(4).nullish(),
  awardedAt: z.string().optional(),
  awardedBy: z.string().optional(),
  notes: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAuthSession();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data: any = { ...parsed.data };
  if (data.awardedAt) data.awardedAt = new Date(data.awardedAt);

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
