import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendBulkSMS } from "@/lib/sms";

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { message, audience, memberIds, serviceIds } = await req.json();
  if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 });
  if (message.length > 320) {
    return NextResponse.json({ error: "Message too long. Maximum 320 characters (2 SMS segments)." }, { status: 400 });
  }

  const where: any = { phone: { not: null } };
  if (audience === "active") where.status = "ACTIVE";
  if (audience === "inactive") where.status = "INACTIVE";
  if (audience === "specific" && Array.isArray(memberIds)) where.id = { in: memberIds };
  if (Array.isArray(serviceIds) && serviceIds.length > 0) {
    where.subscriptions = { some: { serviceId: { in: serviceIds }, status: "ACTIVE" } };
  }

  const members = await prisma.member.findMany({
    where,
    select: { firstName: true, phone: true },
  });

  const recipients = members
    .filter((m) => !!m.phone)
    .map((m) => ({ phone: m.phone!, name: m.firstName }));

  if (recipients.length === 0) {
    return NextResponse.json({ error: "No recipients with phone numbers found" }, { status: 400 });
  }

  const results = await sendBulkSMS(recipients, message);

  await prisma.broadcast.create({
    data: {
      subject: "SMS",
      body: message,
      audience: audience ?? "all",
      recipientCount: recipients.length,
      sentById: (session.user as any).id,
    },
  });

  return NextResponse.json({ ...results, recipientCount: recipients.length });
}
