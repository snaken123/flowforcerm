import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdmin } from "@/control-plane/lib/superadmin-auth";
import { controlPlanePrisma } from "@/control-plane/lib/db";
import { logSuperAdminAudit } from "@/control-plane/lib/superadmin-audit";

const createSchema = z.object({
  detectedAt: z.string(),
  occurredAt: z.string().optional(),
  affectedSystems: z.string().min(1),
  dataCategories: z.string().min(1),
  affectedRecordsEstimate: z.number().int().nonnegative().optional(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  affectedTenantIds: z.array(z.string()).default([]),
});

// Superadmin-only, on both read and write -- never exposed to gym users, per spec.
export async function GET() {
  const session = await requireSuperAdmin().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const incidents = await controlPlanePrisma.securityIncident.findMany({
    include: { affectedTenants: { include: { tenant: { select: { id: true, name: true, subdomain: true } } } } },
    orderBy: { detectedAt: "desc" },
  });

  return NextResponse.json({ incidents });
}

export async function POST(req: Request) {
  const session = await requireSuperAdmin().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

  const incident = await controlPlanePrisma.securityIncident.create({
    data: {
      detectedAt: new Date(parsed.data.detectedAt),
      occurredAt: parsed.data.occurredAt ? new Date(parsed.data.occurredAt) : undefined,
      affectedSystems: parsed.data.affectedSystems,
      dataCategories: parsed.data.dataCategories,
      affectedRecordsEstimate: parsed.data.affectedRecordsEstimate,
      severity: parsed.data.severity,
      responsibleSuperAdminId: (session.user as { id: string }).id,
      affectedTenants: {
        create: parsed.data.affectedTenantIds.map((tenantId) => ({ tenantId })),
      },
    },
  });

  await logSuperAdminAudit({
    superAdminId: (session.user as { id: string }).id,
    action: "SECURITY_INCIDENT_CREATED",
    entityType: "SecurityIncident",
    entityId: incident.id,
    description: `Recorded a ${parsed.data.severity} security incident.`,
    metadata: { severity: parsed.data.severity, affectedTenantIds: parsed.data.affectedTenantIds },
  });

  return NextResponse.json({ incident }, { status: 201 });
}
