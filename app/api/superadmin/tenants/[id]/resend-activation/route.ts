import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { requireSuperAdmin } from "@/control-plane/lib/superadmin-auth";
import { controlPlanePrisma } from "@/control-plane/lib/db";
import { decryptSecret } from "@/control-plane/lib/crypto";
import { generateTempPassword } from "@/control-plane/lib/provision-tenant";
import { sendActivationEmail } from "@/lib/email";

// Resets the tenant's first ADMIN account to a fresh temp password and re-sends the
// activation email -- for when the original email was never received, or (as with the
// tenant-subdomain link bug) pointed somewhere wrong and the admin needs a fresh one to
// test against. Connects directly to the tenant's own database with a short-lived
// Prisma client since this runs from the control plane, outside any tenant request.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireSuperAdmin().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenant = await controlPlanePrisma.tenant.findUnique({ where: { id: params.id } });
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  if (!tenant.directUrlEnc) {
    return NextResponse.json({ error: "Tenant has no database configured yet." }, { status: 400 });
  }

  const directUrl = decryptSecret(tenant.directUrlEnc);
  const tenantPrisma = new PrismaClient({ datasourceUrl: directUrl });
  try {
    const admin = await tenantPrisma.user.findFirst({
      where: { role: "ADMIN" },
      orderBy: { createdAt: "asc" },
    });
    if (!admin) {
      return NextResponse.json({ error: "This tenant has no admin account to activate." }, { status: 404 });
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 12);
    await tenantPrisma.user.update({
      where: { id: admin.id },
      data: { password: passwordHash, mustChangePassword: true },
    });

    let emailSent = true;
    try {
      await sendActivationEmail({
        to: admin.email,
        firstName: admin.name?.split(" ")[0] ?? "there",
        tempPassword,
        subdomain: tenant.subdomain,
      });
    } catch (err) {
      emailSent = false;
      console.error("[resend-activation] failed to send email", err);
    }

    return NextResponse.json({ adminEmail: admin.email, tempPassword, emailSent });
  } finally {
    await tenantPrisma.$disconnect();
  }
}
