import { getAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { EmployeeDetailClient } from "./employee-detail-client";

export default async function EmployeeDetailPage({ params }: { params: { id: string } }) {
  const session = await getAuthSession();
  if (!session) redirect("/login");
  const role = (session.user as any).role;
  if (!["ADMIN", "STAFF"].includes(role)) redirect("/dashboard");

  const employee = await prisma.employee.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { email: true } },
      taughtServices: { include: { service: { select: { id: true, name: true, color: true } } } },
      subscriptions: {
        include: { service: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!employee) redirect("/admin/employees");

  return (
    <EmployeeDetailClient
      employee={employee}
      isAdmin={role === "ADMIN"}
    />
  );
}
