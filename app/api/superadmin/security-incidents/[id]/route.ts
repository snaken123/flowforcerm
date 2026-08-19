import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdmin } from "@/control-plane/lib/superadmin-auth";
import { controlPlanePrisma } from "@/control-plane/lib/db";
import { logSuperAdminAudit } from "@/control-plane/lib/superadmin-audit";

const editSchema = z.object({
  status: z.enum(["OPEN", "CONTAINED", "INVESTIGATING", "RESOLVED"]).optional(),
  remediation: z.string().optional(),
  notificationStatus: z.string().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await requireSuperAdmin().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await controlPlanePrisma.securityIncident.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = editSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

  const updated = await controlPlanePrisma.securityIncident.update({
    where: { id: params.id },
    data: {
      ...parsed.data,
      resolvedAt: parsed.data.status === "RESOLVED" ? new Date() : undefined,
    },
  });

  await logSuperAdminAudit({
    superAdminId: (session.user as { id: string }).id,
    action: "SECURITY_INCIDENT_UPDATED",
    entityType: "SecurityIncident",
    entityId: updated.id,
    description: `Updated security incident status${parsed.data.status ? ` to ${parsed.data.status}` : ""}.`,
    metadata: parsed.data,
  });

  return NextResponse.json({ incident: updated });
}
