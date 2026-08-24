import { redirect } from "next/navigation";
import Link from "next/link";
import { getSuperAdminSession } from "@/control-plane/lib/superadmin-auth";
import { controlPlanePrisma } from "@/control-plane/lib/db";
import { PromoCodeManager } from "./promo-code-manager";
import { CommissionEntryRow } from "./commission-entry-row";

export default async function BillingPage() {
  const session = await getSuperAdminSession();
  if (!session) redirect("/superadmin/login");

  const xenditConfigured = !!process.env.XENDIT_SECRET_KEY && !!process.env.XENDIT_WEBHOOK_TOKEN;

  const [promoCodes, tenants, commissionEntries] = await Promise.all([
    controlPlanePrisma.promoCode.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { subscriptions: true } } },
    }),
    controlPlanePrisma.tenant.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        subdomain: true,
        isBilled: true,
        facilitator: { select: { name: true } },
        commissionPercent: true,
        commissionMonths: true,
        subscription: {
          select: { status: true, baseRateCentavos: true, referralDiscountPercent: true, trialEndsAt: true, paymentMethodSetupAt: true },
        },
      },
    }),
    controlPlanePrisma.commissionEntry.findMany({
      orderBy: { createdAt: "desc" },
      include: { facilitator: { select: { name: true } }, tenant: { select: { name: true } } },
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
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Trial / Payment</th>
                  <th className="px-4 py-3 font-medium">Facilitator</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((t) => {
                  const sub = t.subscription;
                  const discountCentavos = sub ? Math.round((sub.baseRateCentavos * sub.referralDiscountPercent) / 100) : 0;
                  const totalCentavos = sub ? sub.baseRateCentavos - discountCentavos : 0;
                  return (
                    <tr key={t.id} className="border-b border-white/5 last:border-0">
                      <td className="px-4 py-3">
                        <div>{t.name}</div>
                        <div className="text-[#666] text-xs">{t.subdomain}.flowforcerm.com</div>
                      </td>
                      <td className="px-4 py-3 text-[#888]">
                        {!t.isBilled ? (
                          "Not billed"
                        ) : sub ? (
                          <div>
                            <div>₱{(totalCentavos / 100).toFixed(2)}</div>
                            {sub.referralDiscountPercent > 0 && (
                              <div className="text-[#555] text-xs">
                                ₱{(sub.baseRateCentavos / 100).toFixed(2)} − {sub.referralDiscountPercent}% referral
                              </div>
                            )}
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block rounded-full px-2 py-0.5 text-xs font-medium bg-white/10 text-[#888]">
                          {!t.isBilled ? "NOT BILLED" : sub?.status ?? "NO SUBSCRIPTION"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#666] text-xs">
                        {sub?.paymentMethodSetupAt
                          ? sub.trialEndsAt
                            ? `Trial ends ${new Date(sub.trialEndsAt).toLocaleDateString()}`
                            : "Payment on file"
                          : t.isBilled
                          ? "Awaiting payment setup"
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-[#888] text-xs">
                        {t.facilitator
                          ? `${t.facilitator.name} · ${t.commissionPercent}% / ${t.commissionMonths}mo`
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mb-10">
          <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wide mb-4">Commissions</h2>
          {commissionEntries.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-[#111] p-8 text-center text-[#666] text-sm">
              No commission entries yet — these are created automatically when a billed gym's invoice is collected.
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-[#111] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-[#888] uppercase text-xs tracking-wide">
                    <th className="px-4 py-3 font-medium">Facilitator</th>
                    <th className="px-4 py-3 font-medium">Gym</th>
                    <th className="px-4 py-3 font-medium">Rate</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Earned</th>
                    <th className="px-4 py-3 font-medium text-right">Payout</th>
                  </tr>
                </thead>
                <tbody>
                  {commissionEntries.map((e) => (
                    <CommissionEntryRow
                      key={e.id}
                      entry={{
                        id: e.id,
                        amountCentavos: e.amountCentavos,
                        commissionPercent: e.commissionPercent,
                        paidOutAt: e.paidOutAt?.toISOString() ?? null,
                        createdAt: e.createdAt.toISOString(),
                        facilitator: e.facilitator,
                        tenant: e.tenant,
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <PromoCodeManager promoCodes={promoCodes} />
      </div>
    </div>
  );
}
