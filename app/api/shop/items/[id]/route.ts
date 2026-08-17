import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { z } from "zod";
import { requireFeature, FLAG_SPECIALIZED_ROLES } from "@/lib/feature-flags";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.enum(["DRINKS", "MERCHANDISE"]).optional(),
  sellingPrice: z.number().min(0).optional(),
  costPrice: z.number().min(0).optional(),
  stock: z.number().int().min(0).optional(),
  photoUrl: z.string().max(200_000, "Photo exceeds maximum size. Please use a smaller image.").nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const gate = requireFeature(FLAG_SPECIALIZED_ROLES);
  if (gate) return gate;

  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (!["ADMIN", "STAFF", "STORE"].includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const item = await prisma.shopItem.update({
    where: { id: params.id },
    data: parsed.data,
    include: { sizeStocks: true },
  });

  return NextResponse.json(item);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const gate = requireFeature(FLAG_SPECIALIZED_ROLES);
  if (gate) return gate;

  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (!["ADMIN", "STAFF", "STORE"].includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Soft delete — keeps sale history intact
  await prisma.shopItem.update({
    where: { id: params.id },
    data: { isActive: false },
  });

  return NextResponse.json({ ok: true });
}
