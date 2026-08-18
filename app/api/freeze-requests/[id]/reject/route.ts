import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({ reason: z.string().min(1) });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAuthSession();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const freezeRequest = await prisma.membershipFreezeRequest.findUnique({ where: { id: params.id } });
  if (!freezeRequest) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (freezeRequest.status !== "PENDING") {
    return NextResponse.json({ error: "This request has already been reviewed." }, { status: 409 });
  }

  // Atomic claim: only succeeds if the request is still PENDING, so a concurrent
  // approve/reject can't both go through.
  const claim = await prisma.membershipFreezeRequest.updateMany({
    where: { id: params.id, status: "PENDING" },
    data: {
      status: "REJECTED",
      rejectionReason: parsed.data.reason,
      reviewedById: (session.user as any).id,
      reviewedAt: new Date(),
    },
  });
  if (claim.count === 0) {
    return NextResponse.json({ error: "This request has already been reviewed." }, { status: 409 });
  }

  const updated = await prisma.membershipFreezeRequest.findUniqueOrThrow({ where: { id: params.id } });

  return NextResponse.json(updated);
}
