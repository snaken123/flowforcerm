import { controlPlanePrisma } from "./db";

export type ResolvedTenant = {
  id: string;
  subdomain: string;
  status: "PROVISIONING" | "ACTIVE" | "SUSPENDED" | "FAILED";
  brandName: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  timezone: string;
};

// Looked up by the internal /api/internal/resolve-tenant route (Node runtime — this
// file touches the control-plane Prisma client, which can't run on the Edge runtime
// middleware itself). Kept intentionally small: only what's needed to route a request
// and render a suspended/branded fallback without opening the tenant's own database.
export async function findTenantBySubdomain(subdomain: string): Promise<ResolvedTenant | null> {
  const tenant = await controlPlanePrisma.tenant.findUnique({
    where: { subdomain },
    select: {
      id: true,
      subdomain: true,
      status: true,
      brandName: true,
      logoUrl: true,
      primaryColor: true,
      timezone: true,
    },
  });
  return tenant;
}
