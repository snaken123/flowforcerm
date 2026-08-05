import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("Coach2024", 12);
  const user = await prisma.user.upsert({
    where: { email: "coach@flowforcerm.com" },
    update: { password, role: "STAFF", name: "Coach" },
    create: {
      email: "coach@flowforcerm.com",
      name: "Coach",
      password,
      role: "STAFF",
      employee: {
        create: {
          firstName: "NS",
          lastName: "Coach",
          title: "Coach",
          employeeTypes: ["COACH"],
          hireDate: new Date(),
        },
      },
    },
  });
  console.log("Coach user created:", user.email);
}

main().catch(console.error).finally(() => prisma.$disconnect());
