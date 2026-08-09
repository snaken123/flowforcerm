import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";

export async function GET() {
  const session = await getAuthSession();
  if (!session || !["ADMIN", "STAFF"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [pendingRecords, incompleteSales, pendingReceipts, pendingPayments, openFollowUps] = await Promise.all([
    prisma.rankRecord.count({ where: { status: "PENDING" } }),
    prisma.shopSale.count({
      where: { OR: [{ paymentMode: null }, { receiptUrl: null, needsReceipt: true }] },
    }),
    prisma.payment.count({ where: { needsReceipt: true, receiptUrl: null, status: "PAID" } }),
    prisma.payment.count({ where: { status: "PENDING" } }),
    prisma.freeTrialFollowUp.count({ where: { status: "OPEN" } }),
  ]);

  const total = pendingRecords + incompleteSales + pendingReceipts + pendingPayments + openFollowUps;

  return NextResponse.json({ total, pendingRecords, incompleteSales, pendingReceipts, pendingPayments, openFollowUps });
}
