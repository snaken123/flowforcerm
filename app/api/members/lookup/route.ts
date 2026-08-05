import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { manilaDayOfWeek } from "@/lib/time";

// GET /api/members/lookup?q=NS-00001  (athlete ID or member UUID)
export async function GET(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (!["ADMIN", "STAFF", "KIOSK"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ error: "Missing query" }, { status: 400 });

  const member = await prisma.member.findFirst({
    where: { OR: [{ memberNumber: q }, { id: q }] },
    include: {
      user: { select: { email: true } },
      subscriptions: {
        where: { status: { in: ["ACTIVE", "PAUSED"] }, OR: [{ endDate: null }, { endDate: { gte: new Date() } }] },
        include: { service: true },
        orderBy: { startDate: "desc" },
      },
      checkIns: { orderBy: { checkedInAt: "desc" }, take: 1 },
    },
  });

  if (!member) return NextResponse.json({ error: "Athlete not found" }, { status: 404 });

  // Find today's classes the member can attend based on their active subscriptions
  const todayDow = manilaDayOfWeek();
  const activeServiceIds = member.subscriptions
    .filter((s) => s.status === "ACTIVE")
    .map((s) => s.serviceId);

  let todaySchedules: any[] = [];
  if (activeServiceIds.length > 0) {
    const now = new Date();
    // Get schedules for today that are active and within their date range
    const schedules = await prisma.classSchedule.findMany({
      where: {
        dayOfWeek: todayDow,
        isActive: true,
        OR: [{ startDate: null }, { startDate: { lte: now } }],
        AND: [{ OR: [{ endDate: null }, { endDate: { gte: now } }] }],
      },
      include: {
        classDef: {
          select: {
            id: true,
            name: true,
            color: true,
            allowedServices: { select: { serviceId: true } },
          },
        },
      },
      orderBy: { startTime: "asc" },
    });

    todaySchedules = schedules
      .filter((cs) => {
        // Include if no service restriction, or if member has a matching service
        const allowed = cs.classDef?.allowedServices.map((a) => a.serviceId) ?? [];
        return allowed.length === 0 || allowed.some((sid) => activeServiceIds.includes(sid));
      })
      .map((cs) => ({
        scheduleId: cs.id,
        classId: cs.classDef?.id ?? cs.classId,
        name: cs.classDef?.name ?? "",
        color: cs.classDef?.color ?? "",
        startTime: cs.startTime,
        endTime: cs.endTime,
        location: cs.location,
        maxCapacity: cs.maxCapacity,
      }));
  }

  return NextResponse.json({ ...member, todayClasses: todaySchedules });
}
