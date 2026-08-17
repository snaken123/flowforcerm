import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { z } from "zod";
import { requireFeature, FLAG_SPECIALIZED_ROLES } from "@/lib/feature-flags";

const createSchema = z.object({
  shopItemId: z.string(),
  type: z.enum(["COUNT", "ADJUSTMENT"]),
  quantity: z.number().int(),
  reason: z.string().optional(),
  size: z.string().optional(), // size being adjusted (merchandise only)
});

export async function GET(req: NextRequest) {
  const gate = requireFeature(FLAG_SPECIALIZED_ROLES);
  if (gate) return gate;

  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (!["ADMIN", "STAFF", "STORE"].includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const shopItemId = searchParams.get("shopItemId");

  const logs = await prisma.shopInventoryLog.findMany({
    where: shopItemId ? { shopItemId } : {},
    include: { shopItem: { select: { name: true, category: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json(logs);
}

export async function POST(req: NextRequest) {
  const gate = requireFeature(FLAG_SPECIALIZED_ROLES);
  if (gate) return gate;

  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (!["ADMIN", "STAFF", "STORE"].includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const userId = (session.user as any).id;
  const userName = (session.user as any).name ?? (session.user as any).email ?? "Staff";

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { shopItemId, type, quantity, reason, size } = parsed.data;

  const log = await prisma.$transaction(async (tx) => {
    const entry = await tx.shopInventoryLog.create({
      data: { shopItemId, type, quantity, reason, staffId: userId, staffName: userName },
      include: { shopItem: { select: { name: true, category: true } } },
    });

    if (size) {
      // Per-size adjustment
      if (type === "COUNT") {
        // Set this size to exact count, then recalculate the item total
        await tx.shopItemSizeStock.upsert({
          where: { shopItemId_size: { shopItemId, size } },
          create: { shopItemId, size, stock: quantity },
          update: { stock: quantity },
        });
        // Recalculate total from all size stocks
        const allSizes = await tx.shopItemSizeStock.findMany({ where: { shopItemId } });
        const newTotal = allSizes.reduce((s, r) => s + r.stock, 0);
        await tx.shopItem.update({ where: { id: shopItemId }, data: { stock: newTotal } });
      } else {
        // ADJUSTMENT: increment/decrement this size and the total
        await tx.shopItemSizeStock.upsert({
          where: { shopItemId_size: { shopItemId, size } },
          create: { shopItemId, size, stock: Math.max(0, quantity) },
          update: { stock: { increment: quantity } },
        });
        await tx.shopItem.update({ where: { id: shopItemId }, data: { stock: { increment: quantity } } });
      }
    } else {
      // No size — adjust total stock directly (legacy / drink items)
      if (type === "COUNT") {
        await tx.shopItem.update({ where: { id: shopItemId }, data: { stock: quantity } });
      } else {
        await tx.shopItem.update({ where: { id: shopItemId }, data: { stock: { increment: quantity } } });
      }
    }

    return entry;
  });

  return NextResponse.json(log, { status: 201 });
}
