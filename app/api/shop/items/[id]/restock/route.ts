import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { z } from "zod";
import { requireFeature, FLAG_SPECIALIZED_ROLES } from "@/lib/feature-flags";

const DEFAULT_SIZES = ["XS", "S", "M", "L", "XL"];

const schema = z.object({
  qty: z.number().int().min(1),
  costPerUnit: z.number().min(0).optional(),
  supplier: z.string().optional(),
  notes: z.string().optional(),
  date: z.string().optional(),
  size: z.string().optional(), // size being restocked (merchandise only)
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const gate = requireFeature(FLAG_SPECIALIZED_ROLES);
  if (gate) return gate;

  const session = await getAuthSession();
  if (!session || !["ADMIN", "STAFF", "STORE"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { qty, size } = parsed.data;

  const item = await prisma.$transaction(async (tx) => {
    // Increment per-size stock if a size was specified
    if (size) {
      await tx.shopItemSizeStock.upsert({
        where: { shopItemId_size: { shopItemId: params.id, size } },
        create: { shopItemId: params.id, size, stock: qty },
        update: { stock: { increment: qty } },
      });

      // Persist custom size to availableSizes if it's not a default
      if (!DEFAULT_SIZES.includes(size)) {
        const existing = await tx.shopItem.findUnique({
          where: { id: params.id },
          select: { availableSizes: true },
        });
        const current: string[] = JSON.parse(existing?.availableSizes ?? "[]");
        if (!current.includes(size)) {
          await tx.shopItem.update({
            where: { id: params.id },
            data: { availableSizes: JSON.stringify([...current, size]) },
          });
        }
      }
    }

    // Always increment the total stock on the item
    return tx.shopItem.update({
      where: { id: params.id },
      data: { stock: { increment: qty } },
      include: { sizeStocks: { orderBy: { size: "asc" } } },
    });
  });

  return NextResponse.json(item);
}
