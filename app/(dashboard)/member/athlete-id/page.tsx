import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { AthleteIdClient } from "./athlete-id-client";

export const metadata = { title: "Athlete ID" };

// Not `as const` on the whole object -- Prisma infers a readonly-array type for the
// nested `subscriptions.where.status` filter that way, which then fails to satisfy
// findMany's expected input type at the call sites below. Only the status literal
// itself needs `as const` so Prisma narrows it to the enum member, not `string`.
const memberSelect = {
  id: true,
  memberNumber: true,
  firstName: true,
  lastName: true,
  photoUrl: true,
  athleteIdAsHome: true,
  subscriptions: {
    where: { status: "ACTIVE" as const },
    select: { service: { select: { name: true } } },
  },
};

export default async function AthleteIdPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login");

  const userId = (session.user as any).id;

  const [ownMember, managedMembers, annualService] = await Promise.all([
    prisma.member.findUnique({ where: { userId }, select: memberSelect }),
    prisma.member.findMany({ where: { guardianUserId: userId }, select: memberSelect, orderBy: { firstName: "asc" } }),
    // Same "annual" name match already used for the logbook's badge (hasAnnualSub in
    // components/dashboard/logbook-card.tsx) -- kept consistent rather than reinvented here.
    prisma.service.findFirst({ where: { name: { contains: "annual", mode: "insensitive" } }, select: { isActive: true } }),
  ]);
  const annualMembershipActive = annualService?.isActive ?? false;

  // The white/yellow distinction exists to flag "this athlete doesn't have the premium
  // (annual) option" -- once the gym has turned Annual Membership off entirely, that
  // distinction has nothing to flag, so it falls back to just "has any active membership".
  function toProfile(m: NonNullable<typeof ownMember>) {
    const { subscriptions, ...rest } = m;
    const whiteCard = annualMembershipActive
      ? subscriptions.some((s) => s.service.name.toLowerCase().includes("annual"))
      : subscriptions.length > 0;
    return { ...rest, whiteCard };
  }

  const profiles = [
    ...(ownMember ? [toProfile(ownMember)] : []),
    ...managedMembers.map(toProfile),
  ];

  if (profiles.length === 0) redirect("/dashboard");

  return <AthleteIdClient profiles={profiles} athleteIdAsHome={ownMember?.athleteIdAsHome ?? true} />;
}
