import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { isAdminOrCoach } from "@/lib/permissions";

// Backs the sidebar "To Do" badge.
export async function GET() {
  const session = await getAuthSession();
  if (!isAdminOrCoach(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const count = await prisma.rankRecord.count({ where: { status: "PENDING" } });
  return NextResponse.json({ count });
}
