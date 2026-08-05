import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { MemberCalendar } from "./member-calendar";

export const metadata = { title: "My Schedule" };

export default async function MemberSchedulePage() {
  const session = await getAuthSession();
  if (!session) redirect("/login");

  const userId = (session.user as any).id;

  const member = await prisma.member.findUnique({
    where: { userId },
    select: {
      id: true,
      subscriptions: {
        where: { status: "ACTIVE" },
        select: { id: true, serviceId: true },
      },
      bookings: {
        where: { status: { in: ["CONFIRMED", "ATTENDED"] } },
        select: { id: true, sessionId: true, scheduleId: true, status: true },
      },
    },
  });

  const serviceIds = member?.subscriptions.map((s) => s.serviceId) ?? [];

  const accessibleClassIds: string[] = [];
  if (serviceIds.length > 0) {
    const rows = await prisma.classSession.findMany({
      where: {
        OR: [
          { allowedServices: { none: {} } },
          { allowedServices: { some: { serviceId: { in: serviceIds } } } },
        ],
      },
      select: { id: true },
    });
    accessibleClassIds.push(...rows.map((r) => r.id));
  }

  const schedules = accessibleClassIds.length === 0 ? [] : await prisma.classSchedule.findMany({
    where: {
      isActive: true,
      classId: { in: accessibleClassIds },
    },
    include: {
      classDef: { select: { name: true, location: true, color: true } },
      coaches: { include: { employee: { select: { firstName: true, lastName: true } } } },
      exceptions: { select: { date: true } },
    },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  return (
    <MemberCalendar
      schedules={JSON.parse(JSON.stringify(schedules))}
      hasActiveMembership={serviceIds.length > 0}
      memberId={member?.id ?? ""}
      subscriptionId={member?.subscriptions[0]?.id ?? ""}
      existingBookings={member?.bookings ?? []}
    />
  );
}
