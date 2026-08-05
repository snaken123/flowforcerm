import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { AthleteIdClient } from "./athlete-id-client";

export const metadata = { title: "Athlete ID" };

const memberSelect = {
  id: true,
  memberNumber: true,
  firstName: true,
  lastName: true,
  photoUrl: true,
  athleteIdAsHome: true,
} as const;

export default async function AthleteIdPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login");

  const userId = (session.user as any).id;

  const [ownMember, managedMembers] = await Promise.all([
    prisma.member.findUnique({ where: { userId }, select: memberSelect }),
    prisma.member.findMany({ where: { guardianUserId: userId }, select: memberSelect, orderBy: { firstName: "asc" } }),
  ]);

  const profiles = [
    ...(ownMember ? [ownMember] : []),
    ...managedMembers,
  ];

  if (profiles.length === 0) redirect("/dashboard");

  return <AthleteIdClient profiles={profiles} athleteIdAsHome={ownMember?.athleteIdAsHome ?? true} />;
}
