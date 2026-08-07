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

  const [services, orderSetting] = await Promise.all([
    prisma.service.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { subscriptions: true } },
        packages: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
      },
    }),
    prisma.systemSetting.findUnique({ where: { key: "service_order" } }),
  ]);

  // Custom drag-to-reorder order (see /api/admin/settings/service-order), falling back to
  // alphabetical for services created after the order was last saved.
  const order: string[] = orderSetting ? JSON.parse(orderSetting.value) : [];
  const orderIndex = new Map(order.map((id, i) => [id, i]));
  const sortedServices = [...services].sort((a, b) => {
    const ai = orderIndex.has(a.id) ? orderIndex.get(a.id)! : Infinity;
    const bi = orderIndex.has(b.id) ? orderIndex.get(b.id)! : Infinity;
    return ai !== bi ? ai - bi : a.name.localeCompare(b.name);
  });

  return <ServicesClient services={sortedServices} />;
}
