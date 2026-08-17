import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { TRAINING_PLAN_CATEGORIES, CATEGORY_KEYS, canEditTrainingPlan } from "@/lib/training-plan";
import { requireFeature, FLAG_SPECIALIZED_ROLES } from "@/lib/feature-flags";

const KEY = "training_plan_category_labels";

export async function GET() {
  const gate = requireFeature(FLAG_SPECIALIZED_ROLES);
  if (gate) return gate;

  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const row = await prisma.systemSetting.findUnique({ where: { key: KEY } });
  const overrides: Record<string, string> = row ? JSON.parse(row.value) : {};

  const canReadCoachNotes = (session.user as any).role !== "MEMBER";

  const categories = TRAINING_PLAN_CATEGORIES.filter((c) => canReadCoachNotes || !c.excludedForMembers).map((c) => ({
    key: c.key,
    label: overrides[c.key] ?? c.defaultLabel,
    color: c.color,
    sortOrder: c.sortOrder,
  }));

  return NextResponse.json({ categories });
}

export async function PUT(req: NextRequest) {
  const gate = requireFeature(FLAG_SPECIALIZED_ROLES);
  if (gate) return gate;

  const session = await getAuthSession();
  if (!canEditTrainingPlan(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { labels } = await req.json().catch(() => ({}));
  if (typeof labels !== "object" || labels === null) {
    return NextResponse.json({ error: "Invalid labels" }, { status: 400 });
  }
  for (const [key, label] of Object.entries(labels)) {
    if (!CATEGORY_KEYS.includes(key as any)) {
      return NextResponse.json({ error: `Unknown category key: ${key}` }, { status: 400 });
    }
    if (typeof label !== "string" || !label.trim() || label.length > 40) {
      return NextResponse.json({ error: `Invalid label for ${key}` }, { status: 400 });
    }
  }

  await prisma.systemSetting.upsert({
    where: { key: KEY },
    update: { value: JSON.stringify(labels) },
    create: { key: KEY, value: JSON.stringify(labels) },
  });

  return NextResponse.json({ labels });
}
