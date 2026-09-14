import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { LoginPageClient } from "./login-client";

// Superadmin and the bare marketing domain never resolve a tenant (see middleware.ts),
// so branding is a no-op there and this page falls back to the platform's own look --
// same guard as layout.tsx's getBrandStyle().
export default async function LoginPage() {
  const tenantId = headers().get("x-tenant-id");
  const branding = tenantId ? await prisma.tenantBranding.findFirst().catch(() => null) : null;

  return (
    <LoginPageClient
      logoUrl={branding?.logoUrl ?? null}
      gymName={branding?.gymName ?? "FlowForceRM"}
      slogan={branding?.slogan ?? null}
    />
  );
}
