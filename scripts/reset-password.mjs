import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const hash = await bcrypt.hash("Ss771017_01", 12);
const user = await prisma.user.update({
  where: { email: "step.salazar@yahoo.com" },
  data: { password: hash, mustChangePassword: false },
});
console.log("Password reset for:", user.email);
await prisma.$disconnect();
