import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { z } from "zod";

const patchSchema = z.object({
  status: z.enum(["CONVERTED", "DECLINED"]),
  declineReason: z.string().optional(),
  declineReasonDetail: z.string().optional(),
  notes: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (!["ADMIN", "STAFF"].includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { status, declineReason, declineReasonDetail, notes } = parsed.data;

  const updated = await prisma.freeTrialFollowUp.update({
    where: { id: params.id },
    data: {
      status,
      ...(declineReason ? { declineReason } : {}),
      ...(declineReasonDetail ? { declineReasonDetail } : {}),
      ...(notes ? { notes } : {}),
      resolvedById: (session.user as any).id,
      resolvedAt: new Date(),
    },
  });

  return NextResponse.json(updated);
}
