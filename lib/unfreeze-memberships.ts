import { prisma } from "@/lib/db";

/**
 * Checks for frozen memberships whose frozenUntil has passed.
 * Restores them to ACTIVE, extends endDate by frozen duration,
 * then recalculates the athlete's status.
 */
export async function unfreezeMemberships(memberId: string) {
  const now = new Date();

  const expired = await prisma.subscription.findMany({
    where: {
      memberId,
      status: "PAUSED",
      frozenUntil: { lte: now },
    },
  });

  for (const sub of expired) {
    // Extend endDate by the configured freeze duration (frozenUntil - frozenAt),
    // not by actual elapsed time, to honour the freeze period that was set.
    const frozenDays = sub.frozenAt && sub.frozenUntil
      ? Math.ceil((sub.frozenUntil.getTime() - sub.frozenAt.getTime()) / 86400000)
      : 0;
    const newEndDate = sub.endDate
      ? new Date(sub.endDate.getTime() + frozenDays * 86400000)
      : undefined;

    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: "ACTIVE",
        frozenAt: null,
        frozenUntil: null,
        ...(newEndDate ? { endDate: newEndDate } : {}),
      },
    });
  }

  if (expired.length === 0) return;

  // Recalculate athlete status
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: {
      status: true,
      subscriptions: {
        where: {
          status: "ACTIVE",
          OR: [{ endDate: null }, { endDate: { gt: now } }],
        },
        select: { sessionsTotal: true, sessionsUsed: true },
      },
    },
  });

  if (!member) return;

  const hasValid = member.subscriptions.some(
    (s) => s.sessionsTotal === null || s.sessionsUsed < s.sessionsTotal
  );

  await prisma.member.update({
    where: { id: memberId },
    data: { status: hasValid ? "ACTIVE" : "INACTIVE" },
  });
}
