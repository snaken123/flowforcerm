import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Find all bookings with no scheduledDate — these are legacy bookings
// that pre-date the scheduledDate field and can't be scoped to a specific
// recurring occurrence. They cause stale "ghost" bookings on every occurrence.
const bookings = await prisma.booking.findMany({
  where: { scheduledDate: null, status: { not: "CANCELLED" } },
  include: {
    member: { select: { firstName: true, lastName: true } },
    employee: { select: { firstName: true, lastName: true } },
    session: { select: { name: true } },
  },
});

console.log(`Found ${bookings.length} null-date bookings:`);
for (const b of bookings) {
  const who = b.member ? `${b.member.firstName} ${b.member.lastName}` : b.employee ? `${b.employee.firstName} ${b.employee.lastName}` : "Unknown";
  console.log(`  - ${who} → ${b.session?.name ?? "?"} (id: ${b.id})`);
}

if (bookings.length === 0) {
  console.log("Nothing to clean up.");
  await prisma.$disconnect();
  process.exit(0);
}

const result = await prisma.booking.updateMany({
  where: { scheduledDate: null, status: { not: "CANCELLED" } },
  data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: "Legacy booking without scheduledDate — cancelled during cleanup" },
});

console.log(`\nCancelled ${result.count} bookings.`);
await prisma.$disconnect();
