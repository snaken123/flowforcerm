import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";

const KEY = "class_locations";
const DEFAULT_LOCATIONS = ["Main Mats", "Boxing Area", "Weights Area", "Mezzanine"];

export async function GET() {
  const session = await getAuthSession();
  if (!session || !["ADMIN", "STAFF"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const row = await prisma.systemSetting.findUnique({ where: { key: KEY } });
  const locations = row ? JSON.parse(row.value) : DEFAULT_LOCATIONS;
  return NextResponse.json({ locations });
}

export async function PUT(req: NextRequest) {
  const session = await getAuthSession();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { locations } = await req.json().catch(() => ({}));
  if (!Array.isArray(locations) || !locations.every((l) => typeof l === "string")) {
    return NextResponse.json({ error: "Invalid locations" }, { status: 400 });
  }

  const cleaned = [...new Set(locations.map((l) => l.trim()).filter(Boolean))];
  await prisma.systemSetting.upsert({
    where: { key: KEY },
    update: { value: JSON.stringify(cleaned) },
    create: { key: KEY, value: JSON.stringify(cleaned) },
  });

  return NextResponse.json({ locations: cleaned });
}
