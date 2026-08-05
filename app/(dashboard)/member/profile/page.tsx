import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { unfreezeMemberships } from "@/lib/unfreeze-memberships";
import { MemberProfileClient } from "./member-profile-client";

export const metadata = { title: "My Profile" };

export default async function MemberProfilePage() {
  const session = await getAuthSession();
  if (!session) redirect("/login");

  const userId = (session.user as any).id;

  const memberRef = await prisma.member.findUnique({ where: { userId }, select: { id: true } });
  if (!memberRef) redirect("/dashboard");

  await unfreezeMemberships(memberRef.id);

  const member = await prisma.member.findUnique({
    where: { userId },
    include: {
      user: { select: { email: true } },
      subscriptions: {
        include: { service: true },
        orderBy: { createdAt: "desc" },
      },
      rankRecords: { orderBy: { awardedAt: "desc" } },
      payments: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { subscription: { include: { service: true } } },
      },
      bookings: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          session: true,
          subscription: { include: { service: true } },
        },
      },
    },
  });

  if (!member) redirect("/dashboard");

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-bold">My Profile</h1>
      <MemberProfileClient member={member} />
    </div>
  );
}
