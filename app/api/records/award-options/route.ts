import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { isAdminOrCoach } from "@/lib/permissions";

const KEY = "record_award_options";
const DEFAULT_OPTIONS = ["Medal", "Certifications", "PR", "Belt"];

export async function GET() {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const row = await prisma.systemSetting.findUnique({ where: { key: KEY } });
  const options: string[] = row ? JSON.parse(row.value) : DEFAULT_OPTIONS;
  return NextResponse.json({ options });
}

export async function PUT(req: NextRequest) {
  const session = await getAuthSession();
  if (!isAdminOrCoach(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { options } = await req.json().catch(() => ({}));
  if (!Array.isArray(options) || !options.every((o) => typeof o === "string")) {
    return NextResponse.json({ error: "Invalid options" }, { status: 400 });
  }

  const cleaned = [...new Set(options.map((o) => o.trim()).filter(Boolean))];
  await prisma.systemSetting.upsert({
    where: { key: KEY },
    update: { value: JSON.stringify(cleaned) },
    create: { key: KEY, value: JSON.stringify(cleaned) },
  });

  return NextResponse.json({ options: cleaned });
}
