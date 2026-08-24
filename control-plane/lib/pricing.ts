import { controlPlanePrisma } from "./db";
import { FLAG_COMMUNICATIONS, FLAG_SPECIALIZED_ROLES, FLAG_WEB_INTEGRATION } from "@/lib/feature-flags-constants";

// Full price with every section enabled. Deducting a disabled section's price from
// this flat figure (rather than summing opted-in add-ons) is the confirmed model --
// see the commission/billing plan.
export const BASE_PRICE_CENTAVOS = 400_000; // ₱4000

export const FEATURE_PRICES_CENTAVOS: Record<string, number> = {
  [FLAG_COMMUNICATIONS]: 50_000, // ₱500
  [FLAG_SPECIALIZED_ROLES]: 25_000, // ₱250
  [FLAG_WEB_INTEGRATION]: 25_000, // ₱250
};

export function computeBaseRateCentavos(activeFlagKeys: string[]): number {
  const active = new Set(activeFlagKeys);
  let total = BASE_PRICE_CENTAVOS;
  for (const [key, price] of Object.entries(FEATURE_PRICES_CENTAVOS)) {
    if (!active.has(key)) total -= price;
  }
  return total;
}

const REFERRAL_DISCOUNT_PER_GYM_PERCENT = 5;
const REFERRAL_DISCOUNT_MAX_PERCENT = 20;

// 5% per currently-active-and-paying gym this tenant referred, capped at 20%. Purely
// derived from current Subscription.status -- never hand-edited, and drops back down
// the moment a referred gym's subscription leaves ACTIVE (cancelled, suspended, etc.).
export async function computeReferralDiscountPercent(tenantId: string): Promise<number> {
  const activeReferrals = await controlPlanePrisma.tenant.count({
    where: { referredByTenantId: tenantId, subscription: { status: "ACTIVE" } },
  });
  return Math.min(activeReferrals, REFERRAL_DISCOUNT_MAX_PERCENT / REFERRAL_DISCOUNT_PER_GYM_PERCENT) * REFERRAL_DISCOUNT_PER_GYM_PERCENT;
}

// Recomputes and persists the referrer's discount, if this tenant was referred by
// another. Called whenever a tenant's subscription status changes to/from ACTIVE.
// No-op if the tenant has no referrer or the referrer has no Subscription yet.
export async function refreshReferrerDiscount(tenantId: string): Promise<void> {
  const tenant = await controlPlanePrisma.tenant.findUnique({
    where: { id: tenantId },
    select: { referredByTenantId: true },
  });
  const referrerId = tenant?.referredByTenantId;
  if (!referrerId) return;

  const referrerSubscription = await controlPlanePrisma.subscription.findUnique({
    where: { tenantId: referrerId },
    select: { id: true },
  });
  if (!referrerSubscription) return;

  const referralDiscountPercent = await computeReferralDiscountPercent(referrerId);
  await controlPlanePrisma.subscription.update({
    where: { tenantId: referrerId },
    data: { referralDiscountPercent },
  });
}
