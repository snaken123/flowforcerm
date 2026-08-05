import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { sendActivationEmail } from "@/lib/email";

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAuthSession();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const employee = await prisma.employee.findUnique({
    where: { id: params.id },
    include: { user: { select: { id: true, email: true } } },
  });

  if (!employee || !employee.user) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  if (!employee.user.email) {
    return NextResponse.json({ error: "No email address on file." }, { status: 400 });
  }

  const tempPassword = generateTempPassword();
  const hashedPassword = await bcrypt.hash(tempPassword, 12);

  await prisma.user.update({
    where: { id: employee.user.id },
    data: { password: hashedPassword, mustChangePassword: true },
  });

  try {
    await sendActivationEmail({
      to: employee.user.email,
      firstName: employee.firstName,
      tempPassword,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Email send failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
