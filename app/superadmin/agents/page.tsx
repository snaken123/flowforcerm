import { redirect } from "next/navigation";
import Link from "next/link";
import { getSuperAdminSession } from "@/control-plane/lib/superadmin-auth";
import { controlPlanePrisma } from "@/control-plane/lib/db";
import { NewAgentForm } from "./new-agent-form";
import { AgentRow } from "./agent-row";

export default async function AgentsPage() {
  const session = await getSuperAdminSession();
  if (!session) redirect("/superadmin/login");

  const agents = await controlPlanePrisma.agent.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { tenants: true } } },
  });

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Link href="/superadmin" className="text-xs text-[#666] hover:text-white transition-colors">
            ← Tenants
          </Link>
        </div>
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-widest">Agents</h1>
            <p className="text-[#666] text-sm mt-1">People who sell FlowForceRM to gyms and earn a commission.</p>
          </div>
          <NewAgentForm />
        </div>

        {agents.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-[#111] p-12 text-center text-[#666]">
            No agents yet.
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-[#111] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-[#888] uppercase text-xs tracking-wide">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">Bank Account</th>
                  <th className="px-4 py-3 font-medium">Gyms</th>
                  <th className="px-4 py-3 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((a) => (
                  <AgentRow key={a.id} agent={a} tenantCount={a._count.tenants} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
