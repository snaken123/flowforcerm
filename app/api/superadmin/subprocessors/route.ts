import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdmin } from "@/control-plane/lib/superadmin-auth";
import { controlPlanePrisma } from "@/control-plane/lib/db";
import { logSuperAdminAudit } from "@/control-plane/lib/superadmin-audit";

const createSchema = z.object({
  name: z.string().min(1),
  service: z.string().min(1),
  purpose: z.string().min(1),
  dataCategories: z.string().min(1),
  location: z.string().optional(),
  effectiveDate: z.string().optional(),
  referenceUrl: z.string().optional(),
});

export async function GET() {
  const session = await requireSuperAdmin().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const subprocessors = await controlPlanePrisma.subprocessor.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ subprocessors });
}

export async function POST(req: Request) {
  const session = await requireSuperAdmin().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

  const subprocessor = await controlPlanePrisma.subprocessor.create({
    data: {
      ...parsed.data,
      effectiveDate: parsed.data.effectiveDate ? new Date(parsed.data.effectiveDate) : undefined,
    },
  });

  await logSuperAdminAudit({
    superAdminId: (session.user as { id: string }).id,
    action: "SUBPROCESSOR_CREATED",
    entityType: "Subprocessor",
    entityId: subprocessor.id,
    description: `Added subprocessor ${subprocessor.name} (${subprocessor.service})`,
  });

  return NextResponse.json({ subprocessor }, { status: 201 });
}
