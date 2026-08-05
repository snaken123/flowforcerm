import { PrismaClient, Role, MemberStatus, BillingCycle, SubscriptionStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Admin user
  const adminPassword = await bcrypt.hash("admin123", 12);
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@mygym.com" },
    update: {},
    create: {
      email: "admin@mygym.com",
      name: "Gym Admin",
      password: adminPassword,
      role: Role.ADMIN,
    },
  });

  // Staff user
  const staffPassword = await bcrypt.hash("staff123", 12);
  const staffUser = await prisma.user.upsert({
    where: { email: "staff@mygym.com" },
    update: {},
    create: {
      email: "staff@mygym.com",
      name: "Front Desk",
      password: staffPassword,
      role: Role.STAFF,
      employee: {
        create: {
          firstName: "Front",
          lastName: "Desk",
          title: "Front Desk Staff",
          hireDate: new Date("2023-01-01"),
        },
      },
    },
  });

  // Services
  const bjj = await prisma.service.upsert({
    where: { slug: "bjj" },
    update: {},
    create: {
      name: "Brazilian Jiu-Jitsu",
      slug: "bjj",
      description: "Ground-based grappling martial art focused on submissions and positional control.",
      category: "Martial Arts",
      color: "#3B82F6",
      monthlyPrice: 120,
      dropInPrice: 20,
    },
  });

  const muayThai = await prisma.service.upsert({
    where: { slug: "muay-thai" },
    update: {},
    create: {
      name: "Muay Thai",
      slug: "muay-thai",
      description: "Stand-up striking art using fists, elbows, knees, and kicks.",
      category: "Martial Arts",
      color: "#EF4444",
      monthlyPrice: 110,
      dropInPrice: 18,
    },
  });

  const mma = await prisma.service.upsert({
    where: { slug: "mma" },
    update: {},
    create: {
      name: "MMA",
      slug: "mma",
      description: "Mixed Martial Arts combining striking and grappling.",
      category: "Martial Arts",
      color: "#8B5CF6",
      monthlyPrice: 130,
      dropInPrice: 22,
    },
  });

  const kidsClass = await prisma.service.upsert({
    where: { slug: "kids-bjj" },
    update: {},
    create: {
      name: "Kids BJJ",
      slug: "kids-bjj",
      description: "Brazilian Jiu-Jitsu for children ages 5–14.",
      category: "Kids",
      color: "#F59E0B",
      monthlyPrice: 90,
      dropInPrice: 15,
    },
  });

  // Schedules for BJJ
  const bjjSchedules = [
    { dayOfWeek: 1, startTime: "06:00", endTime: "07:00", location: "Mat A" },
    { dayOfWeek: 1, startTime: "19:00", endTime: "20:30", location: "Mat A" },
    { dayOfWeek: 3, startTime: "19:00", endTime: "20:30", location: "Mat A" },
    { dayOfWeek: 5, startTime: "06:00", endTime: "07:00", location: "Mat A" },
    { dayOfWeek: 6, startTime: "10:00", endTime: "11:30", location: "Mat A" },
  ];

  for (const s of bjjSchedules) {
    await prisma.classSchedule.create({ data: { classId: bjj.id, ...s } });
  }

  // Sample members
  const memberData = [
    { firstName: "Carlos", lastName: "Santos", email: "carlos@example.com" },
    { firstName: "Maria", lastName: "Rivera", email: "maria@example.com" },
    { firstName: "Jake", lastName: "Thompson", email: "jake@example.com" },
    { firstName: "Aisha", lastName: "Patel", email: "aisha@example.com" },
    { firstName: "Tom", lastName: "Chen", email: "tom@example.com" },
  ];

  const memberPassword = await bcrypt.hash("member123", 12);

  for (const m of memberData) {
    const user = await prisma.user.upsert({
      where: { email: m.email },
      update: {},
      create: {
        email: m.email,
        name: `${m.firstName} ${m.lastName}`,
        password: memberPassword,
        role: Role.MEMBER,
        member: {
          create: {
            firstName: m.firstName,
            lastName: m.lastName,
            phone: "+1 555-0100",
            status: MemberStatus.ACTIVE,
            joinDate: new Date("2024-01-15"),
            waiverSigned: true,
            waiverDate: new Date("2024-01-15"),
            subscriptions: {
              create: {
                serviceId: bjj.id,
                status: SubscriptionStatus.ACTIVE,
                billingCycle: BillingCycle.MONTHLY,
                price: 120,
                startDate: new Date("2024-01-15"),
                nextBillDate: new Date("2025-02-15"),
              },
            },
          },
        },
      },
    });
  }

  console.log("Seed complete.");
  console.log("\nLogin credentials:");
  console.log("  Admin:  admin@mygym.com  / admin123");
  console.log("  Staff:  staff@mygym.com  / staff123");
  console.log("  Member: carlos@example.com / member123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
