import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ReportsClient } from "./reports-client";
import { manilaDateStr, manilaDayBoundaries } from "@/lib/time";
import { getTenantTimezone } from "@/lib/tenant-context";

export const metadata = { title: "Reports" };
export const revalidate = 300;

export default async function ReportsPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login");
  if ((session.user as any).role !== "ADMIN") redirect("/dashboard");

  const now = new Date();
  const tenantTimeZone = getTenantTimezone();

  // Date range for the 6-month member window
  const sixMonthsStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const endOfThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  // Date range for the 7-day check-in window (tenant-local day boundaries)
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const checkInStart = manilaDayBoundaries(manilaDateStr(sevenDaysAgo, tenantTimeZone), tenantTimeZone).start;
  const checkInEnd = manilaDayBoundaries(manilaDateStr(now, tenantTimeZone), tenantTimeZone).end;

  const [memberRecords, checkInRecords, services, statusGroups, totalRevenue] =
    await Promise.all([
      // Single query replacing 6 individual member.count() calls
      prisma.member.findMany({
        where: { joinDate: { gte: sixMonthsStart, lt: endOfThisMonth } },
        select: { joinDate: true },
      }),
      // Single query replacing 7 individual checkIn.count() calls
      prisma.checkIn.findMany({
        where: { checkedInAt: { gte: checkInStart, lte: checkInEnd } },
        select: { checkedInAt: true },
      }),
      prisma.service.findMany({
        include: { _count: { select: { subscriptions: { where: { status: "ACTIVE" } } } } },
        orderBy: { name: "asc" },
      }),
      prisma.member.groupBy({
        by: ["status"],
        _count: true,
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: "PAID" },
      }),
    ]);

  // Bucket member records into 6 monthly slots in application code
  const monthlyData = Array.from({ length: 6 }).map((_, i) => {
    const month = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const nextMonth = new Date(month.getFullYear(), month.getMonth() + 1, 1);
    const count = memberRecords.filter(
      (m) => m.joinDate >= month && m.joinDate < nextMonth
    ).length;
    return {
      month: month.toLocaleDateString("en-US", {
        timeZone: tenantTimeZone,
        month: "short",
        year: "2-digit",
      }),
      newMembers: count,
    };
  });

  // Bucket check-in records into 7 daily slots in application code
  const checkInData = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    const dayStr = manilaDateStr(d, tenantTimeZone);
    const { start, end } = manilaDayBoundaries(dayStr, tenantTimeZone);
    const count = checkInRecords.filter(
      (c) => c.checkedInAt >= start && c.checkedInAt <= end
    ).length;
    return {
      day: start.toLocaleDateString("en-US", { timeZone: tenantTimeZone, weekday: "short" }),
      checkIns: count,
    };
  });

  const serviceData = services.map((s) => ({
    name: s.name,
    color: s.color,
    members: s._count.subscriptions,
  }));

  const statusData = statusGroups.map((g) => ({ status: g.status, count: g._count }));

  return (
    <ReportsClient
      monthlyData={monthlyData}
      serviceData={serviceData}
      statusData={statusData}
      checkInData={checkInData}
      totalRevenue={Number(totalRevenue._sum.amount ?? 0)}
    />
  );
}
