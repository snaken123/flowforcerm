import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { controlPlanePrisma } from "@/control-plane/lib/db";
import { LegalAgreementsClient } from "./legal-agreements-client";

export default async function LegalAgreementsPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login");
  if (!["ADMIN", "STAFF"].includes(session.user.role)) redirect("/dashboard");

  // Org-scoped rows (ToS/DPA) are relevant to every admin, not just whoever
  // happened to click Accept first -- shown regardless of who accepted them.
  const acceptances = await prisma.legalAgreementAcceptance.findMany({
    where: { OR: [{ userId: session.user.id }, { scope: "ORGANIZATION" }] },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { acceptedAt: "desc" },
  });

  const documentIds = [...new Set(acceptances.map((a) => a.documentId))];
  const documents = documentIds.length
    ? await controlPlanePrisma.legalDocument.findMany({
        where: { id: { in: documentIds } },
        select: { id: true, title: true, content: true },
      })
    : [];
  const documentById = new Map(documents.map((d) => [d.id, d]));

  const rows = acceptances.map((a) => ({
    id: a.id,
    type: a.documentType,
    version: a.documentVersion,
    scope: a.scope,
    acceptedAt: a.acceptedAt.toISOString(),
    acceptedByMe: a.userId === session.user.id,
    acceptedByName: a.user.name ?? a.user.email ?? "Unknown",
    title: documentById.get(a.documentId)?.title ?? a.documentType,
    content: documentById.get(a.documentId)?.content ?? null,
  }));

  // Admin-only: only the gym owner/manager is likely to need this level of vendor
  // detail, so STAFF never even receives it in the page payload.
  const subprocessors = session.user.role === "ADMIN"
    ? await controlPlanePrisma.subprocessor.findMany({
        where: { status: "ACTIVE" },
        orderBy: { name: "asc" },
        select: { id: true, name: true, service: true, purpose: true, dataCategories: true, location: true, referenceUrl: true },
      })
    : [];

  return <LegalAgreementsClient rows={rows} subprocessors={subprocessors} />;
}
