import bcrypt from "bcryptjs";
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
  console.log("Tenant #1 ready:", tenant.subdomain, tenant.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => controlPlanePrisma.$disconnect());
