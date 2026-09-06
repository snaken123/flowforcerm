import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdmin } from "@/control-plane/lib/superadmin-auth";
import { controlPlanePrisma } from "@/control-plane/lib/db";
import { deleteTenantNeonProject } from "@/control-plane/lib/neon-api";
import { removeTenantDomain } from "@/control-plane/lib/vercel-api";
import { logSuperAdminAudit } from "@/control-plane/lib/superadmin-audit";

const deleteSchema = z.object({ confirmSubdomain: z.string() });

// Permanently deletes a gym: every control-plane record for it, then its isolated Neon
// database and Vercel subdomain (best-effort -- the tenant record is already gone by
// then, so a failure here is logged but doesn't block). Irreversible -- there is no
// backup/restore path in this system. Requires the caller to echo back the tenant's own
// subdomain as a deliberate type-to-confirm step, checked again here server-side rather
// than trusted from the client's disabled-button state alone.
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await requireSuperAdmin().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = deleteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const tenant = await controlPlanePrisma.tenant.findUnique({ where: { id: params.id } });
  if (!tenant) return NextResponse.json({ error: "Gym not found" }, { status: 404 });

  if (parsed.data.confirmSubdomain !== tenant.subdomain) {
    return NextResponse.json({ error: "Confirmation text didn't match the gym's subdomain." }, { status: 400 });
  }

  // FK order matters here -- every one of these is RESTRICT, not CASCADE (verified
  // directly against the live schema, not assumed): CommissionEntry and Invoice must go
  // before Subscription, everything else before Tenant itself.
  await controlPlanePrisma.$transaction(async (tx) => {
    await tx.commissionEntry.deleteMany({ where: { tenantId: tenant.id } });
    await tx.invoice.deleteMany({ where: { subscription: { tenantId: tenant.id } } });
    await tx.subscription.deleteMany({ where: { tenantId: tenant.id } });
    await tx.tenantFeatureFlag.deleteMany({ where: { tenantId: tenant.id } });
    await tx.provisioningLog.deleteMany({ where: { tenantId: tenant.id } });
    await tx.securityIncidentTenant.deleteMany({ where: { tenantId: tenant.id } });
    // referredByTenantId on any tenant this one referred is ON DELETE SET NULL --
    // no manual cleanup needed for that.
    await tx.tenant.delete({ where: { id: tenant.id } });
  });

  const infraErrors: string[] = [];
  if (tenant.neonProjectId) {
    try {
      await deleteTenantNeonProject(tenant.neonProjectId);
    } catch (e) {
      console.error("[delete-tenant] Neon project cleanup failed:", e);
      infraErrors.push("Neon database project");
    }
  }
  try {
    await removeTenantDomain(tenant.subdomain);
  } catch (e) {
    console.error("[delete-tenant] Vercel domain cleanup failed:", e);
    infraErrors.push("Vercel domain");
  }

  await logSuperAdminAudit({
    superAdminId: (session.user as { id: string }).id,
    action: "DELETE_TENANT",
    entityType: "Tenant",
    entityId: tenant.id,
    description: `Deleted gym "${tenant.name}" (${tenant.subdomain})`,
    metadata: { subdomain: tenant.subdomain, neonProjectId: tenant.neonProjectId, infraCleanupFailed: infraErrors },
  });

  return NextResponse.json({ success: true, infraCleanupFailed: infraErrors });
}
