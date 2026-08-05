import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const user = await prisma.user.create({
  data: {
    email: 'kiosk@flowforcerm.com',
    name: 'Kiosk',
    password: '$2a$10$FDBgutE0ifr7HSXSWbawHeNKKiG4NLttUqHtyqgls/dpWRhHdUO26',
    role: 'KIOSK',
  },
});
console.log('Created:', user.email, user.role);
await prisma.$disconnect();
