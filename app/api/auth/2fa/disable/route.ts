import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

// POST — disable 2FA (requires current password to confirm)
export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { password } = await req.json();
  if (!password) return NextResponse.json({ error: "Password is required." }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    select: { password: true, totpEnabled: true },
  });

  if (!user?.password) return NextResponse.json({ error: "Cannot verify password." }, { status: 400 });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return NextResponse.json({ error: "Incorrect password." }, { status: 401 });

  await prisma.user.update({
    where: { id: (session.user as any).id },
    data: { totpEnabled: false, totpSecret: null },
  });

  return NextResponse.json({ ok: true });
}
