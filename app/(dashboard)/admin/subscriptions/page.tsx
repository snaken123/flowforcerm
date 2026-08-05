import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SubscriptionsClient } from "./subscriptions-client";

export const metadata = { title: "Subscriptions" };

const PAGE_SIZE = 100;

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const session = await getAuthSession();
  if (!session) redirect("/login");
  if ((session.user as any).role !== "ADMIN") redirect("/dashboard");

  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));

  const [subscriptions, total, members, services] = await Promise.all([
    prisma.subscription.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        member: { select: { id: true, firstName: true, lastName: true, memberNumber: true } },
        employee: { select: { firstName: true, lastName: true } },
        service: true,
        payments: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.subscription.count(),
    prisma.member.findMany({ orderBy: { lastName: "asc" }, select: { id: true, firstName: true, lastName: true } }),
    prisma.service.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <SubscriptionsClient
      subscriptions={subscriptions}
      members={members}
      services={services}
      page={page}
      total={total}
      pageSize={PAGE_SIZE}
    />
  );
}
