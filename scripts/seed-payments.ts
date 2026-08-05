import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // Get a member who has subscriptions
  const member = await prisma.member.findFirst({
    where: { subscriptions: { some: {} } },
    include: {
      subscriptions: { include: { service: true }, take: 3, orderBy: { createdAt: "desc" } },
    },
  });

  if (!member) { console.log("No members with subscriptions found"); return; }

  console.log(`Seeding payments for: ${member.firstName} ${member.lastName}`);

  const subs = member.subscriptions;
  const methods = ["Cash", "GCash", "Card"];

  for (let i = 0; i < subs.length; i++) {
    const sub = subs[i];
    const date = new Date();
    date.setMonth(date.getMonth() - i);

    const payment = await prisma.payment.create({
      data: {
        memberId: member.id,
        subscriptionId: sub.id,
        amount: sub.price,
        status: i === 1 ? "PENDING" : "PAID",
        method: methods[i % methods.length],
        paidAt: date,
      },
    });
    console.log(`  Created: ${sub.service.name} - ${sub.price} ${methods[i % methods.length]} (${payment.status})`);
  }

  console.log("Done.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
