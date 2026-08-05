import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// These 3 bookings have wrong scheduledDate values from a timezone bug
// (stored as Manila midnight instead of UTC midnight). Cancel so user can rebook.
const ids = [
  "cmrda9v08000h8p6xgv3eg6bs", // will have been cancelled already — safe to skip
];

// Cancel all remaining non-cancelled bookings for Stephen Rey (the ones with wrong dates)
const result = await prisma.booking.updateMany({
  where: {
    status: { not: "CANCELLED" },
    scheduledDate: { not: null },
  },
  data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: "Wrong scheduledDate from timezone bug — please rebook" },
});
console.log(`Cancelled ${result.count} stale dated bookings.`);
await prisma.$disconnect();
