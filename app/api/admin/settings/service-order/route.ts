import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";

const KEY = "service_order";

export async function PUT(req: NextRequest) {
  const session = await getAuthSession();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { order } = await req.json().catch(() => ({}));
  if (!Array.isArray(order) || !order.every((id) => typeof id === "string")) {
    return NextResponse.json({ error: "Invalid order" }, { status: 400 });
  }

  await prisma.systemSetting.upsert({
    where: { key: KEY },
    update: { value: JSON.stringify(order) },
    create: { key: KEY, value: JSON.stringify(order) },
  });

  return NextResponse.json({ order });
}
