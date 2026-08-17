import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { z } from "zod";
import { requireFeature, FLAG_SPECIALIZED_ROLES } from "@/lib/feature-flags";

const createSchema = z.object({
  name: z.string().min(1),
  category: z.enum(["DRINKS", "MERCHANDISE"]),
  sellingPrice: z.number().min(0),
  costPrice: z.number().min(0).default(0),
  stock: z.number().int().min(0).default(0),
  photoUrl: z.string().max(200_000, "Photo exceeds maximum size. Please use a smaller image.").optional(),
});

export async function GET(req: NextRequest) {
  const gate = requireFeature(FLAG_SPECIALIZED_ROLES);
  if (gate) return gate;

  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (!["ADMIN", "STAFF", "STORE"].includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const includeInactive = searchParams.get("includeInactive") === "true";

  const items = await prisma.shopItem.findMany({
    where: {
      ...(category ? { category: category as any } : {}),
      ...(!includeInactive ? { isActive: true } : {}),
    },
    include: { sizeStocks: { orderBy: { size: "asc" } } },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const gate = requireFeature(FLAG_SPECIALIZED_ROLES);
  if (gate) return gate;

  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (!["ADMIN", "STAFF", "STORE"].includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const item = await prisma.shopItem.create({ data: parsed.data, include: { sizeStocks: true } });
  return NextResponse.json(item, { status: 201 });
}
