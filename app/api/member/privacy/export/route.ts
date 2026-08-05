import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET — export all personal data for the logged-in member (RA 10173 compliance)
export async function GET() {
  const session = await getAuthSession();
  if (!session || (session.user as any).role !== "MEMBER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = (session.user as any).id;

  const [user, member] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    }),
    prisma.member.findUnique({
      where: { userId },
      include: {
        subscriptions: { include: { service: { select: { name: true } } } },
        payments: true,
        checkIns: { orderBy: { checkedInAt: "desc" }, take: 200 },
        rankRecords: true,
      },
    }),
  ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    account: user,
    profile: member ? {
      memberNumber: member.memberNumber,
      firstName: member.firstName,
      lastName: member.lastName,
      phone: member.phone,
      dateOfBirth: member.dateOfBirth,
      address: member.address,
      gender: member.gender,
      status: member.status,
      joinDate: member.joinDate,
      emergencyName: member.emergencyName,
      emergencyPhone: member.emergencyPhone,
      emergencyRel: member.emergencyRel,
    } : null,
    memberships: member?.subscriptions ?? [],
    payments: member?.payments ?? [],
    checkIns: member?.checkIns ?? [],
    rankRecords: member?.rankRecords ?? [],
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="my-data-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
