import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const last = await prisma.member.findFirst({
  where: { memberNumber: { startsWith: "NS-" } },
  orderBy: { memberNumber: "desc" },
  select: { memberNumber: true },
});

const lastNum = last?.memberNumber ? parseInt(last.memberNumber.replace("NS-", ""), 10) : 0;
console.log("Current max member number:", last?.memberNumber ?? "none", "→ lastVal =", lastNum);

await prisma.memberNumberSequence.upsert({
  where: { id: "singleton" },
  update: { lastVal: lastNum },
  create: { id: "singleton", lastVal: lastNum },
});

console.log("Seeded MemberNumberSequence with lastVal =", lastNum);
await prisma.$disconnect();
