import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { CATEGORY_KEYS, MAX_ROWS, canEditTrainingPlan, isGridEmpty, normalizeGrid } from "@/lib/training-plan";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const cellSchema = z.object({
  text: z.string().max(2000),
  bold: z.boolean(),
  italic: z.boolean(),
});

const bodySchema = z.object({
  date: z.string().regex(DATE_RE),
  categoryKey: z.enum(CATEGORY_KEYS as [string, ...string[]]),
  // Row width isn't enforced here -- normalizeGrid() pads/truncates to FIXED_COLS below.
  // Keeps saves from breaking if FIXED_COLS ever changes again while older cards still
  // have rows saved at a previous width.
  rows: z.array(z.array(cellSchema).min(1)).min(3).max(MAX_ROWS),
  notes: z.string().max(5000).optional().default(""),
});

export async function GET(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  if (!start || !end || !DATE_RE.test(start) || !DATE_RE.test(end)) {
    return NextResponse.json({ error: "start and end (YYYY-MM-DD) are required" }, { status: 400 });
  }

  // Coach's Note is excluded from the query entirely for members -- never fetched, not
  // just hidden client-side.
  const canReadCoachNotes = (session.user as any).role !== "MEMBER";

  const cards = await prisma.trainingPlanCard.findMany({
    where: {
      date: { gte: start, lte: end },
      ...(canReadCoachNotes ? {} : { categoryKey: { not: "coach_note" } }),
    },
  });

  return NextResponse.json({ cards });
}

export async function PUT(req: NextRequest) {
  const session = await getAuthSession();
  if (!canEditTrainingPlan(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }
  const { date, categoryKey, notes } = parsed.data;
  const rows = normalizeGrid(parsed.data.rows as any);

  // Revert to the implicit default (no row) instead of persisting an all-empty grid --
  // keeps the table from accumulating rows for cards someone opened but never filled in.
  if (isGridEmpty(rows) && !notes.trim()) {
    await prisma.trainingPlanCard.deleteMany({ where: { date, categoryKey } });
    return NextResponse.json({ card: null });
  }

  const card = await prisma.trainingPlanCard.upsert({
    where: { date_categoryKey: { date, categoryKey } },
    update: { rows, notes },
    create: { date, categoryKey, rows, notes },
  });

  return NextResponse.json({ card });
}
