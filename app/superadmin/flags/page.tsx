import { redirect } from "next/navigation";
import Link from "next/link";
import { getSuperAdminSession } from "@/control-plane/lib/superadmin-auth";
import { controlPlanePrisma } from "@/control-plane/lib/db";
import { FEATURE_PRICES_CENTAVOS } from "@/control-plane/lib/pricing";
import { NewFlagForm } from "./new-flag-form";
import { FlagMatrix } from "./flag-matrix";

export default async function FeatureFlagsPage() {
  const session = await getSuperAdminSession();
  if (!session) redirect("/superadmin/login");

  const [flags, tenants] = await Promise.all([
    controlPlanePrisma.featureFlag.findMany({ orderBy: { createdAt: "asc" } }),
    controlPlanePrisma.tenant.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        subdomain: true,
        featureFlags: { select: { flagKey: true } },
      },
    }),
  ]);

  const tenantsForMatrix = tenants.map((t) => ({
    id: t.id,
    name: t.name,
    subdomain: t.subdomain,
    activeFlagKeys: t.featureFlags.map((f) => f.flagKey),
  }));

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <Link href="/superadmin" className="text-xs text-[#666] hover:text-white transition-colors">
            ← Tenants
          </Link>
        </div>
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-widest">Feature Flags</h1>
            <p className="text-[#666] text-sm mt-1">Ship features to the codebase, turn them on per gym when ready.</p>
          </div>
          <NewFlagForm />
        </div>

        <FlagMatrix flags={flags} tenants={tenantsForMatrix} pricesCentavos={FEATURE_PRICES_CENTAVOS} />
      </div>
    </div>
  );
}
