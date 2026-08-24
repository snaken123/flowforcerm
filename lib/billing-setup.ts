import { headers } from "next/headers";
import { controlPlanePrisma } from "@/control-plane/lib/db";

// ADMIN-only gate (see middleware.ts's needsPaymentSetup redirect to /billing-setup): a
// billed gym's admin must submit payment details before using the rest of the app.
// Reads the control-plane tenant id middleware already resolved onto this request
// (x-tenant-id) -- same pattern as lib/feature-flags.ts's isFeatureEnabled().
export async function getNeedsPaymentSetup(): Promise<boolean> {
  const tenantId = headers().get("x-tenant-id");
  if (!tenantId) return false;
  const subscription = await controlPlanePrisma.subscription.findUnique({
    where: { tenantId },
    select: { paymentMethodSetupAt: true },
  });
  if (!subscription) return false; // not a billed gym -- no gate
  return subscription.paymentMethodSetupAt === null;
}
