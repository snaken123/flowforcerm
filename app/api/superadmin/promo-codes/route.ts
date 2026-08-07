import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdmin } from "@/control-plane/lib/superadmin-auth";
import { controlPlanePrisma } from "@/control-plane/lib/db";

const createPromoSchema = z.object({
  code: z.string().min(2).max(32).regex(/^[A-Z0-9_-]+$/, "Uppercase letters, numbers, hyphens, underscores only"),
  type: z.enum(["PERCENT", "FIXED"]),
  value: z.number().int().positive(),
  maxRedemptions: z.number().int().positive().optional(),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
}).refine((d) => d.type !== "PERCENT" || d.value <= 100, {
  message: "Percent value must be 100 or less",
  path: ["value"],
});

export async function GET() {
  const session = await requireSuperAdmin().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const promoCodes = await controlPlanePrisma.promoCode.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { subscriptions: true } } },
  });
  return NextResponse.json({ promoCodes });
}

export async function POST(req: Request) {
  const session = await requireSuperAdmin().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createPromoSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await controlPlanePrisma.promoCode.findUnique({ where: { code: parsed.data.code } });
  if (existing) return NextResponse.json({ error: `Code "${parsed.data.code}" already exists.` }, { status: 409 });

  const promoCode = await controlPlanePrisma.promoCode.create({
    data: {
      code: parsed.data.code,
      type: parsed.data.type,
      value: parsed.data.value,
      maxRedemptions: parsed.data.maxRedemptions,
      validFrom: parsed.data.validFrom ? new Date(parsed.data.validFrom) : undefined,
      validUntil: parsed.data.validUntil ? new Date(parsed.data.validUntil) : undefined,
    },
  });
  return NextResponse.json({ promoCode });
}
