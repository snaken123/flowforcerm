import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdmin } from "@/control-plane/lib/superadmin-auth";
import { controlPlanePrisma } from "@/control-plane/lib/db";
import { findTenantById } from "@/control-plane/lib/tenant-resolution";
import { overwriteTenantCache } from "@/control-plane/lib/tenant-cache";

const toggleSchema = z.object({
  flagKey: z.string().min(1),
  enabled: z.boolean(),
});

// Toggles a single feature flag for a single tenant. A row's presence in
// TenantFeatureFlag means the flag is on -- enabling creates the row, disabling deletes
// it. After the write, immediately overwrites the tenant's Redis cache entry (not just
// invalidates it) so the change takes effect on the tenant's next request rather than
// waiting out the cache TTL.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await requireSuperAdmin().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = toggleSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const tenant = await controlPlanePrisma.tenant.findUnique({ where: { id: params.id } });
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const flag = await controlPlanePrisma.featureFlag.findUnique({ where: { key: parsed.data.flagKey } });
  if (!flag) return NextResponse.json({ error: `Unknown flag "${parsed.data.flagKey}"` }, { status: 404 });

  if (parsed.data.enabled) {
    await controlPlanePrisma.tenantFeatureFlag.upsert({
      where: { tenantId_flagKey: { tenantId: tenant.id, flagKey: flag.key } },
      update: {},
      create: { tenantId: tenant.id, flagKey: flag.key },
    });
  } else {
    await controlPlanePrisma.tenantFeatureFlag.deleteMany({
      where: { tenantId: tenant.id, flagKey: flag.key },
    });
  }

  const resolved = await findTenantById(tenant.id);
  if (resolved) {
    await overwriteTenantCache(resolved.subdomain, resolved).catch((err) =>
      console.error("[flags] failed to overwrite tenant cache", err)
    );
  }

  return NextResponse.json({ activeFlags: resolved?.activeFlags ?? [] });
}
