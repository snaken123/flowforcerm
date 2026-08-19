import { redirect } from "next/navigation";
import Link from "next/link";
import { getSuperAdminSession } from "@/control-plane/lib/superadmin-auth";
import { controlPlanePrisma } from "@/control-plane/lib/db";
import { SubprocessorsClient } from "./subprocessors-client";

export default async function SubprocessorsPage() {
  const session = await getSuperAdminSession();
  if (!session) redirect("/superadmin/login");

  const subprocessors = await controlPlanePrisma.subprocessor.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/superadmin" className="text-xs text-[#666] hover:text-white transition-colors">
            ← Tenants
          </Link>
        </div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold uppercase tracking-widest">Subprocessors</h1>
          <p className="text-[#666] text-sm mt-1">
            Third-party services that process customer or personal data on FlowForceRM's behalf. Surfaced read-only to every tenant.
          </p>
        </div>
        <SubprocessorsClient initialSubprocessors={subprocessors as any} />
      </div>
    </div>
  );
}
