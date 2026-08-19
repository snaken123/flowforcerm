import { redirect } from "next/navigation";
import Link from "next/link";
import { getSuperAdminSession } from "@/control-plane/lib/superadmin-auth";
import { controlPlanePrisma } from "@/control-plane/lib/db";
import { LegalDocumentsClient } from "./legal-documents-client";

export default async function LegalDocumentsPage() {
  const session = await getSuperAdminSession();
  if (!session) redirect("/superadmin/login");

  const documents = await controlPlanePrisma.legalDocument.findMany({
    orderBy: [{ type: "asc" }, { createdAt: "desc" }],
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
          <h1 className="text-2xl font-bold uppercase tracking-widest">Legal Documents</h1>
          <p className="text-[#666] text-sm mt-1">
            FlowForceRM's own Terms of Service, Privacy Policy, DPA, and Acceptable Use Policy — gym admins cannot edit these.
          </p>
          <p className="text-amber-500/80 text-xs mt-2 max-w-2xl">
            Placeholder content only. Requires review and approval by qualified Philippine legal/privacy counsel before commercial use.
          </p>
        </div>

        <LegalDocumentsClient initialDocuments={documents as any} />
      </div>
    </div>
  );
}
