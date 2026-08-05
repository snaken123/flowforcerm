import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  sessions: z.number().int().positive().nullable().optional(),
  validDays: z.number().int().positive().optional(),
  memberPrice: z.number().min(0).nullable().optional(),
  nonMemberPrice: z.number().min(0).nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string; pkgId: string } }) {
  const session = await getAuthSession();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const pkg = await prisma.servicePackage.update({
    where: { id: params.pkgId },
    data: parsed.data,
  });

  // Re-sort siblings if price changed
  if (parsed.data.memberPrice !== undefined || parsed.data.nonMemberPrice !== undefined) {
    const pkgs = await prisma.servicePackage.findMany({
      where: { serviceId: params.id, isActive: true },
      orderBy: [{ memberPrice: "asc" }, { nonMemberPrice: "asc" }],
    });
    for (let i = 0; i < pkgs.length; i++) {
      await prisma.servicePackage.update({ where: { id: pkgs[i].id }, data: { sortOrder: i } });
    }
  }

  return NextResponse.json(pkg);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; pkgId: string } }) {
  const session = await getAuthSession();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.servicePackage.delete({ where: { id: params.pkgId } });
  return NextResponse.json({ success: true });
}
