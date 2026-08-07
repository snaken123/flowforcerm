// Pure, dependency-free timezone math — no next/headers or other server-only imports,
// so this is safe to import from both Server and Client Components. lib/time.ts (server-
// only, resolves the current tenant's timezone via request headers) re-exports these;
// import directly here when you're in a Client Component and already have an explicit
// IANA timezone string (e.g. from useTenantTimezone()).

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
export function getUtcOffsetString(d: Date, timeZone: string): string {
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

/** Returns "YYYY-MM-DD" in the given timezone. */
export function dateStrInZone(d: Date, timeZone: string): string {
  return d.toLocaleDateString("en-CA", { timeZone });
}

/** Day boundaries (UTC absolute) for the given date string in the given timezone. */
export function dayBoundariesInZone(dateStr: string, timeZone: string): { start: Date; end: Date } {
  const offset = getUtcOffsetString(new Date(`${dateStr}T12:00:00Z`), timeZone);
  return {
    start: new Date(`${dateStr}T00:00:00${offset}`),
    end: new Date(`${dateStr}T23:59:59.999${offset}`),
  };
}
