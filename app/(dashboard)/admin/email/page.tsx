import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { EmailClient } from "./email-client";

export const metadata = { title: "Email" };

export default async function EmailPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login");
  if ((session.user as any).role !== "ADMIN") redirect("/dashboard");

  const userId = (session.user as any).id;
  const integration = await prisma.emailIntegration.findUnique({
    where: { userId },
    select: { provider: true, email: true },
  });

  return <EmailClient integration={integration} />;
}
