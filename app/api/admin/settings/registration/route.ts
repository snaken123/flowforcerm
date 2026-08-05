import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";

const KEY = "registration_welcome_message";
const DEFAULT = "Join NorthSouth Fight Sports for a FREE trial class! Try Yoga, Judo, or Brazilian Jiujitsu — no experience needed. Sign up below and we'll send you a link to reserve your spot.";

export async function GET() {
  const setting = await prisma.systemSetting.findUnique({ where: { key: KEY } });
  return NextResponse.json({ message: setting?.value ?? DEFAULT });
}

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { message } = await req.json();
  await prisma.systemSetting.upsert({
    where: { key: KEY },
    update: { value: message },
    create: { key: KEY, value: message },
  });
  return NextResponse.json({ success: true });
}
