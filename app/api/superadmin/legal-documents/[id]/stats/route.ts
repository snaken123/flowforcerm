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

  const doc = await controlPlanePrisma.legalDocument.findUnique({ where: { id: params.id } });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const tenants = await getActiveTenants();
  let accepted = 0;
  const perTenant: { subdomain: string; accepted: number; error?: true }[] = [];

  for (const tenant of tenants) {
    try {
      const client = await getPrismaClientForTenant(tenant.id);
      const count = await client.legalAgreementAcceptance.count({
        where: { documentType: doc.type as any, documentVersion: doc.version },
      });
      accepted += count;
      perTenant.push({ subdomain: tenant.subdomain, accepted: count });
    } catch (e) {
      console.error(`[legal-documents/stats] failed to query tenant ${tenant.subdomain}:`, e);
      perTenant.push({ subdomain: tenant.subdomain, accepted: 0, error: true });
    }
  }

  return NextResponse.json({ documentId: doc.id, type: doc.type, version: doc.version, totalAccepted: accepted, perTenant });
}
