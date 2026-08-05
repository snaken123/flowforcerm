import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const members = await prisma.member.findMany({
  select: { id: true, firstName: true, lastName: true, memberNumber: true },
  orderBy: { lastName: "asc" },
});

const services = await prisma.service.findMany({
  select: { id: true, name: true, slug: true },
});

console.log("=== SERVICES ===");
console.log(JSON.stringify(services, null, 2));

console.log("\n=== MEMBERS (" + members.length + " total) ===");
for (const m of members) {
  console.log(`${m.firstName} ${m.lastName} | ${m.memberNumber ?? "no-num"} | ${m.id}`);
}

await prisma.$disconnect();
