import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { MemberDetailClient } from "./member-detail-client";
export default async function MemberDetailPage({ params }: { params: { id: string } }) {
  const session = await getAuthSession();
  if (!session) redirect("/login");
  const role = (session.user as any).role;
  if (!["ADMIN", "STAFF", "STORE"].includes(role)) redirect("/dashboard");

  const member = await prisma.member.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { email: true, role: true } },
      guardian: { select: { id: true, name: true, email: true } },
      subscriptions: {
        include: { service: true, payments: { orderBy: { createdAt: "desc" }, take: 3 } },
        orderBy: { createdAt: "desc" },
      },
      checkIns: { orderBy: { checkedInAt: "desc" }, take: 20 },
      rankRecords: { orderBy: { awardedAt: "desc" } },
      payments: { orderBy: { createdAt: "desc" }, take: 20, include: { subscription: { include: { service: true } } } },
      bookings: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          session: { include: { allowedServices: { include: { service: true } } } },
          schedule: { select: { startTime: true, endTime: true } },
          subscription: { include: { service: true } },
          bookedBy: { select: { name: true, email: true } },
        },
      },
    },
  });

  if (!member) notFound();

  const [services, freeTrialFollowUps] = await Promise.all([
    prisma.service.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: { packages: { where: { isActive: true }, orderBy: { sortOrder: "asc" } } },
    }),
    prisma.freeTrialFollowUp.findMany({
      where: { memberId: params.id },
      include: {
        subscription: { include: { service: { select: { name: true } } } },
        resolvedBy: { select: { name: true, email: true } },
        checkIn: { select: { checkedInAt: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return <MemberDetailClient member={member} services={services} freeTrialFollowUps={freeTrialFollowUps} isAdmin={role === "ADMIN"} isStaff={role === "STAFF" || role === "STORE"} />;
}
