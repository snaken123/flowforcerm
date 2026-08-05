import { prisma } from "@/lib/db";
import { WebIntegrationClient } from "./web-integration-client";

export const metadata = { title: "Web Integration" };
export const revalidate = 300;

export default async function WebIntegrationPage() {
  const services = await prisma.service.findMany({
    where: { isActive: true },
    select: {
        id: true, name: true, color: true,
        packages: {
          where: { isActive: true },
          select: { id: true, name: true, sessions: true, validDays: true, memberPrice: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    orderBy: { name: "asc" },
  });

  return <WebIntegrationClient services={services} />;
}
