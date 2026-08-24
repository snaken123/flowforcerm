import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdmin } from "@/control-plane/lib/superadmin-auth";
import { provisionTenant, ProvisionValidationError } from "@/control-plane/lib/provision-tenant";
import { isValidTimeZone } from "@/lib/time";

const createTenantSchema = z
  .object({
    gymName: z.string().min(2).max(100),
    subdomain: z.string().min(2).max(32),
    adminEmail: z.string().email(),
    adminName: z.string().min(2).max(100),
    timezone: z.string().refine(isValidTimeZone, "Not a recognized timezone").optional(),
    facilitatorId: z.string().optional(),
    commissionPercent: z.number().min(1).max(100).optional(),
    commissionMonths: z.number().min(1).max(120).optional(),
    referredByTenantId: z.string().optional(),
    isBilled: z.boolean().optional(),
  })
  .refine((d) => !d.facilitatorId || (d.commissionPercent && d.commissionMonths), {
    message: "Commission % and length are required when a facilitator is selected.",
  });

export async function POST(req: Request) {
  const session = await requireSuperAdmin().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createTenantSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await provisionTenant({
      gymName: parsed.data.gymName,
      subdomain: parsed.data.subdomain.toLowerCase(),
      adminEmail: parsed.data.adminEmail,
      adminName: parsed.data.adminName,
      timezone: parsed.data.timezone,
      createdBySuperAdminId: (session.user as { id: string }).id,
      facilitatorId: parsed.data.facilitatorId || undefined,
      commissionPercent: parsed.data.commissionPercent,
      commissionMonths: parsed.data.commissionMonths,
      referredByTenantId: parsed.data.referredByTenantId || undefined,
      isBilled: parsed.data.isBilled,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ProvisionValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("[provision-tenant]", err);
    return NextResponse.json({ error: "Provisioning failed. Check the tenant's provisioning log for details." }, { status: 500 });
  }
}
