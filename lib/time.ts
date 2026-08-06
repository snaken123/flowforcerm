import { getTenantTimezone } from "@/lib/tenant-context";

// All five functions below default to the current request's resolved tenant timezone
// (via getTenantTimezone(), which reads the x-tenant-timezone header middleware sets)
// when no explicit timeZone is passed — existing call sites need no changes to get
// correct per-tenant behavior. Pass an explicit IANA zone for non-request contexts
// (crons/scripts looping over multiple tenants) that already know which tenant they're
// operating on.
//
// Function names keep the "manila" prefix from when this app was single-tenant —
// intentionally not renamed, to avoid touching every call site for a naming-only change.

export function isValidTimeZone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

// Computes the UTC offset (e.g. "+08:00", "-04:00") for an arbitrary IANA timezone at a
// specific instant, entirely from native Intl (no date-fns-tz/luxon needed) — necessary
// because unlike Asia/Manila (fixed UTC+8, no DST), most timezones' offsets vary by date.
function getUtcOffsetString(d: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  // Reinterpret the zone-local wall-clock time as if it were UTC, then diff against the
  // real instant — the difference is exactly the zone's offset at that moment.
  const asUtc = Date.UTC(
    Number(get("year")),
    Number(get("month")) - 1,
    Number(get("day")),
    Number(get("hour")) === 24 ? 0 : Number(get("hour")),
    Number(get("minute")),
    Number(get("second"))
  );
  const offsetMinutes = Math.round((asUtc - d.getTime()) / 60000);
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `${sign}${hh}:${mm}`;
}

/** Returns "YYYY-MM-DD" in the given (or current tenant's) timezone. */
export function manilaDateStr(d: Date = new Date(), timeZone: string = getTenantTimezone()): string {
  return d.toLocaleDateString("en-CA", { timeZone });
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
  const offset = getUtcOffsetString(new Date(`${dateStr}T12:00:00Z`), timeZone);
  return new Date(`${dateStr}T12:00:00${offset}`).getDay();
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
