import { readFileSync } from "fs";
import path from "path";
import { randomBytes } from "crypto";
import { Client } from "pg";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { controlPlanePrisma } from "./db";
import { encryptSecret } from "./crypto";
import { createTenantNeonProject, deleteTenantNeonProject } from "./neon-api";
import { ensureTenantDomain } from "./vercel-api";
import { sendActivationEmail } from "@/lib/email";
import { isValidTimeZone } from "@/lib/time";

const RESERVED_SUBDOMAINS = new Set(["www", "superadmin", "app", "admin", "api", "flowforcerm"]);

export class ProvisionValidationError extends Error {}

export function validateSubdomain(subdomain: string) {
  if (!/^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/.test(subdomain)) {
    throw new ProvisionValidationError(
      "Subdomain must be lowercase letters, numbers, and hyphens only (2-32 chars, no leading/trailing hyphen)."
    );
  }
  if (RESERVED_SUBDOMAINS.has(subdomain)) {
    throw new ProvisionValidationError(`"${subdomain}" is a reserved subdomain.`);
  }
}

async function log(tenantId: string, step: string, status: string, detail?: string) {
  await controlPlanePrisma.provisioningLog.create({
    data: { tenantId, step, status, detail },
  });
}

export function generateTempPassword(): string {
  return randomBytes(9).toString("base64").replace(/[+/=]/g, "").slice(0, 12);
}

export type ProvisionTenantInput = {
  gymName: string;
  subdomain: string;
  adminEmail: string;
  adminName: string;
  createdBySuperAdminId: string;
  timezone?: string;
};

// Orchestrates onboarding a brand new gym: create its control-plane record, spin up a
// dedicated Neon project (the tenant-isolation boundary), bootstrap the gym schema into
// it, seed the first admin account, and activate. Billing (Phase 9) isn't wired up yet,
// so tenants activate immediately after setup rather than waiting on a first successful
// charge -- that gate gets added once Xendit exists.
export async function provisionTenant(input: ProvisionTenantInput) {
  validateSubdomain(input.subdomain);

  const timezone = input.timezone && isValidTimeZone(input.timezone) ? input.timezone : "Asia/Manila";

  const existing = await controlPlanePrisma.tenant.findUnique({ where: { subdomain: input.subdomain } });
  if (existing) throw new ProvisionValidationError(`Subdomain "${input.subdomain}" is already taken.`);

  const tenant = await controlPlanePrisma.tenant.create({
    data: {
      name: input.gymName,
      subdomain: input.subdomain,
      status: "PROVISIONING",
      databaseUrlEnc: "",
      directUrlEnc: "",
      neonProjectId: "",
      brandName: input.gymName,
      timezone,
      createdBySuperAdminId: input.createdBySuperAdminId,
    },
  });
  await log(tenant.id, "tenant_record_created", "success");

  let neonProjectId: string | null = null;
  try {
    const neonProject = await createTenantNeonProject(`flowforcerm-tenant-${input.subdomain}`);
    neonProjectId = neonProject.neonProjectId;
    await log(tenant.id, "neon_project_created", "success", neonProjectId);

    await controlPlanePrisma.tenant.update({
      where: { id: tenant.id },
      data: {
        neonProjectId: neonProject.neonProjectId,
        databaseUrlEnc: encryptSecret(neonProject.databaseUrl),
        directUrlEnc: encryptSecret(neonProject.directUrl),
      },
    });

    const bootstrapSql = readFileSync(
      path.join(process.cwd(), "control-plane/bootstrap/tenant-schema.sql"),
      "utf8"
    );
    const pgClient = new Client({ connectionString: neonProject.directUrl });
    await pgClient.connect();
    try {
      await pgClient.query(bootstrapSql);
    } finally {
      await pgClient.end();
    }
    await log(tenant.id, "schema_bootstrapped", "success");

    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 12);
    const tenantPrisma = new PrismaClient({ datasourceUrl: neonProject.directUrl });
    try {
      await tenantPrisma.user.create({
        data: {
          email: input.adminEmail.toLowerCase(),
          name: input.adminName,
          password: passwordHash,
          role: "ADMIN",
          mustChangePassword: true,
        },
      });
      await tenantPrisma.tenantBranding.create({
        data: { id: "singleton", gymName: input.gymName, timezone },
      });
    } finally {
      await tenantPrisma.$disconnect();
    }
    await log(tenant.id, "admin_seeded", "success", input.adminEmail);

    // Non-fatal, same reasoning as the email step below: the tenant is otherwise fully
    // provisioned, so a Vercel hiccup shouldn't roll back real infrastructure that
    // already succeeded. Surfaced to the superadmin so they can retry via the tenant
    // list's "Retry Domain Setup" action instead of losing the whole tenant.
    let domainReady = false;
    try {
      domainReady = await ensureTenantDomain(input.subdomain);
      await log(tenant.id, domainReady ? "vercel_domain_verified" : "vercel_domain_pending", domainReady ? "success" : "warning");
    } catch (domainErr) {
      const domainMessage = domainErr instanceof Error ? domainErr.message : String(domainErr);
      await log(tenant.id, "vercel_domain_failed", "error", domainMessage);
    }

    // Non-fatal: the tenant is otherwise fully provisioned at this point, so a down/
    // misconfigured mail provider shouldn't roll back real infrastructure that already
    // succeeded. The temp password is returned to the caller as a fallback either way.
    let emailSent = true;
    try {
      await sendActivationEmail({ to: input.adminEmail, firstName: input.adminName, tempPassword, subdomain: input.subdomain });
      await log(tenant.id, "activation_email_sent", "success");
    } catch (emailErr) {
      emailSent = false;
      const emailMessage = emailErr instanceof Error ? emailErr.message : String(emailErr);
      await log(tenant.id, "activation_email_failed", "error", emailMessage);
    }

    const activated = await controlPlanePrisma.tenant.update({
      where: { id: tenant.id },
      data: { status: "ACTIVE", provisionedAt: new Date() },
    });
    await log(tenant.id, "activated", "success");

    return { tenant: activated, tempPassword, emailSent, domainReady };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await log(tenant.id, "provisioning_failed", "error", message);

    if (neonProjectId) {
      try {
        await deleteTenantNeonProject(neonProjectId);
        await log(tenant.id, "neon_project_cleaned_up", "success");
      } catch (cleanupErr) {
        const cleanupMessage = cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr);
        await log(tenant.id, "neon_project_cleanup_failed", "error", cleanupMessage);
      }
    }

    await controlPlanePrisma.tenant.update({ where: { id: tenant.id }, data: { status: "FAILED" } });
    throw err;
  }
}
