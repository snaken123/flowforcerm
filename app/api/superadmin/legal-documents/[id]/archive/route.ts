import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/control-plane/lib/superadmin-auth";
import { controlPlanePrisma } from "@/control-plane/lib/db";
import { logSuperAdminAudit } from "@/control-plane/lib/superadmin-audit";

// Archiving a currently-PUBLISHED document isn't allowed here -- that would
// silently stop requiring acceptance for that type. Publish a superseding
// version first if a document type is being retired.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireSuperAdmin().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const doc = await controlPlanePrisma.legalDocument.findUnique({ where: { id: params.id } });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (doc.status !== "DRAFT" && doc.status !== "SUPERSEDED") {
    return NextResponse.json({ error: "Only DRAFT or SUPERSEDED documents can be archived." }, { status: 409 });
  }

  const archived = await controlPlanePrisma.legalDocument.update({
    where: { id: params.id },
    data: { status: "ARCHIVED" },
  });

  await logSuperAdminAudit({
    superAdminId: (session.user as { id: string }).id,
    action: "LEGAL_DOCUMENT_ARCHIVED",
    entityType: "LegalDocument",
    entityId: archived.id,
    description: `Archived ${archived.title} v${archived.version} (${archived.type})`,
    metadata: { type: archived.type, version: archived.version },
  });

  return NextResponse.json({ document: archived });
}
