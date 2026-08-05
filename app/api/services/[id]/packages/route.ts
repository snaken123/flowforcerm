import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { z } from "zod";

const packageSchema = z.object({
  name: z.string().min(1),
  sessions: z.number().int().positive().nullable(),
  validDays: z.number().int().positive(),
  memberPrice: z.number().min(0).nullable().default(null),
  nonMemberPrice: z.number().min(0).nullable().default(null),
  sortOrder: z.number().int().default(0),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const packages = await prisma.servicePackage.findMany({
    where: { serviceId: params.id, isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(packages);
}

async function resortPackages(serviceId: string) {
  const pkgs = await prisma.servicePackage.findMany({
    where: { serviceId, isActive: true },
    orderBy: [{ memberPrice: "asc" }, { nonMemberPrice: "asc" }],
  });
  for (let i = 0; i < pkgs.length; i++) {
    await prisma.servicePackage.update({ where: { id: pkgs[i].id }, data: { sortOrder: i } });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAuthSession();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = packageSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const pkg = await prisma.servicePackage.create({
    data: { ...parsed.data, serviceId: params.id },
  });
  await resortPackages(params.id);
  return NextResponse.json(pkg, { status: 201 });
}
