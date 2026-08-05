import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ClassesClient } from "./classes-client";

export const metadata = { title: "Classes" };
export const revalidate = 300;

export default async function ClassesPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login");
  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "STAFF") redirect("/dashboard");

  const [sessions, services] = await Promise.all([
    prisma.classSession.findMany({
      orderBy: { name: "asc" },
      take: 100,
      include: {
        allowedServices: {
          include: { service: { select: { id: true, name: true, color: true } } },
        },
        _count: { select: { bookings: true } },
      },
    }),
    prisma.service.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, color: true },
    }),
  ]);

  return <ClassesClient sessions={sessions} services={services} isAdmin={role === "ADMIN"} />;
}
