import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdmin } from "@/control-plane/lib/superadmin-auth";
import { controlPlanePrisma } from "@/control-plane/lib/db";
import { logSuperAdminAudit } from "@/control-plane/lib/superadmin-audit";

const createSchema = z.object({
  type: z.enum(["TERMS_OF_SERVICE", "PRIVACY_POLICY", "DATA_PROCESSING_AGREEMENT", "ACCEPTABLE_USE_POLICY"]),
  title: z.string().min(1),
  version: z.string().min(1),
  content: z.string().min(1),
  summaryOfChanges: z.string().optional(),
  effectiveDate: z.string().optional(),
});

export async function GET() {
  const session = await requireSuperAdmin().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const documents = await controlPlanePrisma.legalDocument.findMany({
    orderBy: [{ type: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ documents });
}

export async function POST(req: Request) {
  const session = await requireSuperAdmin().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

  const existing = await controlPlanePrisma.legalDocument.findUnique({
    where: { type_version: { type: parsed.data.type, version: parsed.data.version } },
  });
  if (existing) return NextResponse.json({ error: `${parsed.data.type} v${parsed.data.version} already exists.` }, { status: 409 });

  const doc = await controlPlanePrisma.legalDocument.create({
    data: {
      ...parsed.data,
      effectiveDate: parsed.data.effectiveDate ? new Date(parsed.data.effectiveDate) : undefined,
      createdBySuperAdminId: (session.user as { id: string }).id,
    },
  });

  await logSuperAdminAudit({
    superAdminId: (session.user as { id: string }).id,
    action: "LEGAL_DOCUMENT_CREATED",
    entityType: "LegalDocument",
    entityId: doc.id,
    description: `Created draft ${doc.title} v${doc.version} (${doc.type})`,
    metadata: { type: doc.type, version: doc.version },
  });

  return NextResponse.json({ document: doc }, { status: 201 });
}
