import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import {
  LEGAL_KEYS,
  DEFAULT_WAIVER_TEXT,
  DEFAULT_PRIVACY_TEXT,
  DEFAULT_RULES_PDF_URL,
  DEFAULT_HANDBOOK_PDF_URL,
  type LegalDocuments,
} from "@/lib/legal-documents";

// Any authenticated role — read-only, backs onboarding + the member Documents tab.
export async function GET() {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await prisma.systemSetting.findMany({
    where: { key: { in: Object.values(LEGAL_KEYS) } },
  });
  const byKey = new Map(rows.map((r) => [r.key, r.value]));

  const documents: LegalDocuments = {
    waiverText: byKey.get(LEGAL_KEYS.waiverText) ?? DEFAULT_WAIVER_TEXT,
    privacyText: byKey.get(LEGAL_KEYS.privacyText) ?? DEFAULT_PRIVACY_TEXT,
    rulesPdfUrl: byKey.get(LEGAL_KEYS.rulesPdfUrl) ?? DEFAULT_RULES_PDF_URL,
    handbookPdfUrl: byKey.get(LEGAL_KEYS.handbookPdfUrl) ?? DEFAULT_HANDBOOK_PDF_URL,
  };

  return NextResponse.json(documents);
}
