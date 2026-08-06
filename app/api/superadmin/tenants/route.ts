import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdmin } from "@/control-plane/lib/superadmin-auth";
import { provisionTenant, ProvisionValidationError } from "@/control-plane/lib/provision-tenant";
import { isValidTimeZone } from "@/lib/time";

const createTenantSchema = z.object({
  gymName: z.string().min(2).max(100),
  subdomain: z.string().min(2).max(32),
  adminEmail: z.string().email(),
  adminName: z.string().min(2).max(100),
  timezone: z.string().refine(isValidTimeZone, "Not a recognized timezone").optional(),
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
