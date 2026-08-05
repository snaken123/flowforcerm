import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { CommunicationsClient } from "./communications-client";

export const metadata = { title: "Communications" };

export default async function CommunicationsPage() {
  const session = await getAuthSession();
  if (!session || (session.user as any).role !== "ADMIN") redirect("/dashboard");

  const [members, services] = await Promise.all([
    prisma.member.findMany({
      select: { id: true, firstName: true, lastName: true, user: { select: { email: true } } },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
    prisma.service.findMany({
      where: { isActive: true },
      select: { id: true, name: true, color: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return <CommunicationsClient members={members} services={services} />;
}
