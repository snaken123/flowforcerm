import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Aug 1 is a Saturday (dayOfWeek=6)
// Check all schedules that could appear on Aug 1
const schedules = await prisma.classSchedule.findMany({
  where: { isActive: true },
  include: {
    classDef: { select: { name: true } },
    coaches: { include: { employee: { select: { firstName: true, lastName: true } } } },
    exceptions: { select: { date: true } },
  },
  orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
});

console.log("=== ALL ACTIVE SCHEDULES ===");
for (const s of schedules) {
  const coachNames = s.coaches.map(c => `${c.employee.firstName} ${c.employee.lastName}`).join(", ") || "none";
  const excDates = s.exceptions.map(e => new Date(e.date).toISOString().slice(0,10)).join(", ") || "none";
  console.log(`[${s.id}] ${s.classDef?.name} | dow=${s.dayOfWeek} ${s.startTime}-${s.endTime} | recurring=${s.isRecurring} | startDate=${s.startDate?.toISOString().slice(0,10) ?? "null"} | endDate=${s.endDate?.toISOString().slice(0,10) ?? "null"} | coaches=${coachNames} | exceptions=${excDates}`);
}

// Check bookings
const bookings = await prisma.booking.findMany({
  where: { status: { not: "CANCELLED" } },
  include: {
    member: { select: { firstName: true, lastName: true } },
    employee: { select: { firstName: true, lastName: true } },
    session: { select: { name: true } },
  },
});
console.log(`\n=== ACTIVE BOOKINGS (${bookings.length}) ===`);
for (const b of bookings) {
  const who = b.member ? `${b.member.firstName} ${b.member.lastName}` : b.employee ? `${b.employee.firstName} ${b.employee.lastName}` : "?";
  console.log(`  ${who} → ${b.session?.name} | scheduleId=${b.scheduleId} | scheduledDate=${b.scheduledDate?.toISOString() ?? "null"}`);
}

await prisma.$disconnect();
