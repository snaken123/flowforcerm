/** Returns "YYYY-MM-DD" in Manila time (Asia/Manila = UTC+8). */
export function manilaDateStr(d: Date = new Date()): string {
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
}

/** Returns Manila midnight as a Date (correct absolute moment regardless of server TZ). */
export function todayManilaDateOnly(): Date {
  return new Date(`${manilaDateStr()}T00:00:00+08:00`);
}

/** Day boundaries (UTC absolute) for the given Manila date string, defaulting to today. */
export function manilaDayBoundaries(dateStr?: string): { start: Date; end: Date } {
  const s = dateStr ?? manilaDateStr();
  return {
    start: new Date(`${s}T00:00:00+08:00`),
    end: new Date(`${s}T23:59:59.999+08:00`),
  };
}

/** Day-of-week (0=Sun…6=Sat) for a given date in Manila time. */
export function manilaDayOfWeek(d: Date = new Date()): number {
  return new Date(`${manilaDateStr(d)}T12:00:00+08:00`).getDay();
}

/** Current Manila HH:MM string and day-of-week — safe on Vercel (UTC runtime). */
export function manilaNow(): { dateStr: string; hhmm: string; dayOfWeek: number } {
  const d = new Date();
  const dateStr = manilaDateStr(d);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const h = parts.find((p) => p.type === "hour")?.value ?? "00";
  const m = parts.find((p) => p.type === "minute")?.value ?? "00";
  return {
    dateStr,
    hhmm: `${h.padStart(2, "0")}:${m.padStart(2, "0")}`,
    dayOfWeek: new Date(`${dateStr}T12:00:00+08:00`).getDay(),
  };
}
