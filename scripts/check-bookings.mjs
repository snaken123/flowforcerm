import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const bookings = await prisma.booking.findMany({
  where: { status: { not: "CANCELLED" } },
  include: {
    member: { select: { firstName: true, lastName: true } },
    employee: { select: { firstName: true, lastName: true } },
    session: { select: { name: true } },
  },
  orderBy: { createdAt: "desc" },
});

console.log(`Active bookings: ${bookings.length}`);
for (const b of bookings) {
  const who = b.member ? `${b.member.firstName} ${b.member.lastName}` : b.employee ? `${b.employee.firstName} ${b.employee.lastName}` : "Unknown";
  console.log(`  ${who} → ${b.session?.name} | scheduleId: ${b.scheduleId} | scheduledDate: ${b.scheduledDate?.toISOString() ?? "null"}`);
}

await prisma.$disconnect();
