import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { MemberCalendar } from "./member-calendar";

export const metadata = { title: "Available Classes" };

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
  // sessionId (= ClassSession.id, aka Booking.sessionId) -> the service ids allowed to
  // book it. An empty array means "open to any active subscription" (matches the
  // `allowedServices: { none: {} }` branch below) -- the booking flow needs this so it
  // can pick the subscription that actually matches the class being booked, instead of
  // always defaulting to the member's first subscription regardless of sport.
  const sessionServiceMap: Record<string, string[]> = {};
  if (serviceIds.length > 0) {
    const rows = await prisma.classSession.findMany({
      where: {
        OR: [
          { allowedServices: { none: {} } },
          { allowedServices: { some: { serviceId: { in: serviceIds } } } },
        ],
      },
      select: { id: true, allowedServices: { select: { serviceId: true } } },
    });
    accessibleClassIds.push(...rows.map((r) => r.id));
    for (const r of rows) sessionServiceMap[r.id] = r.allowedServices.map((a) => a.serviceId);
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
      subscriptions={member?.subscriptions ?? []}
      sessionServiceMap={sessionServiceMap}
      existingBookings={member?.bookings ?? []}
    />
  );
}
