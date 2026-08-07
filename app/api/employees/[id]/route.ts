import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { manilaDayBoundaries } from "@/lib/time";
import { z } from "zod";

const schema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  title: z.string().optional(),
  role: z.enum(["ADMIN", "STAFF"]),
  employeeTypes: z.array(z.enum(["ADMIN", "STAFF", "COACH"])).min(1),
  isActive: z.boolean().optional(),
  hireDate: z.string().optional(),
  dateOfBirth: z.string().optional().nullable(),
  belt: z.string().optional().nullable(),
  certifications: z.string().optional().nullable(),
  taughtServiceIds: z.array(z.string()).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAuthSession();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const employee = await prisma.employee.findUnique({
    where: { id: params.id },
    include: { user: true },
  });
  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const emailConflict = await prisma.user.findFirst({
    where: { email: parsed.data.email, NOT: { id: employee.userId! } },
    include: { employee: true, member: true },
  });
  if (emailConflict) {
    if (emailConflict.employee || emailConflict.member) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }
    // Orphaned user (e.g. deleted athlete) — remove it so we can take the email
    await prisma.user.delete({ where: { id: emailConflict.id } });
  }

  const [updatedEmp] = await prisma.$transaction([
    prisma.employee.update({
      where: { id: params.id },
      data: {
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        phone: parsed.data.phone || null,
        title: parsed.data.title || null,
        employeeTypes: parsed.data.employeeTypes,
        isActive: parsed.data.isActive,
        hireDate: parsed.data.hireDate ? manilaDayBoundaries(parsed.data.hireDate).start : undefined,
        dateOfBirth: parsed.data.dateOfBirth ? manilaDayBoundaries(parsed.data.dateOfBirth).start : null,
        belt: parsed.data.belt || null,
        certifications: parsed.data.certifications || null,
      },
    }),
    prisma.user.update({
      where: { id: employee.userId! },
      data: {
        email: parsed.data.email,
        name: `${parsed.data.firstName} ${parsed.data.lastName}`,
        role: parsed.data.role,
      },
    }),
  ]);

  // Update taught services
  if (parsed.data.taughtServiceIds !== undefined) {
    await prisma.serviceEmployee.deleteMany({ where: { employeeId: params.id } });
    if (parsed.data.taughtServiceIds.length > 0) {
      await prisma.serviceEmployee.createMany({
        data: parsed.data.taughtServiceIds.map((serviceId) => ({ serviceId, employeeId: params.id })),
        skipDuplicates: true,
      });
    }
  }

  await logAudit({
    userId: (session.user as any).id,
    userName: session.user?.name ?? session.user?.email ?? "Unknown",
    action: "UPDATE_EMPLOYEE",
    entityType: "Employee",
    entityId: params.id,
    entityName: `${parsed.data.firstName} ${parsed.data.lastName}`,
    description: `Updated employee profile for ${parsed.data.firstName} ${parsed.data.lastName}`,
    metadata: { employeeTypes: parsed.data.employeeTypes, isActive: parsed.data.isActive },
  });

  return NextResponse.json(updatedEmp);
}
