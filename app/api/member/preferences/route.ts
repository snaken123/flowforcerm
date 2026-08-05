import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  athleteIdAsHome: z.boolean(),
});

export async function PATCH(req: NextRequest) {
  const session = await getAuthSession();
  const role = (session?.user as any)?.role;
  if (!session || role !== "MEMBER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const userId = (session.user as any).id;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  await prisma.member.update({
    where: { userId },
    data: { athleteIdAsHome: parsed.data.athleteIdAsHome },
  });
  return NextResponse.json({ ok: true });
}
