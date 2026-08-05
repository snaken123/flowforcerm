import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const createSchema = z.object({
  memberId: z.string(),
  subscriptionId: z.string().optional(),
  amount: z.number().positive(),
  method: z.string().optional(),
  status: z.enum(["PAID", "PENDING", "OVERDUE", "WAIVED"]).default("PAID"),
  paidAt: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session || !["ADMIN", "STAFF", "STORE"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const payment = await prisma.payment.create({
    data: {
      memberId: parsed.data.memberId,
      subscriptionId: parsed.data.subscriptionId ?? null,
      amount: parsed.data.amount,
      status: parsed.data.status,
      method: parsed.data.method ?? null,
      notes: parsed.data.notes ?? null,
      paidAt: parsed.data.paidAt ? new Date(parsed.data.paidAt) : new Date(),
    },
  });

  await logAudit({
    userId: (session.user as any).id,
    userName: session.user?.name ?? session.user?.email ?? "Unknown",
    action: "CREATE_PAYMENT",
    entityType: "Payment",
    entityId: payment.id,
    entityName: `₱${parsed.data.amount} — ${parsed.data.method ?? "unspecified"}`,
    description: `Recorded ${parsed.data.status} payment of ₱${parsed.data.amount} for member ${parsed.data.memberId} via ${parsed.data.method ?? "unspecified method"}`,
    metadata: { amount: parsed.data.amount, method: parsed.data.method, status: parsed.data.status, memberId: parsed.data.memberId },
  });

  return NextResponse.json(payment, { status: 201 });
}
