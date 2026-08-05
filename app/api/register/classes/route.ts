import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { manilaDayOfWeek } from "@/lib/time";

const KIDS_KEYWORDS = ["kid", "children", "youth", "junior"];

function hasFreeTrialPackage(packages: { name: string; isActive: boolean }[]) {
  return packages.some(
    (p) => p.isActive && (p.name.toLowerCase().includes("free") || p.name.toLowerCase().includes("trial"))
  );
}

function toManilaDateStr(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" }); // YYYY-MM-DD
}

function generateDates(dayOfWeek: number, startDate: Date | null, endDate: Date | null, exceptions: Date[]): Date[] {
  const dates: Date[] = [];
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() + 14);

  const exSet = new Set(exceptions.map((d) => toManilaDateStr(d)));

  // Start from tomorrow
  const cursor = new Date(now);
  cursor.setDate(cursor.getDate() + 1);
  cursor.setHours(0, 0, 0, 0);

  while (cursor <= cutoff) {
    if (manilaDayOfWeek(cursor) === dayOfWeek) {
      const key = toManilaDateStr(cursor);
      const afterStart = !startDate || cursor >= startDate;
      const beforeEnd = !endDate || cursor <= endDate;
      if (afterStart && beforeEnd && !exSet.has(key)) {
        dates.push(new Date(cursor));
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

export async function GET(req: NextRequest) {
  const kids = req.nextUrl.searchParams.get("kids") === "true";

  const services = await prisma.service.findMany({
    where: { isActive: true, freeTrialEnabled: true },
    include: {
      packages: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  const isKids = (name: string) => KIDS_KEYWORDS.some((k) => name.toLowerCase().includes(k));
  const freeTrialServices = services.filter((s) =>
    kids ? isKids(s.name) && hasFreeTrialPackage(s.packages)
         : !isKids(s.name) && hasFreeTrialPackage(s.packages)
  );

  const serviceIds = freeTrialServices.map((s) => s.id);

  // Find class sessions that allow these services
  const allowedClasses = await prisma.classAllowedService.findMany({
    where: { serviceId: { in: serviceIds } },
    include: {
      classSession: {
        include: {
          schedules: {
            where: { isActive: true },
            include: {
              coaches: { include: { employee: { select: { firstName: true, lastName: true } } } },
              exceptions: true,
            },
          },
        },
      },
      service: { select: { id: true, name: true, color: true } },
    },
  });

  // Build result grouped by service
  const grouped: Record<string, {
    serviceId: string;
    serviceName: string;
    serviceColor: string;
    freePackageId: string | null;
    slots: { scheduleId: string; classSessionId: string; className: string; date: string; startTime: string; endTime: string; location: string | null; coach: string | null }[];
  }> = {};

  for (const svc of freeTrialServices) {
    const freePkg = svc.packages.find((p) =>
      p.name.toLowerCase().includes("free") || p.name.toLowerCase().includes("trial")
    );
    grouped[svc.id] = {
      serviceId: svc.id,
      serviceName: svc.name,
      serviceColor: svc.color,
      freePackageId: freePkg?.id ?? null,
      slots: [],
    };
  }

  for (const ac of allowedClasses) {
    const svcId = ac.serviceId;
    if (!grouped[svcId]) continue;

    for (const schedule of ac.classSession.schedules) {
      const exceptions = schedule.exceptions.map((e) => e.date);
      const dates = generateDates(schedule.dayOfWeek, schedule.startDate, schedule.endDate, exceptions);
      const coach = schedule.coaches[0]?.employee
        ? `${schedule.coaches[0].employee.firstName} ${schedule.coaches[0].employee.lastName}`
        : null;

      for (const date of dates) {
        grouped[svcId].slots.push({
          scheduleId: schedule.id,
          classSessionId: ac.classSessionId,
          className: ac.classSession.name,
          date: toManilaDateStr(date),
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          location: schedule.location,
          coach,
        });
      }
    }
  }

  // Sort slots by date then time
  for (const g of Object.values(grouped)) {
    g.slots.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
    // Deduplicate same schedule+date
    g.slots = g.slots.filter((s, i, arr) =>
      arr.findIndex((x) => x.scheduleId === s.scheduleId && x.date === s.date) === i
    );
  }

  return NextResponse.json(Object.values(grouped).filter((g) => g.slots.length > 0));
}
