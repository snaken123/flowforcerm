import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { z } from "zod";
import { slugify } from "@/lib/utils";

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().min(1),
  color: z.string().default("#3B82F6"),
  monthlyPrice: z.number().min(0).optional(),
  dropInPrice: z.number().min(0).optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const withPackages = searchParams.get("withPackages") === "true";

  const services = await prisma.service.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { subscriptions: true } },
      ...(withPackages ? { packages: { where: { isActive: true }, orderBy: { sortOrder: "asc" } } } : {}),
    },
  });
  return NextResponse.json(services);
}

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const slug = slugify(parsed.data.name);
  const service = await prisma.service.create({
    data: { ...parsed.data, slug },
  });
  return NextResponse.json(service, { status: 201 });
}
