import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { z } from "zod";
import { requireFeature, FLAG_SPECIALIZED_ROLES } from "@/lib/feature-flags";

const saleItemSchema = z.object({
  shopItemId: z.string(),
  quantity: z.number().int().min(1),
  priceAtSale: z.number().min(0),
  selectedSize: z.string().optional(),
});

const createSchema = z.object({
  buyerMemberId: z.string().optional(),
  buyerEmployeeId: z.string().optional(),
  buyerName: z.string().optional(),
  paymentMode: z.string().optional(),
  receiptUrl: z.string().optional(),
  needsReceipt: z.boolean().optional(),
  notes: z.string().optional(),
  items: z.array(saleItemSchema).min(1),
});

export async function GET(req: NextRequest) {
  const gate = requireFeature(FLAG_SPECIALIZED_ROLES);
  if (gate) return gate;

  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (!["ADMIN", "STAFF", "STORE"].includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const category = searchParams.get("category");
  const incomplete = searchParams.get("incomplete") === "true";

  const toDate = to ? new Date(to) : null;
  if (toDate) toDate.setHours(23, 59, 59, 999);

  const sales = await prisma.shopSale.findMany({
    where: {
      ...(incomplete
        ? { OR: [{ paymentMode: null }, { AND: [{ receiptUrl: null }, { needsReceipt: true }] }] }
        : {
            createdAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(toDate ? { lte: toDate } : {}),
            },
          }),
      ...(category
        ? { items: { some: { shopItem: { category: category as any } } } }
        : {}),
    },
    include: {
      items: { include: { shopItem: true } },
      buyerMember: { select: { firstName: true, lastName: true, memberNumber: true } },
      buyerEmployee: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json(sales);
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

  const { items, ...saleData } = parsed.data;
  const total = items.reduce((sum, i) => sum + i.priceAtSale * i.quantity, 0);

  // Pre-flight: verify all items exist (outside transaction — fast check)
  const itemIds = items.map((i) => i.shopItemId);
  const shopItems = await prisma.shopItem.findMany({ where: { id: { in: itemIds }, isActive: true } });
  const shopItemMap = Object.fromEntries(shopItems.map((si) => [si.id, si]));
  for (const item of items) {
    if (!shopItemMap[item.shopItemId]) {
      return NextResponse.json({ error: `Item not found: ${item.shopItemId}` }, { status: 404 });
    }
    // HIGH-4: Reject price override without a special price justification in notes
    const listed = shopItemMap[item.shopItemId].sellingPrice;
    if (Math.abs(item.priceAtSale - listed) > 0.001 && !parsed.data.notes?.trim()) {
      return NextResponse.json({
        error: `Price override for "${shopItemMap[item.shopItemId].name}" requires a special price note.`,
      }, { status: 400 });
    }
  }

  // Create sale + deduct stock atomically (race-condition-safe)
  const sale = await prisma.$transaction(async (tx) => {
    const created = await tx.shopSale.create({
      data: {
        ...saleData,
        needsReceipt: parsed.data.needsReceipt ?? true,
        staffId: userId,
        staffName: userName,
        total,
        items: {
          create: items.map((i) => ({
            shopItemId: i.shopItemId,
            quantity: i.quantity,
            priceAtSale: i.priceAtSale,
            selectedSize: i.selectedSize ?? null,
          })),
        },
      },
      include: {
        items: { include: { shopItem: true } },
        buyerMember: { select: { firstName: true, lastName: true, memberNumber: true } },
        buyerEmployee: { select: { firstName: true, lastName: true } },
      },
    });

    // Deduct stock atomically with WHERE stock >= qty to prevent negative stock
    for (const item of items) {
      const result = await tx.shopItem.updateMany({
        where: { id: item.shopItemId, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });
      if (result.count === 0) {
        const si = shopItemMap[item.shopItemId];
        throw new Error(`INSUFFICIENT_STOCK:${si?.name ?? item.shopItemId}`);
      }

      // Validate and deduct per-size stock if a size was selected
      if (item.selectedSize) {
        const sizeRow = await tx.shopItemSizeStock.findUnique({
          where: { shopItemId_size: { shopItemId: item.shopItemId, size: item.selectedSize } },
        });
        if (!sizeRow || sizeRow.stock < item.quantity) {
          const si = shopItemMap[item.shopItemId];
          throw new Error(`INSUFFICIENT_SIZE_STOCK:${si?.name ?? item.shopItemId}:${item.selectedSize}`);
        }
        await tx.shopItemSizeStock.update({
          where: { shopItemId_size: { shopItemId: item.shopItemId, size: item.selectedSize } },
          data: { stock: { decrement: item.quantity } },
        });
      }

      await tx.shopInventoryLog.create({
        data: {
          shopItemId: item.shopItemId,
          type: "ADJUSTMENT",
          quantity: -item.quantity,
          reason: `Sale #${created.id.slice(-6)}`,
          staffId: userId,
          staffName: userName,
        },
      });
    }

    return created;
  }).catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.startsWith("INSUFFICIENT_STOCK:")) {
      const name = msg.replace("INSUFFICIENT_STOCK:", "");
      return { _insufficientStock: name };
    }
    if (msg.startsWith("INSUFFICIENT_SIZE_STOCK:")) {
      const [, name, size] = msg.split(":");
      return { _insufficientSizeStock: name, _size: size };
    }
    throw err;
  });

  if ("_insufficientStock" in (sale as object)) {
    return NextResponse.json(
      { error: `Insufficient stock for "${(sale as any)._insufficientStock}".` },
      { status: 409 }
    );
  }
  if ("_insufficientSizeStock" in (sale as object)) {
    return NextResponse.json(
      { error: `No stock available for "${(sale as any)._insufficientSizeStock}" in size ${(sale as any)._size}.` },
      { status: 409 }
    );
  }

  return NextResponse.json(sale, { status: 201 });
}
