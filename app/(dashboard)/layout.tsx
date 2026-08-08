import { Suspense } from "react";
import { headers } from "next/headers";
import { Sidebar } from "@/components/layout/sidebar";
import { NavProgress } from "@/components/layout/nav-progress";
import { prisma } from "@/lib/db";
import { TenantTimezoneProvider } from "@/components/tenant-timezone-provider";
import { getAuthSession } from "@/lib/auth";
import { HowDidYouHearGate } from "@/components/member/how-did-you-hear-gate";

async function getBranding() {
  if (!headers().get("x-tenant-id")) return null;
  return prisma.tenantBranding.findFirst().catch(() => null);
}

// Members without a recorded source get a one-time blocking modal on first load
// after login — not enforced for ADMIN/STAFF/STORE sessions.
async function getMissingSourceMemberId(): Promise<string | null> {
  if (!headers().get("x-tenant-id")) return null;
  const session = await getAuthSession();
  if (!session || (session.user as any).role !== "MEMBER") return null;
  const member = await prisma.member.findUnique({
    where: { userId: (session.user as any).id },
    select: { id: true, source: true },
  }).catch(() => null);
  if (!member || member.source) return null;
  return member.id;
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [branding, missingSourceMemberId] = await Promise.all([getBranding(), getMissingSourceMemberId()]);
  return (
    <TenantTimezoneProvider timezone={branding?.timezone ?? "Asia/Manila"}>
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
      {missingSourceMemberId && <HowDidYouHearGate memberId={missingSourceMemberId} />}
    </TenantTimezoneProvider>
  );
}
