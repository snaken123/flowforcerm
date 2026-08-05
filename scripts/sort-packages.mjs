import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const services = await prisma.service.findMany({ select: { id: true, name: true } });
  for (const svc of services) {
    const pkgs = await prisma.servicePackage.findMany({
      where: { serviceId: svc.id, isActive: true },
      orderBy: [{ memberPrice: "asc" }, { nonMemberPrice: "asc" }],
    });
    for (let i = 0; i < pkgs.length; i++) {
      await prisma.servicePackage.update({ where: { id: pkgs[i].id }, data: { sortOrder: i } });
    }
    console.log(`${svc.name}: sorted ${pkgs.length} packages`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
