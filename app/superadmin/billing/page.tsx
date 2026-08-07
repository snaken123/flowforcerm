import { redirect } from "next/navigation";
import Link from "next/link";
import { getSuperAdminSession } from "@/control-plane/lib/superadmin-auth";
import { controlPlanePrisma } from "@/control-plane/lib/db";
import { PromoCodeManager } from "./promo-code-manager";

export default async function BillingPage() {
  const session = await getSuperAdminSession();
  if (!session) redirect("/superadmin/login");

  const xenditConfigured = !!process.env.XENDIT_SECRET_KEY && !!process.env.XENDIT_WEBHOOK_TOKEN;

  const [promoCodes, tenants] = await Promise.all([
    controlPlanePrisma.promoCode.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { subscriptions: true } } },
    }),
    controlPlanePrisma.tenant.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, subdomain: true, subscription: { select: { status: true, baseRateCentavos: true } } },
    }),
  ]);

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <Link href="/superadmin" className="text-xs text-[#666] hover:text-white transition-colors">
            ← Tenants
          </Link>
        </div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold uppercase tracking-widest">Billing</h1>
          <p className="text-[#666] text-sm mt-1">Platform billing — gyms paying FlowForceRM.</p>
        </div>

        {!xenditConfigured && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 mb-8 text-sm text-amber-200">
            <strong>Xendit isn't connected yet.</strong> Add <code className="font-mono">XENDIT_SECRET_KEY</code> and{" "}
            <code className="font-mono">XENDIT_WEBHOOK_TOKEN</code> to your environment once you have a Xendit account —
            until then, promo codes can be managed but no gym can actually be charged, and the webhook receiver
            rejects everything.
          </div>
        )}

        <div className="mb-10">
          <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wide mb-4">Gyms</h2>
          <div className="rounded-xl border border-white/10 bg-[#111] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-[#888] uppercase text-xs tracking-wide">
                  <th className="px-4 py-3 font-medium">Gym</th>
                  <th className="px-4 py-3 font-medium">Rate</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((t) => (
                  <tr key={t.id} className="border-b border-white/5 last:border-0">
                    <td className="px-4 py-3">
                      <div>{t.name}</div>
                      <div className="text-[#666] text-xs">{t.subdomain}.flowforcerm.com</div>
                    </td>
                    <td className="px-4 py-3 text-[#888]">
                      {t.subscription ? `₱${(t.subscription.baseRateCentavos / 100).toFixed(2)}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block rounded-full px-2 py-0.5 text-xs font-medium bg-white/10 text-[#888]">
                        {t.subscription?.status ?? "NO SUBSCRIPTION"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <PromoCodeManager promoCodes={promoCodes} />
      </div>
    </div>
  );
}
