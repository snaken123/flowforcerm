import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { EmployeesClient } from "./employees-client";

export const metadata = { title: "Employees" };
export const revalidate = 300;

export default async function EmployeesPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login");
  if ((session.user as any).role !== "ADMIN") redirect("/dashboard");

  const [employees, services] = await Promise.all([
    prisma.employee.findMany({
      orderBy: { lastName: "asc" },
      include: {
        user: { select: { email: true, role: true } },
        taughtServices: { include: { service: true } },
      },
    }),
    prisma.service.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, color: true } }),
  ]);

  return <EmployeesClient employees={employees} services={services} />;
}
