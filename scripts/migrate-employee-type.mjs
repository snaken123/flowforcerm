// Migration: Ensure each employee's employeeType value is present in their employeeTypes array.
// Run once before removing the employeeType field from the schema.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const employees = await prisma.employee.findMany({
    select: { id: true, employeeType: true, employeeTypes: true },
  });

  let updated = 0;
  for (const emp of employees) {
    if (!emp.employeeType) continue;
    const typeStr = emp.employeeType.toString();
    if (!emp.employeeTypes.includes(typeStr)) {
      await prisma.employee.update({
        where: { id: emp.id },
        data: { employeeTypes: { push: typeStr } },
      });
      console.log(`Updated employee ${emp.id}: added ${typeStr} to employeeTypes`);
      updated++;
    }
  }

  console.log(`Done. Updated ${updated} of ${employees.length} employees.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
