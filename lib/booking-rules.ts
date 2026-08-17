// Shared between app/api/bookings/[id]/route.ts (server-side enforcement) and
// app/(dashboard)/member/schedule/member-calendar.tsx (member-facing UI) so the
// cancellation cutoff can't drift between what the UI promises and what the server
// actually enforces. Client-safe -- no server-only imports.

export const CANCELLATION_CUTOFF_HOURS = 4;

// dateStr: "YYYY-MM-DD", startTime: "HH:MM", both in tenant-local time (Asia/Manila, UTC+08:00).
export function hoursUntilClassStart(dateStr: string, startTime: string): number {
  const classTime = new Date(`${dateStr}T${startTime}:00+08:00`);
  return (classTime.getTime() - Date.now()) / (1000 * 60 * 60);
}

export function isWithinCancellationCutoff(dateStr: string, startTime: string): boolean {
  return hoursUntilClassStart(dateStr, startTime) < CANCELLATION_CUTOFF_HOURS;
}
