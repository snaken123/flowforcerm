import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { z } from "zod";

const patchSchema = z.object({
  method: z.string().optional(),
  receiptUrl: z.string().nullable().optional(),
  needsReceipt: z.boolean().optional(),
  notes: z.string().nullable().optional(),
  // Custom paid-on date (YYYY-MM-DD), e.g. recording a payment that actually happened
  // days ago. Only used when it's actually completing the payment below -- see there.
  paidAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (!["ADMIN", "STAFF"].includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = await prisma.payment.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { method, receiptUrl, needsReceipt, notes, paidAt } = parsed.data;

  const newMethod = method !== undefined ? method : existing.method;
  const newReceiptUrl = receiptUrl !== undefined ? receiptUrl : existing.receiptUrl;
  const newNeedsReceipt = needsReceipt !== undefined ? needsReceipt : existing.needsReceipt;

  const isNowComplete = !!newMethod && (!newNeedsReceipt || !!newReceiptUrl);
  const wasPending = existing.status === "PENDING";
  // A custom paidAt only makes sense at the moment payment is actually being completed --
  // ignored otherwise, so it can't be used to silently backdate an already-paid record.
  const paidOnDate = paidAt ? new Date(paidAt + "T00:00:00Z") : new Date();

  const updated = await prisma.payment.update({
    where: { id: params.id },
    data: {
      ...(method !== undefined ? { method } : {}),
      ...(receiptUrl !== undefined ? { receiptUrl } : {}),
      ...(needsReceipt !== undefined ? { needsReceipt } : {}),
      ...(notes !== undefined ? { notes } : {}),
      ...(isNowComplete && wasPending ? { status: "PAID", paidAt: paidOnDate } : {}),
    },
  });

  return NextResponse.json(updated);
}
