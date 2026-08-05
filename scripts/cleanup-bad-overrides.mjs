import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Delete wrong-date one-time overrides created by the old timezone bug (stored as Jul 31 instead of Aug 1)
// and the duplicate Aug 1 Judo override
const toDelete = [
  "cms1rh9wf0001r7bw5oic007v", // Jiujitsu-NoGi, Jul 31 (wrong date)
  "cms1r2nzj00051129ssvhvjbi", // Jiujitsu-NoGi, Jul 31 (wrong date)
  "cms1r35a90001ckahwrnfq8xd", // Judo, Jul 31 (wrong date)
  "cms1rbhl50003ivdagqrq31ig", // Judo, Jul 31 (wrong date)
  "cms1sz5dt0007ryedypkd3ckn", // Judo, Aug 1 duplicate
];

const result = await prisma.classSchedule.deleteMany({ where: { id: { in: toDelete } } });
console.log(`Deleted ${result.count} bad override schedules.`);
await prisma.$disconnect();
