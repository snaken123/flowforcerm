import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/control-plane/lib/superadmin-auth";
import { controlPlanePrisma } from "@/control-plane/lib/db";
import { getActiveTenants } from "@/control-plane/lib/tenant-resolution";
import { getPrismaClientForTenant } from "@/lib/db";

// Aggregate acceptance counts only -- never raw IP/user-agent or per-user detail
// (spec section 27). Acceptance rows live per-tenant, so this is the one place in
// this feature that intentionally crosses tenant boundaries, iterating active
// tenants the same way scripts/push-schema-to-tenants.ts already does.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireSuperAdmin().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const docRow = await controlPlanePrisma.legalDocument.findUnique({ where: { id: params.id } });
  if (!docRow) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const doc = docRow;

  const tenants = await getActiveTenants();

  async function queryTenant(tenant: { id: string; subdomain: string }) {
    try {
      const client = await getPrismaClientForTenant(tenant.id);
      const count = await client.legalAgreementAcceptance.count({
        where: { documentType: doc.type as any, documentVersion: doc.version },
      });
      return { subdomain: tenant.subdomain, accepted: count };
    } catch (e) {
      console.error(`[legal-documents/stats] failed to query tenant ${tenant.subdomain}:`, e);
      // Isolated per tenant -- one tenant's failure never fails the whole batch or
      // the request; it just shows up flagged in that tenant's own row.
      return { subdomain: tenant.subdomain, accepted: 0, error: true as const };
    }
  }

  // Batched rather than sequential: was a for-loop opening one tenant connection
  // at a time, which is the one place in this codebase that intentionally crosses
  // the tenant-isolation boundary and is the pattern that scales with tenant count.
  const BATCH_SIZE = 10;
  const perTenant: { subdomain: string; accepted: number; error?: true }[] = [];
  for (let i = 0; i < tenants.length; i += BATCH_SIZE) {
    const batch = tenants.slice(i, i + BATCH_SIZE);
    perTenant.push(...(await Promise.all(batch.map(queryTenant))));
  }

  const accepted = perTenant.reduce((sum, t) => sum + t.accepted, 0);

  return NextResponse.json({ documentId: doc.id, type: doc.type, version: doc.version, totalAccepted: accepted, perTenant });
}
