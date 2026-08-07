import { getTenantTimezone } from "@/lib/tenant-context";
import { getUtcOffsetString, dateStrInZone, isValidTimeZone } from "@/lib/timezone-offset";

export { isValidTimeZone };

// All five functions below default to the current request's resolved tenant timezone
// (via getTenantTimezone(), which reads the x-tenant-timezone header middleware sets)
// when no explicit timeZone is passed — existing call sites need no changes to get
// correct per-tenant behavior. Pass an explicit IANA zone for non-request contexts
// (crons/scripts looping over multiple tenants) that already know which tenant they're
// operating on. This file is server-only (getTenantTimezone uses next/headers) — Client
// Components needing the same math with an explicit timezone should import
// lib/timezone-offset.ts directly instead.
//
// Function names keep the "manila" prefix from when this app was single-tenant —
// intentionally not renamed, to avoid touching every call site for a naming-only change.

/** Returns "YYYY-MM-DD" in the given (or current tenant's) timezone. */
export function manilaDateStr(d: Date = new Date(), timeZone: string = getTenantTimezone()): string {
  return dateStrInZone(d, timeZone);
}

/** Returns today's midnight, in the given (or current tenant's) timezone, as a Date
 *  (correct absolute moment regardless of server TZ). */
export function todayManilaDateOnly(timeZone: string = getTenantTimezone()): Date {
  const dateStr = manilaDateStr(new Date(), timeZone);
  const offset = getUtcOffsetString(new Date(`${dateStr}T00:00:00Z`), timeZone);
  return new Date(`${dateStr}T00:00:00${offset}`);
}

/** Day boundaries (UTC absolute) for the given date string in the given (or current
 *  tenant's) timezone, defaulting to today. */
export function manilaDayBoundaries(
  dateStr?: string,
  timeZone: string = getTenantTimezone()
): { start: Date; end: Date } {
  const s = dateStr ?? manilaDateStr(new Date(), timeZone);
  const offset = getUtcOffsetString(new Date(`${s}T12:00:00Z`), timeZone);
  return {
    start: new Date(`${s}T00:00:00${offset}`),
    end: new Date(`${s}T23:59:59.999${offset}`),
  };
}

/** Day-of-week (0=Sun…6=Sat) for a given date in the given (or current tenant's)
 *  timezone. */
export function manilaDayOfWeek(d: Date = new Date(), timeZone: string = getTenantTimezone()): number {
  const dateStr = manilaDateStr(d, timeZone);
  // Deliberately avoids Date#getDay() (which reads the *host's* local timezone, not
  // the target one) — parses the Y/M/D we already resolved in the target zone and asks
  // for the UTC day-of-week of that exact calendar date, which is host-independent.
  const [y, m, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day)).getUTCDay();
}

/** Current HH:MM string and day-of-week in the given (or current tenant's) timezone —
 *  safe on Vercel (UTC runtime). */
export function manilaNow(timeZone: string = getTenantTimezone()): { dateStr: string; hhmm: string; dayOfWeek: number } {
  const d = new Date();
  const dateStr = manilaDateStr(d, timeZone);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const h = parts.find((p) => p.type === "hour")?.value ?? "00";
  const m = parts.find((p) => p.type === "minute")?.value ?? "00";
  return {
    dateStr,
    hhmm: `${(h === "24" ? "00" : h).padStart(2, "0")}:${m.padStart(2, "0")}`,
    dayOfWeek: manilaDayOfWeek(d, timeZone),
  };
}
