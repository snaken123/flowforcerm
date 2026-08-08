import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";

export async function GET() {
  const session = await getAuthSession();
  if (!session || !["ADMIN", "STAFF", "STORE"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Matches the Log tab's own "incomplete" flag: missing payment mode always counts,
  // but a missing receipt only counts when one was actually required.
  const count = await prisma.shopSale.count({
    where: {
      OR: [
        { paymentMode: null },
        { receiptUrl: null, needsReceipt: true },
      ],
    },
  });

  return NextResponse.json({ count });
}
