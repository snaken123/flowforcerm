import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { uploadToR2 } from "@/lib/r2";
import { LEGAL_KEYS } from "@/lib/legal-documents";

const KIND_TO_KEY = {
  rules: LEGAL_KEYS.rulesPdfUrl,
  handbook: LEGAL_KEYS.handbookPdfUrl,
} as const;

// One combined "replace" action — pick a new file, it overwrites the old link.
// No bare-delete state, since that would break onboarding / the member Documents tab.
export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const kind = formData.get("kind") as string | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (kind !== "rules" && kind !== "handbook") {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }

  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  if (ext !== "pdf") {
    return NextResponse.json({ error: "Only PDF files are accepted." }, { status: 415 });
  }

  const key = `legal-documents/${kind}-${Date.now()}.pdf`;
  const buffer = Buffer.from(await file.arrayBuffer());

  let publicUrl: string;
  try {
    publicUrl = await uploadToR2(key, buffer, "application/pdf");
  } catch (err: unknown) {
    console.error("[legal-documents/upload] R2 upload error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  const settingKey = KIND_TO_KEY[kind];
  await prisma.systemSetting.upsert({
    where: { key: settingKey },
    update: { value: publicUrl },
    create: { key: settingKey, value: publicUrl },
  });

  return NextResponse.json({ url: publicUrl });
}
