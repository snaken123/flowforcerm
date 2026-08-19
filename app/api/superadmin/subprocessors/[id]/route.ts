import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdmin } from "@/control-plane/lib/superadmin-auth";
import { controlPlanePrisma } from "@/control-plane/lib/db";
import { logSuperAdminAudit } from "@/control-plane/lib/superadmin-audit";

const editSchema = z.object({
  name: z.string().min(1).optional(),
  service: z.string().min(1).optional(),
  purpose: z.string().min(1).optional(),
  dataCategories: z.string().min(1).optional(),
  location: z.string().nullable().optional(),
  effectiveDate: z.string().nullable().optional(),
  referenceUrl: z.string().nullable().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await requireSuperAdmin().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await controlPlanePrisma.subprocessor.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = editSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

  const updated = await controlPlanePrisma.subprocessor.update({
    where: { id: params.id },
    data: {
      ...parsed.data,
      effectiveDate: parsed.data.effectiveDate ? new Date(parsed.data.effectiveDate) : parsed.data.effectiveDate,
    },
  });

  await logSuperAdminAudit({
    superAdminId: (session.user as { id: string }).id,
    action: "SUBPROCESSOR_UPDATED",
    entityType: "Subprocessor",
    entityId: updated.id,
    description: `Updated subprocessor ${updated.name}`,
    metadata: { changes: parsed.data },
  });

  return NextResponse.json({ subprocessor: updated });
}
