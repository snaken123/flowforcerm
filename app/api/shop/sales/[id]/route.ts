import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { z } from "zod";
import { requireFeature, FLAG_SPECIALIZED_ROLES } from "@/lib/feature-flags";

const updateSchema = z.object({
  buyerMemberId: z.string().nullable().optional(),
  buyerEmployeeId: z.string().nullable().optional(),
  buyerName: z.string().nullable().optional(),
  paymentMode: z.string().min(1).optional(),
  receiptUrl: z.string().nullable().optional(),
  needsReceipt: z.boolean().optional(),
  notes: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const gate = requireFeature(FLAG_SPECIALIZED_ROLES);
  if (gate) return gate;

  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (!["ADMIN", "STAFF", "STORE"].includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = await prisma.shopSale.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const newPaymentMode = parsed.data.paymentMode !== undefined ? parsed.data.paymentMode : existing.paymentMode;
  const newReceiptUrl = parsed.data.receiptUrl !== undefined ? parsed.data.receiptUrl : existing.receiptUrl;
  const newNeedsReceipt = parsed.data.needsReceipt !== undefined ? parsed.data.needsReceipt : existing.needsReceipt;
  const isNowComplete = !!newPaymentMode && (!newNeedsReceipt || !!newReceiptUrl);

  const sale = await prisma.shopSale.update({
    where: { id: params.id },
    data: {
      ...parsed.data,
      ...(isNowComplete && !existing.resolvedAt ? { resolvedAt: new Date() } : {}),
    },
    include: {
      items: { include: { shopItem: { select: { name: true, category: true } } } },
      buyerMember: { select: { firstName: true, lastName: true, memberNumber: true } },
      buyerEmployee: { select: { firstName: true, lastName: true } },
    },
  });

  return NextResponse.json(sale);
}
