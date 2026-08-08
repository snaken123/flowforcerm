import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";

// Backs the admin/coach "To Do" queue's Pending Store Sales section.
export async function GET() {
  const session = await getAuthSession();
  if (!session || !["ADMIN", "STAFF"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sales = await prisma.shopSale.findMany({
    where: {
      OR: [
        { paymentMode: null },
        { receiptUrl: null, needsReceipt: true },
      ],
    },
    include: {
      items: { include: { shopItem: { select: { name: true, category: true } } } },
      buyerMember: { select: { firstName: true, lastName: true, memberNumber: true } },
      buyerEmployee: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(sales);
}
