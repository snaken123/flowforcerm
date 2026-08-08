import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { z } from "zod";
import { LEGAL_KEYS } from "@/lib/legal-documents";

const putSchema = z.object({
  waiverText: z.string().min(1).optional(),
  privacyText: z.string().min(1).optional(),
});

export async function PUT(req: NextRequest) {
  const session = await getAuthSession();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const writes: Promise<unknown>[] = [];
  if (parsed.data.waiverText !== undefined) {
    writes.push(prisma.systemSetting.upsert({
      where: { key: LEGAL_KEYS.waiverText },
      update: { value: parsed.data.waiverText },
      create: { key: LEGAL_KEYS.waiverText, value: parsed.data.waiverText },
    }));
  }
  if (parsed.data.privacyText !== undefined) {
    writes.push(prisma.systemSetting.upsert({
      where: { key: LEGAL_KEYS.privacyText },
      update: { value: parsed.data.privacyText },
      create: { key: LEGAL_KEYS.privacyText, value: parsed.data.privacyText },
    }));
  }
  await Promise.all(writes);

  return NextResponse.json({ ok: true });
}
