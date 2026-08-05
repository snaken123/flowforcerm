import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const u = await prisma.user.findUnique({
    where: { email: "step.salazar@yahoo.com" },
    include: { member: true },
  });

  console.log("user.name:", u?.name);
  console.log("member:", u?.member?.firstName, u?.member?.lastName);

  if (u?.member) {
    const fullName = `${u.member.firstName} ${u.member.lastName}`;
    await prisma.user.update({
      where: { email: "step.salazar@yahoo.com" },
      data: { name: fullName },
    });
    console.log("Updated user.name to:", fullName);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
