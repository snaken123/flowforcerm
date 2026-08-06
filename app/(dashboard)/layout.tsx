import { Suspense } from "react";
import { headers } from "next/headers";
import { Sidebar } from "@/components/layout/sidebar";
import { NavProgress } from "@/components/layout/nav-progress";
import { prisma } from "@/lib/db";

async function getBranding() {
  if (!headers().get("x-tenant-id")) return null;
  return prisma.tenantBranding.findFirst().catch(() => null);
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const branding = await getBranding();
  return (
    <div className="flex min-h-screen bg-muted/30">
      <Suspense fallback={null}>
        <NavProgress />
      </Suspense>
      <Sidebar brandName={branding?.gymName} logoUrl={branding?.logoUrl} slogan={branding?.slogan} />
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto max-w-7xl px-4 py-6 md:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
