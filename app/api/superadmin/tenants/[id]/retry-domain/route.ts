import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/control-plane/lib/superadmin-auth";
import { controlPlanePrisma } from "@/control-plane/lib/db";
import { ensureTenantDomain } from "@/control-plane/lib/vercel-api";

// Re-registers a tenant's subdomain on Vercel and waits briefly for it to verify --
// for tenants whose domain setup failed or was never run during provisioning (e.g.
// every tenant created before this automation existed).
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireSuperAdmin().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenant = await controlPlanePrisma.tenant.findUnique({ where: { id: params.id } });
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  try {
    const verified = await ensureTenantDomain(tenant.subdomain);
    return NextResponse.json({ verified });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[retry-domain]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
