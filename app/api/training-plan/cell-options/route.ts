import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { canEditTrainingPlan } from "@/lib/training-plan";
import { requireFeature, FLAG_SPECIALIZED_ROLES } from "@/lib/feature-flags";

const KEY = "training_plan_cell_options";

export async function GET() {
  const gate = requireFeature(FLAG_SPECIALIZED_ROLES);
  if (gate) return gate;

  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const row = await prisma.systemSetting.findUnique({ where: { key: KEY } });
  const options: string[] = row ? JSON.parse(row.value) : [];
  return NextResponse.json({ options });
}

export async function PUT(req: NextRequest) {
  const gate = requireFeature(FLAG_SPECIALIZED_ROLES);
  if (gate) return gate;

  const session = await getAuthSession();
  if (!canEditTrainingPlan(session)) {
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
