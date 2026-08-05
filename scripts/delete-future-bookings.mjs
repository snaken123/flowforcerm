import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const result = await prisma.booking.deleteMany({});
console.log(`Deleted ${result.count} bookings`);
await prisma.$disconnect();
