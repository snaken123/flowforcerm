import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdmin } from "@/control-plane/lib/superadmin-auth";
import { controlPlanePrisma } from "@/control-plane/lib/db";
import { logSuperAdminAudit } from "@/control-plane/lib/superadmin-audit";

const editSchema = z.object({
  title: z.string().min(1).optional(),
  version: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  summaryOfChanges: z.string().optional(),
  effectiveDate: z.string().optional(),
});

// Published documents are preferably immutable (spec section 26) -- corrections
// create a new version instead of silently altering a historical document.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await requireSuperAdmin().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const doc = await controlPlanePrisma.legalDocument.findUnique({ where: { id: params.id } });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (doc.status !== "DRAFT") {
    return NextResponse.json({ error: "Only DRAFT documents can be edited. Create a new version instead." }, { status: 409 });
  }

  const parsed = editSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

  const updated = await controlPlanePrisma.legalDocument.update({
    where: { id: params.id },
    data: {
      ...parsed.data,
      effectiveDate: parsed.data.effectiveDate ? new Date(parsed.data.effectiveDate) : undefined,
    },
  });

  return NextResponse.json({ document: updated });
}
