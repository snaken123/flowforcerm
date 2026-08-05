import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ServicesClient } from "./services-client";

export const metadata = { title: "Memberships" };
export const revalidate = 300;

export default async function ServicesPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login");
  if ((session.user as any).role !== "ADMIN") redirect("/dashboard");

  const services = await prisma.service.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { subscriptions: true } },
      packages: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
    },
  });

  return <ServicesClient services={services} />;
}
