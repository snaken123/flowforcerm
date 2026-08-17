import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireFeature, FLAG_SPECIALIZED_ROLES } from "@/lib/feature-flags";

const schema = z.object({
  account: z.enum(["kiosk", "store"]),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  adminPassword: z.string().min(1, "Admin password is required"),
});

export async function POST(req: NextRequest) {
  const gate = requireFeature(FLAG_SPECIALIZED_ROLES);
  if (gate) return gate;

  const session = await getAuthSession();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // Verify admin password
  const admin = await prisma.user.findUnique({
    where: { email: session.user!.email! },
    select: { password: true },
  });
  if (!admin?.password) return NextResponse.json({ error: "Cannot verify password" }, { status: 400 });

  const valid = await bcrypt.compare(parsed.data.adminPassword, admin.password);
  if (!valid) return NextResponse.json({ error: "Incorrect admin password" }, { status: 401 });

  const roleMap: Record<string, string> = { kiosk: "KIOSK", store: "STORE" };
  const targetRole = roleMap[parsed.data.account];

  const targetUser = await prisma.user.findFirst({ where: { role: targetRole as any } });
  if (!targetUser) return NextResponse.json({ error: `No ${parsed.data.account} account found` }, { status: 404 });

  const hashed = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.user.update({ where: { id: targetUser.id }, data: { password: hashed } });

  return NextResponse.json({ success: true });
}

export async function GET() {
  const gate = requireFeature(FLAG_SPECIALIZED_ROLES);
  if (gate) return gate;

  const session = await getAuthSession();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [kiosk, store] = await Promise.all([
    prisma.user.findFirst({ where: { role: "KIOSK" as any }, select: { email: true, updatedAt: true } }),
    prisma.user.findFirst({ where: { role: "STORE" as any }, select: { email: true, updatedAt: true } }),
  ]);

  return NextResponse.json({ kiosk, store });
}
