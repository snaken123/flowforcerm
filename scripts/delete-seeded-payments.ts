import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const payments = await prisma.payment.findMany({
    include: { member: { select: { firstName: true, lastName: true } } },
  });

  console.log(`Total payments: ${payments.length}`);
  payments.forEach((p) => console.log(`  ${p.member?.firstName ?? "?"} ${p.member?.lastName ?? "?"} - ${p.amount} ${p.status} ${p.method}`));

  if (payments.length > 0) {
    const deleted = await prisma.payment.deleteMany({});
    console.log(`Deleted ${deleted.count} payments`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
