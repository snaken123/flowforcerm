import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";

// Backs the admin/coach "To Do" queue's Pending Receipts section.
export async function GET() {
  const session = await getAuthSession();
  if (!session || !["ADMIN", "STAFF"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payments = await prisma.payment.findMany({
    where: { needsReceipt: true, receiptUrl: null },
    include: {
      member: { select: { id: true, firstName: true, lastName: true, photoUrl: true } },
      employee: { select: { id: true, firstName: true, lastName: true } },
      subscription: { include: { service: { select: { name: true, color: true } } } },
    },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  return NextResponse.json(payments);
}
