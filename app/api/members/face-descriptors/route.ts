import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";

export async function GET() {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (!["ADMIN", "STAFF", "KIOSK"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const members = await prisma.member.findMany({
    where: {
      status: "ACTIVE",
      NOT: { faceDescriptor: { isEmpty: true } },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      photoUrl: true,
      memberNumber: true,
      faceDescriptor: true,
    },
  });

  return NextResponse.json(members);
}
