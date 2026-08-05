import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  memberId: z.string(),
  martialArt: z.string().min(1),
  rank: z.string().min(1),
  stripes: z.number().int().min(1).max(4).nullish(),
  awardedAt: z.string(),
  awardedBy: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { awardedAt, ...rest } = parsed.data;
  try {
    const record = await prisma.rankRecord.create({
      data: { ...rest, awardedAt: new Date(awardedAt) },
    });
    return NextResponse.json(record, { status: 201 });
  } catch (e: any) {
    console.error("[rank-create]", e);
    return NextResponse.json({ error: "An unexpected error occurred. Please try again." }, { status: 500 });
  }
}
