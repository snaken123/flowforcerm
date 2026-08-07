import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdmin } from "@/control-plane/lib/superadmin-auth";
import { controlPlanePrisma } from "@/control-plane/lib/db";

const createFlagSchema = z.object({
  key: z.string().regex(/^[a-z][a-z0-9_]{1,63}$/, "Lowercase snake_case, starting with a letter"),
  description: z.string().max(280).optional(),
});

export async function GET() {
  const session = await requireSuperAdmin().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const flags = await controlPlanePrisma.featureFlag.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json({ flags });
}

export async function POST(req: Request) {
  const session = await requireSuperAdmin().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createFlagSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await controlPlanePrisma.featureFlag.findUnique({ where: { key: parsed.data.key } });
  if (existing) return NextResponse.json({ error: `Flag "${parsed.data.key}" already exists.` }, { status: 409 });

  const flag = await controlPlanePrisma.featureFlag.create({ data: parsed.data });
  return NextResponse.json({ flag });
}
