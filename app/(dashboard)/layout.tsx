import { Suspense } from "react";
import { headers } from "next/headers";
import { Sidebar } from "@/components/layout/sidebar";
import { NavProgress } from "@/components/layout/nav-progress";
import { prisma } from "@/lib/db";
import { TenantTimezoneProvider } from "@/components/tenant-timezone-provider";
import { getAuthSession } from "@/lib/auth";
import { HowDidYouHearGate } from "@/components/member/how-did-you-hear-gate";

function getEnabledFlags(): string[] {
  const raw = headers().get("x-tenant-flags");
  return raw ? raw.split(",").filter(Boolean) : [];
}

async function getBranding() {
  if (!headers().get("x-tenant-id")) return null;
  return prisma.tenantBranding.findFirst().catch(() => null);
}

// Members without a recorded source get a one-time blocking modal on first load
// after login — not enforced for ADMIN/STAFF/STORE sessions.
async function getMissingSourceMemberId(session: Awaited<ReturnType<typeof getAuthSession>>): Promise<string | null> {
  if (!headers().get("x-tenant-id")) return null;
  if (!session || (session.user as any).role !== "MEMBER") return null;
  const member = await prisma.member.findUnique({
    where: { userId: (session.user as any).id },
    select: { id: true, source: true },
  }).catch(() => null);
  if (!member || member.source) return null;
  return member.id;
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Session is resolved once here (server-side, before any HTML is sent) so the
  // sidebar can filter nav items by role/employeeTypes in its very first render --
  // previously it read useSession() client-side, which starts in a "loading" state
  // on first mount and briefly rendered as the wrong role until that fetch resolved.
  const session = await getAuthSession();
  const role = (session?.user as any)?.role ?? "MEMBER";
  const employeeTypes: string[] = (session?.user as any)?.employeeTypes ?? [];
  const [branding, missingSourceMemberId] = await Promise.all([getBranding(), getMissingSourceMemberId(session)]);
  return (
    <TenantTimezoneProvider timezone={branding?.timezone ?? "Asia/Manila"}>
      <div className="flex min-h-screen bg-muted/30">
        <Suspense fallback={null}>
          <NavProgress />
        </Suspense>
        <Sidebar
          brandName={branding?.gymName}
          logoUrl={branding?.logoUrl}
          slogan={branding?.slogan}
          enabledFlags={getEnabledFlags()}
          role={role}
          employeeTypes={employeeTypes}
        />
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
