import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { z } from "zod";

const schema = z.object({ newPassword: z.string().min(8) });

async function generateEmployeeNumber(): Promise<string> {
  const last = await prisma.employee.findFirst({
    where: { employeeNumber: { not: null } },
    orderBy: { employeeNumber: "desc" },
    select: { employeeNumber: true },
  });
  const lastNum = last?.employeeNumber
    ? parseInt(last.employeeNumber.replace("EM-", ""), 10)
    : 0;
  return `EM-${String(lastNum + 1).padStart(5, "0")}`;
}

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id as string;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });

  const hashed = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashed, mustChangePassword: false },
  });

  // Assign employee number on first activation (if employee and not yet assigned)
  const employee = await prisma.employee.findUnique({
    where: { userId },
    select: { id: true, employeeNumber: true },
  });
  if (employee && !employee.employeeNumber) {
    const employeeNumber = await generateEmployeeNumber();
    await prisma.employee.update({
      where: { id: employee.id },
      data: { employeeNumber },
    });
  }

  return NextResponse.json({ ok: true });
}
