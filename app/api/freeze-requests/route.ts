import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";

// Backs the "Pending Freeze Requests" To-Do tab.
export async function GET() {
  const session = await getAuthSession();
  if (!session || !["ADMIN", "STAFF"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const requests = await prisma.membershipFreezeRequest.findMany({
    where: { status: "PENDING" },
    include: {
      member: { select: { id: true, firstName: true, lastName: true, photoUrl: true, memberNumber: true } },
      createdBy: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(requests);
}
