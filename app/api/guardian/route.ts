import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { z } from "zod";

const createGuardianSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});

// Search existing users that could be guardians (no member record or already a guardian)
export async function GET(req: NextRequest) {
  const session = await getAuthSession();
  if (!session || !["ADMIN", "STAFF", "STORE"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const q = new URL(req.url).searchParams.get("q") ?? "";
  if (!q) return NextResponse.json([]);

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
      ],
      role: "MEMBER",
    },
    select: { id: true, name: true, email: true, member: { select: { id: true, firstName: true, lastName: true } } },
    take: 10,
  });

  return NextResponse.json(users);
}

// Create a guardian-only User account (no Member record)
export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session || !["ADMIN", "STAFF"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createGuardianSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 409 });

  const tempPassword = Array.from({ length: 10 }, () =>
    "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"[Math.floor(Math.random() * 56)]
  ).join("");
  const hashedPassword = await bcrypt.hash(tempPassword, 12);

  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      password: hashedPassword,
      role: "MEMBER",
      mustChangePassword: true,
    },
    select: { id: true, name: true, email: true },
  });

  return NextResponse.json({ user, tempPassword }, { status: 201 });
}
