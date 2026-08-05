import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.booking.deleteMany({
    where: { scheduleId: null, status: "CONFIRMED" },
  });
  console.log(`Deleted ${result.count} bookings without a scheduleId`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
