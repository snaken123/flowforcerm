import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const r = await prisma.shopSale.updateMany({ where: { paymentMode: "" }, data: { paymentMode: null } });
  console.log("Updated", r.count, "records with empty paymentMode to null");
}
main().catch(console.error).finally(() => prisma.$disconnect());
