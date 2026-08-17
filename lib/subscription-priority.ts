// Shared by member-detail-client.tsx, member-profile-client.tsx, and dashboard/page.tsx --
// all three independently reimplemented the same "annual plans first" subscription sort.
export const ANNUAL_SUBSCRIPTION_THRESHOLD_DAYS = 90;

type PrioritizableSubscription = {
  sessionsTotal: number | null;
  endDate: string | Date | null;
};

// Sort priority for a member's subscription list:
// 0 = annual/long-term (no session cap, endDate more than the threshold away) -- always top
// 1 = unlimited (no endDate, no session cap)
// 2 = everything else
export function makeSubscriptionSortPriority(now: number = Date.now()) {
  const thresholdMs = now + ANNUAL_SUBSCRIPTION_THRESHOLD_DAYS * 86400000;
  return (s: PrioritizableSubscription): number => {
    if (!s.sessionsTotal && s.endDate && new Date(s.endDate).getTime() > thresholdMs) return 0;
    if (!s.sessionsTotal && !s.endDate) return 1;
    return 2;
  };
}
