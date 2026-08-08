import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { isAdminOrCoach } from "@/lib/permissions";

// Backs the admin/coach "To Do" queue.
export async function GET() {
  const session = await getAuthSession();
  if (!isAdminOrCoach(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const records = await prisma.rankRecord.findMany({
    where: { status: "PENDING" },
    include: { member: { select: { id: true, firstName: true, lastName: true, photoUrl: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(records);
}
