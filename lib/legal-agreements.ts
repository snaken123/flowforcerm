import { prisma } from "@/lib/db";
import { controlPlanePrisma } from "@/control-plane/lib/db";
import { logAudit } from "@/lib/audit";
import { sendLegalAgreementConfirmation } from "@/lib/email";
import type { LegalDocumentType as TenantLegalDocumentType, LegalAcceptanceContext, LegalAcceptanceScope } from "@prisma/client";
import type { Role } from "@prisma/client";

// FlowForceRM's OWN platform-level legal documents (Terms of Service, Privacy
// Policy, DPA, Acceptable Use Policy) -- see the schema comments in both
// prisma/schema.prisma and control-plane/prisma/schema.prisma for the full
// rationale. This is the single reusable service everything else (middleware,
// the /legal-acceptance page, the agreement-history page) calls through, so the
// "who needs to accept what, and has it been satisfied" logic lives in one place.

// Contract documents bind the whole gym, not the individual admin who happens to
// click through them first -- any one acceptance satisfies the tenant.
export const ORG_SCOPED_TYPES: TenantLegalDocumentType[] = ["TERMS_OF_SERVICE", "DATA_PROCESSING_AGREEMENT"];

export function requiredTypesForRole(role: Role): TenantLegalDocumentType[] {
  switch (role) {
    case "ADMIN":
      return ["TERMS_OF_SERVICE", "DATA_PROCESSING_AGREEMENT", "PRIVACY_POLICY"];
    case "STAFF":
      return ["PRIVACY_POLICY", "ACCEPTABLE_USE_POLICY"];
    default:
      // MEMBER/KIOSK/STORE are not gated by this system -- members continue only
      // through the gym's own existing waiver/privacy flow (lib/legal-documents.ts).
      return [];
  }
}

export type OutstandingDocument = {
  documentId: string;
  type: TenantLegalDocumentType;
  title: string;
  version: string;
  content: string;
  contentHash: string | null;
  scope: LegalAcceptanceScope;
};

export async function getRequiredAgreementStatus(user: { id: string; role: Role }): Promise<{
  outstanding: OutstandingDocument[];
  allAccepted: boolean;
}> {
  const requiredTypes = requiredTypesForRole(user.role);
  if (requiredTypes.length === 0) return { outstanding: [], allAccepted: true };

  const publishedDocs = await controlPlanePrisma.legalDocument.findMany({
    where: { type: { in: requiredTypes }, status: "PUBLISHED" },
  });

  const outstanding: OutstandingDocument[] = [];

  for (const doc of publishedDocs) {
    const scope: LegalAcceptanceScope = ORG_SCOPED_TYPES.includes(doc.type) ? "ORGANIZATION" : "INDIVIDUAL";

    const alreadyAccepted = scope === "ORGANIZATION"
      ? await prisma.legalAgreementAcceptance.findFirst({
          where: { documentType: doc.type, documentVersion: doc.version, scope: "ORGANIZATION" },
          select: { id: true },
        })
      : await prisma.legalAgreementAcceptance.findFirst({
          where: { userId: user.id, documentType: doc.type, documentVersion: doc.version },
          select: { id: true },
        });

    if (!alreadyAccepted) {
      outstanding.push({
        documentId: doc.id,
        type: doc.type,
        title: doc.title,
        version: doc.version,
        content: doc.content,
        contentHash: doc.contentHash,
        scope,
      });
    }
  }

  return { outstanding, allAccepted: outstanding.length === 0 };
}

export async function acceptAgreements(
  user: { id: string; name: string | null; email: string | null; role: Role },
  documentIds: string[],
  opts: { ip?: string | null; userAgent?: string | null; fallbackContext?: LegalAcceptanceContext }
): Promise<{ accepted: OutstandingDocument[] }> {
  // Server re-derives what's actually required and current -- never trusts a
  // client-submitted version, hash, or "already accepted" claim.
  const { outstanding } = await getRequiredAgreementStatus(user);
  const toAccept = outstanding.filter((d) => documentIds.includes(d.documentId));

  if (toAccept.length === 0) return { accepted: [] };

  // Context is derived per document, not passed in as one flat value: a single
  // batch can mix a genuinely first-ever acceptance (no prior row of this type)
  // with a re-acceptance of a newer version of something already accepted before.
  const priorTypes = new Set(
    (
      await prisma.legalAgreementAcceptance.findMany({
        where: { userId: user.id, documentType: { in: toAccept.map((d) => d.type) } },
        select: { documentType: true },
        distinct: ["documentType"],
      })
    ).map((r) => r.documentType)
  );

  await prisma.$transaction(
    toAccept.map((doc) =>
      prisma.legalAgreementAcceptance.create({
        data: {
          userId: user.id,
          documentType: doc.type,
          documentVersion: doc.version,
          documentId: doc.documentId,
          documentHash: doc.contentHash,
          scope: doc.scope,
          ipAddress: opts.ip ?? null,
          userAgent: opts.userAgent ?? null,
          context: priorTypes.has(doc.type) ? "UPDATED_TERMS" : (opts.fallbackContext ?? "FIRST_LOGIN"),
        },
      })
    )
  );

  const actionForType: Record<TenantLegalDocumentType, string> = {
    TERMS_OF_SERVICE: "TERMS_ACCEPTED",
    DATA_PROCESSING_AGREEMENT: "DPA_ACCEPTED",
    PRIVACY_POLICY: "PRIVACY_POLICY_ACKNOWLEDGED",
    ACCEPTABLE_USE_POLICY: "AUP_ACKNOWLEDGED",
  };

  for (const doc of toAccept) {
    const context = priorTypes.has(doc.type) ? "UPDATED_TERMS" : (opts.fallbackContext ?? "FIRST_LOGIN");
    await logAudit({
      userId: user.id,
      userName: user.name ?? user.email ?? "Unknown",
      action: actionForType[doc.type],
      entityType: "LegalDocument",
      entityId: doc.documentId,
      entityName: `${doc.title} v${doc.version}`,
      description: `Accepted ${doc.title} v${doc.version}`,
      metadata: { type: doc.type, version: doc.version, scope: doc.scope, context },
    });
  }

  if (user.email) {
    sendLegalAgreementConfirmation({
      to: user.email,
      name: user.name ?? "there",
      documents: toAccept.map((d) => ({ title: d.title, version: d.version })),
    }).catch((e) => console.error("[legal-agreements] confirmation email failed:", e));
  }

  return { accepted: toAccept };
}
