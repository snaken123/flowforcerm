import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { sendActivationEmail } from "@/lib/email";
import { manilaDayBoundaries } from "@/lib/time";
import bcrypt from "bcryptjs";
import { z } from "zod";

const schema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  title: z.string().optional(),
  role: z.enum(["ADMIN", "STAFF"]),
  employeeTypes: z.array(z.string()).optional(),
  hireDate: z.string().optional(),
  dateOfBirth: z.string().optional().nullable(),
  belt: z.string().optional().nullable(),
  certifications: z.string().optional().nullable(),
  taughtServiceIds: z.array(z.string()).optional(),
});

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export async function GET(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (!["ADMIN", "STAFF", "STORE"].includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");

  const employees = await prisma.employee.findMany({
    where: q
      ? {
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
          ],
        }
      : {},
    orderBy: { lastName: "asc" },
    select: { id: true, firstName: true, lastName: true, employeeTypes: true },
    take: 20,
  });

  return NextResponse.json(employees);
}

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    include: { employee: true, member: true },
  });
  if (existing) {
    // Block if this user is already an employee or an active member
    if (existing.employee || existing.member) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }
    // Orphaned user (e.g. deleted athlete) — delete it so we can create fresh
    await prisma.user.delete({ where: { id: existing.id } });
  }

  const tempPassword = generateTempPassword();
  const hashedPassword = await bcrypt.hash(tempPassword, 12);
  const employeeTypes = parsed.data.employeeTypes?.length ? parsed.data.employeeTypes : ["STAFF"];

  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      name: `${parsed.data.firstName} ${parsed.data.lastName}`,
      password: hashedPassword,
      role: parsed.data.role,
      mustChangePassword: true,
      employee: {
        create: {
          firstName: parsed.data.firstName,
          lastName: parsed.data.lastName,
          phone: parsed.data.phone || null,
          title: parsed.data.title || null,
          employeeTypes,
          hireDate: parsed.data.hireDate ? manilaDayBoundaries(parsed.data.hireDate).start : undefined,
          dateOfBirth: parsed.data.dateOfBirth ? manilaDayBoundaries(parsed.data.dateOfBirth).start : null,
          belt: parsed.data.belt || null,
          certifications: parsed.data.certifications || null,
        },
      },
    },
    include: { employee: true },
  });

  if (parsed.data.taughtServiceIds?.length && user.employee?.id) {
    await prisma.serviceEmployee.createMany({
      data: parsed.data.taughtServiceIds.map((serviceId) => ({ serviceId, employeeId: user.employee!.id })),
      skipDuplicates: true,
    });
  }

  // Send activation email with temp password
  try {
    await sendActivationEmail({ to: parsed.data.email, firstName: parsed.data.firstName, tempPassword });
  } catch (err: unknown) {
    console.error("[employees/create] Failed to send activation email:", err instanceof Error ? err.message : String(err));
  }

  await logAudit({
    userId: (session.user as any).id,
    userName: session.user?.name ?? session.user?.email ?? "Unknown",
    action: "CREATE_EMPLOYEE",
    entityType: "Employee",
    entityId: user.employee?.id,
    entityName: `${parsed.data.firstName} ${parsed.data.lastName}`,
    description: `Created account for ${parsed.data.firstName} ${parsed.data.lastName}, activation email sent`,
    metadata: { email: parsed.data.email, role: parsed.data.role },
  });

  return NextResponse.json(user.employee, { status: 201 });
}
