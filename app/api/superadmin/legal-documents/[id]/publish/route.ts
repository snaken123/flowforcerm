import { NextResponse } from "next/server";
import crypto from "crypto";
import { requireSuperAdmin } from "@/control-plane/lib/superadmin-auth";
import { controlPlanePrisma } from "@/control-plane/lib/db";
import { logSuperAdminAudit } from "@/control-plane/lib/superadmin-audit";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireSuperAdmin().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const doc = await controlPlanePrisma.legalDocument.findUnique({ where: { id: params.id } });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (doc.status !== "DRAFT") {
    return NextResponse.json({ error: "Only DRAFT documents can be published." }, { status: 409 });
  }

  const contentHash = crypto.createHash("sha256").update(doc.content, "utf8").digest("hex");
  const now = new Date();

  // "At most one PUBLISHED row per type" -- supersede the currently-published row
  // of the same type (if any) and publish this one together, atomically.
  const published = await controlPlanePrisma.$transaction(async (tx) => {
    await tx.legalDocument.updateMany({
      where: { type: doc.type, status: "PUBLISHED" },
      data: { status: "SUPERSEDED", supersededAt: now },
    });
    return tx.legalDocument.update({
      where: { id: params.id },
      data: { status: "PUBLISHED", contentHash, publishedAt: now, effectiveDate: doc.effectiveDate ?? now },
    });
  });

  await logSuperAdminAudit({
    superAdminId: (session.user as { id: string }).id,
    action: "LEGAL_DOCUMENT_PUBLISHED",
    entityType: "LegalDocument",
    entityId: published.id,
    description: `Published ${published.title} v${published.version} (${published.type})`,
    metadata: { type: published.type, version: published.version, contentHash },
  });

  return NextResponse.json({ document: published });
}
