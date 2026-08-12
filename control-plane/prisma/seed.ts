import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { controlPlanePrisma } from "../lib/db";
import { encryptSecret } from "../lib/crypto";

async function main() {
  const email = process.env.SEED_SUPERADMIN_EMAIL;
  const password = process.env.SEED_SUPERADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("SEED_SUPERADMIN_EMAIL and SEED_SUPERADMIN_PASSWORD must be set");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const superAdmin = await controlPlanePrisma.superAdmin.upsert({
    where: { email: email.toLowerCase() },
    update: {},
    create: { email: email.toLowerCase(), password: passwordHash },
  });
  console.log("Super admin ready:", superAdmin.email);

  const tenantDbUrl = process.env.SEED_TENANT1_DATABASE_URL;
  const tenantDirectUrl = process.env.SEED_TENANT1_DIRECT_URL;
  const tenantNeonProjectId = process.env.SEED_TENANT1_NEON_PROJECT_ID;
  if (!tenantDbUrl || !tenantDirectUrl || !tenantNeonProjectId) {
    throw new Error("SEED_TENANT1_DATABASE_URL, SEED_TENANT1_DIRECT_URL, and SEED_TENANT1_NEON_PROJECT_ID must be set");
  }

  // Guard against seeding a tenant onto the control-plane's own database -- exactly the
  // mistake that once left the "ffrm" tenant pointed at a database with no gym schema at
  // all, silently breaking login and password reset for it.
  if (process.env.CONTROL_PLANE_DATABASE_URL) {
    const controlPlaneHost = new URL(process.env.CONTROL_PLANE_DATABASE_URL).hostname;
    const tenantHost = new URL(tenantDbUrl).hostname;
    if (tenantHost === controlPlaneHost) {
      throw new Error(
        `SEED_TENANT1_DATABASE_URL (${tenantHost}) points at the same host as CONTROL_PLANE_DATABASE_URL. ` +
          "Refusing to seed a tenant onto the control-plane's own database -- point it at a dedicated tenant database instead."
      );
    }
  }

  // Confirm the target database actually has the gym schema applied before trusting it.
  const tenantDbCheck = new PrismaClient({ datasourceUrl: tenantDbUrl });
  try {
    const tables = await tenantDbCheck.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `;
    if (!tables.some((t) => t.tablename === "User")) {
      throw new Error(
        'SEED_TENANT1_DATABASE_URL has no "User" table -- run the schema bootstrap ' +
          "(control-plane/bootstrap/tenant-schema.sql) against it before seeding this tenant."
      );
    }
  } finally {
    await tenantDbCheck.$disconnect();
  }

  const tenant = await controlPlanePrisma.tenant.upsert({
    where: { subdomain: "ffrm" },
    update: {
      databaseUrlEnc: encryptSecret(tenantDbUrl),
      directUrlEnc: encryptSecret(tenantDirectUrl),
      neonProjectId: tenantNeonProjectId,
    },
    create: {
      name: "FlowForceRM (Tenant #1)",
      subdomain: "ffrm",
      status: "ACTIVE",
      databaseUrlEnc: encryptSecret(tenantDbUrl),
      directUrlEnc: encryptSecret(tenantDirectUrl),
      neonProjectId: tenantNeonProjectId,
      brandName: "FlowForceRM",
      timezone: "Asia/Manila",
      provisionedAt: new Date(),
    },
  });
  await controlPlanePrisma.provisioningLog.create({
    data: {
      tenantId: tenant.id,
      step: "seeded_via_seed_script",
      status: "success",
      detail: tenantNeonProjectId,
    },
  });
  console.log("Tenant #1 ready:", tenant.subdomain, tenant.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => controlPlanePrisma.$disconnect());
