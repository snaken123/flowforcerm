import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  days: z.number().int().positive(),
  reason: z.string().min(1),
  photoUrl: z.string().optional(),
});

// Staff submits a freeze request here instead of freezing directly — an admin must
// approve it via /api/freeze-requests/[id]/approve before any subscription is touched.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAuthSession();
  if (!session || !["ADMIN", "STAFF"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const member = await prisma.member.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  const request = await prisma.membershipFreezeRequest.create({
    data: {
      memberId: params.id,
      days: parsed.data.days,
      reason: parsed.data.reason,
      photoUrl: parsed.data.photoUrl ?? null,
      createdById: (session.user as any).id,
    },
  });

  return NextResponse.json(request, { status: 201 });
}
