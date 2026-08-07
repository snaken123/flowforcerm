// Pushes control-plane/prisma/schema.prisma to the control-plane database. Separate
// from scripts/push-schema-to-tenants.ts, which pushes the gym-side schema to every
// tenant's own database -- the control-plane DB is single and shared, so this is just
// a thin, env-loaded wrapper around `prisma db push`.
import { execSync } from "child_process";

execSync("npx prisma db push --schema=control-plane/prisma/schema.prisma", {
  env: process.env,
  stdio: "inherit",
});
