import { redirect } from "next/navigation";
import Link from "next/link";
import { getSuperAdminSession } from "@/control-plane/lib/superadmin-auth";
import { controlPlanePrisma } from "@/control-plane/lib/db";
import { NewTenantForm } from "./new-tenant-form";

export default async function SuperAdminDashboard() {
  const session = await getSuperAdminSession();
  if (!session) redirect("/superadmin/login");

  const tenants = await controlPlanePrisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-widest">Tenants</h1>
            <p className="text-[#666] text-sm mt-1">Every gym running on FlowForceRM</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/superadmin/inquiries"
              className="rounded-md border border-white/20 hover:bg-white hover:text-black transition-colors px-4 py-2 text-sm font-semibold"
            >
              Inquiries
            </Link>
            <Link
              href="/superadmin/billing"
              className="rounded-md border border-white/20 hover:bg-white hover:text-black transition-colors px-4 py-2 text-sm font-semibold"
            >
              Billing
            </Link>
            <Link
              href="/superadmin/flags"
              className="rounded-md border border-white/20 hover:bg-white hover:text-black transition-colors px-4 py-2 text-sm font-semibold"
            >
              Feature Flags
            </Link>
            <NewTenantForm />
          </div>
        </div>

        {tenants.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-[#111] p-12 text-center text-[#666]">
            No tenants yet.
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-[#111] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-[#888] uppercase text-xs tracking-wide">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Subdomain</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((t) => (
                  <tr key={t.id} className="border-b border-white/5 last:border-0">
                    <td className="px-4 py-3">{t.name}</td>
                    <td className="px-4 py-3 text-[#888]">{t.subdomain}.flowforcerm.com</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          "inline-block rounded-full px-2 py-0.5 text-xs font-medium " +
                          (t.status === "ACTIVE"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : t.status === "SUSPENDED"
                            ? "bg-red-500/10 text-red-400"
                            : t.status === "FAILED"
                            ? "bg-red-500/10 text-red-400"
                            : "bg-amber-500/10 text-amber-400")
                        }
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#666]">{t.createdAt.toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
