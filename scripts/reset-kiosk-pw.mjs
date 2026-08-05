import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
const hash = await bcrypt.hash('Kiosk2024', 10);
await prisma.user.update({
  where: { email: 'kiosk@flowforcerm.com' },
  data: { password: hash },
});
console.log('Password updated.');
await prisma.$disconnect();
