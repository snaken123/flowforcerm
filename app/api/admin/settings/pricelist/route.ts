import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";

const KEY_PACKAGES = "pricelist_packages";
const KEY_ORDER = "pricelist_order";

export async function GET() {
  const [pkgs, order] = await Promise.all([
    prisma.systemSetting.findUnique({ where: { key: KEY_PACKAGES } }),
    prisma.systemSetting.findUnique({ where: { key: KEY_ORDER } }),
  ]);
  return NextResponse.json({
    packages: pkgs?.value ?? null,
    order: order?.value ?? null,
  });
}

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  const ops: Promise<any>[] = [];
  if ("packages" in body && body.packages !== undefined) {
    ops.push(
      prisma.systemSetting.upsert({
        where: { key: KEY_PACKAGES },
        update: { value: body.packages },
        create: { key: KEY_PACKAGES, value: body.packages },
      })
    );
  }
  if ("order" in body && body.order !== undefined) {
    ops.push(
      prisma.systemSetting.upsert({
        where: { key: KEY_ORDER },
        update: { value: body.order },
        create: { key: KEY_ORDER, value: body.order },
      })
    );
  }

  await Promise.all(ops);
  return NextResponse.json({ success: true });
}
