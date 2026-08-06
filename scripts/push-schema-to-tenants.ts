// Applies the current gym-side prisma/schema.prisma to every existing tenant database
// via `prisma db push`. New tenants get the current schema automatically from
// control-plane/bootstrap/tenant-schema.sql at provisioning time (see
// `npm run db:bootstrap-sql` to regenerate that file after a schema change) --
// this script is the other half: rolling a schema change out to tenants that were
// provisioned before the change existed.
//
// Usage:
//   npx tsx --env-file=.env.local scripts/push-schema-to-tenants.ts            # all active tenants
//   npx tsx --env-file=.env.local scripts/push-schema-to-tenants.ts ffrm       # one tenant, by subdomain

import { execSync } from "child_process";
import { getActiveTenants, getTenantConnectionInfo } from "../control-plane/lib/tenant-resolution";
import { controlPlanePrisma } from "../control-plane/lib/db";

async function main() {
  const onlySubdomain = process.argv[2];
  const tenants = await getActiveTenants();
  const targets = onlySubdomain ? tenants.filter((t) => t.subdomain === onlySubdomain) : tenants;

  if (targets.length === 0) {
    console.log(onlySubdomain ? `No active tenant found with subdomain "${onlySubdomain}".` : "No active tenants.");
    return;
  }

  console.log(`Pushing schema to ${targets.length} tenant(s)...\n`);

  for (const tenant of targets) {
    const conn = await getTenantConnectionInfo(tenant.id);
    if (!conn) {
      console.error(`[${tenant.subdomain}] SKIPPED — no connection info found`);
      continue;
    }
    console.log(`[${tenant.subdomain}] pushing...`);
    try {
      execSync("npx prisma db push --skip-generate", {
        env: { ...process.env, DATABASE_URL: conn.databaseUrl, DIRECT_URL: conn.directUrl },
        stdio: "inherit",
      });
      console.log(`[${tenant.subdomain}] done\n`);
    } catch (err) {
      console.error(`[${tenant.subdomain}] FAILED — ${err instanceof Error ? err.message : err}\n`);
    }
  }
}

main().finally(() => controlPlanePrisma.$disconnect());
