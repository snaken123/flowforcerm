import { getAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isAdminOrCoach } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { RecordsTodoLayout } from "./records-todo-layout";

export const metadata = { title: "To Do" };

export default async function RecordsTodoPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login");
  const role = (session.user as any).role;
  if (!["ADMIN", "STAFF"].includes(role)) redirect("/dashboard");

  const [pendingPayments, openFollowUps, services] = await Promise.all([
    prisma.payment.findMany({
      where: { status: "PENDING" },
      include: {
        member: { select: { id: true, firstName: true, lastName: true, memberNumber: true } },
        employee: { select: { id: true, firstName: true, lastName: true } },
        subscription: { include: { service: { select: { name: true, color: true } } } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.freeTrialFollowUp.findMany({
      where: { status: "OPEN" },
      include: {
        member: {
          select: {
            id: true, firstName: true, lastName: true, memberNumber: true,
            subscriptions: {
              where: { isTrial: true },
              select: { id: true, service: { select: { id: true, name: true, color: true } } },
            },
          },
        },
        subscription: { include: { service: { select: { id: true, name: true } } } },
        checkIn: { select: { checkedInAt: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.service.findMany({
      where: { isActive: true },
      include: { packages: { where: { isActive: true }, orderBy: { memberPrice: "asc" } } },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">To Do</h1>
        <p className="text-muted-foreground mt-1">Items that need attention before they&apos;re complete.</p>
      </div>

      <RecordsTodoLayout
        pendingPayments={pendingPayments}
        openFollowUps={openFollowUps}
        services={services}
        canApprove={isAdminOrCoach(session)}
        canApproveFreeze={role === "ADMIN"}
      />
    </div>
  );
}
