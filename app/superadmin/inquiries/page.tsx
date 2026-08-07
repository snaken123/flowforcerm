import { redirect } from "next/navigation";
import Link from "next/link";
import { getSuperAdminSession } from "@/control-plane/lib/superadmin-auth";
import { controlPlanePrisma } from "@/control-plane/lib/db";

export default async function InquiriesPage() {
  const session = await getSuperAdminSession();
  if (!session) redirect("/superadmin/login");

  const inquiries = await controlPlanePrisma.contactInquiry.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <Link href="/superadmin" className="text-xs text-[#666] hover:text-white transition-colors">
            ← Tenants
          </Link>
        </div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold uppercase tracking-widest">Inquiries</h1>
          <p className="text-[#666] text-sm mt-1">Contact-form submissions from flowforcerm.com</p>
        </div>

        {inquiries.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-[#111] p-12 text-center text-[#666]">
            No inquiries yet.
          </div>
        ) : (
          <div className="space-y-4">
            {inquiries.map((i) => (
              <div key={i.id} className="rounded-xl border border-white/10 bg-[#111] p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold">{i.name} — {i.gymName}</p>
                    <p className="text-[#666] text-xs mt-0.5">
                      <a href={`mailto:${i.email}`} className="hover:text-white transition-colors">{i.email}</a>
                      {i.phone && <span> · {i.phone}</span>}
                    </p>
                  </div>
                  <span className="text-[#555] text-xs whitespace-nowrap">{i.createdAt.toLocaleString()}</span>
                </div>
                <p className="text-sm text-[#ccc] whitespace-pre-wrap">{i.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
