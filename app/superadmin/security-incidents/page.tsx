import { redirect } from "next/navigation";
import Link from "next/link";
import { getSuperAdminSession } from "@/control-plane/lib/superadmin-auth";
import { controlPlanePrisma } from "@/control-plane/lib/db";
import { SecurityIncidentsClient } from "./security-incidents-client";

export default async function SecurityIncidentsPage() {
  const session = await getSuperAdminSession();
  if (!session) redirect("/superadmin/login");

  const [incidents, tenants] = await Promise.all([
    controlPlanePrisma.securityIncident.findMany({
      include: { affectedTenants: { include: { tenant: { select: { id: true, name: true, subdomain: true } } } } },
      orderBy: { detectedAt: "desc" },
    }),
    controlPlanePrisma.tenant.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, subdomain: true } }),
  ]);

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/superadmin" className="text-xs text-[#666] hover:text-white transition-colors">
            ← Tenants
          </Link>
        </div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold uppercase tracking-widest">Security Incidents</h1>
          <p className="text-[#666] text-sm mt-1">
            Superadmin-only. Never exposed to gym users. No breach-notification deadline is assumed anywhere in this system.
          </p>
        </div>
        <SecurityIncidentsClient initialIncidents={incidents as any} tenants={tenants} />
      </div>
    </div>
  );
}
