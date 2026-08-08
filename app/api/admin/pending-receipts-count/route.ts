import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";

// Backs the sidebar "To Do" badge (combined with the pending-Records count).
export async function GET() {
  const session = await getAuthSession();
  if (!session || !["ADMIN", "STAFF"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const count = await prisma.payment.count({ where: { needsReceipt: true, receiptUrl: null } });
  return NextResponse.json({ count });
}
