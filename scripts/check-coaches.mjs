import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const schedules = await prisma.classSchedule.findMany({
  include: { coaches: { include: { employee: { select: { firstName: true, lastName: true } } } }, classDef: { select: { name: true } } },
  where: { coaches: { some: {} } }
});
console.log(JSON.stringify(schedules.map(s => ({ class: s.classDef?.name, id: s.id, coaches: s.coaches.map(c => c.employee.firstName + " " + c.employee.lastName) })), null, 2));
await prisma.$disconnect();
