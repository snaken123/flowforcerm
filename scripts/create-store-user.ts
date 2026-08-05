import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("Store2024", 12);
  const user = await prisma.user.upsert({
    where: { email: "store@northsouth.com.ph" },
    update: { password, role: "STORE" as any, name: "Store" },
    create: {
      email: "store@northsouth.com.ph",
      name: "Store",
      password,
      role: "STORE" as any,
    },
  });
  console.log("Store user created:", user.email);
}

main().catch(console.error).finally(() => prisma.$disconnect());
