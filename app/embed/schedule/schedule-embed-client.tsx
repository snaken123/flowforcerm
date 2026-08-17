"use client";

import { useState } from "react";

const DAYS_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAYS_SHORT = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const PX_PER_HOUR = 80;

function formatTime(t: string | null) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function toMinutes(t: string | null): number {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function formatHourLabel(h: number) {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function layoutDay(events: any[]): { event: any; col: number; totalCols: number }[] {
  if (events.length === 0) return [];
  const sorted = [...events].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
  const columns: number[] = [];
  const placed: { event: any; col: number }[] = [];
  for (const ev of sorted) {
    const s = toMinutes(ev.startTime);
    const e = toMinutes(ev.endTime);
    let col = columns.findIndex((end) => end <= s);
    if (col === -1) { col = columns.length; columns.push(e); } else columns[col] = e;
    placed.push({ event: ev, col });
  }
  return placed.map(({ event, col }) => {
    const s = toMinutes(event.startTime);
    const e = toMinutes(event.endTime);
    const concurrent = placed.filter(({ event: o }) => toMinutes(o.startTime) < e && toMinutes(o.endTime) > s);
    return { event, col, totalCols: Math.max(...concurrent.map((c) => c.col)) + 1 };
  });
}

export function ScheduleEmbedClient({ schedules, classes, todayStr }: { schedules: any[]; classes: any[]; todayStr: string }) {
  // Parsed without a "Z" suffix so the resulting Date's local Y/M/D match todayStr
  // exactly, regardless of the viewer's own browser timezone -- keeps server and
  // client agreeing on what "today" is (this used to independently call `new Date()`
  // on each side, which could genuinely disagree near midnight and caused a hydration
  // mismatch).
  const today = new Date(todayStr + "T00:00:00");

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [view, setView] = useState<"week" | "day">("week");
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(today));
  const [currentDay, setCurrentDay] = useState<Date>(() => new Date(today));
  const [modalData, setModalData] = useState<{ schedule: any; date: Date } | null>(null);

  // Filter out Gym Use from chips
  const displayClasses = classes.filter((c) => c.name !== "Gym Use");
  const classMap = Object.fromEntries(classes.map((c) => c.id ? [c.id, c] : []));

  function toggle(id: string) {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  const filtered = selected.size > 0 ? schedules.filter((s) => selected.has(s.classId)) : schedules;

  // Map dayOfWeek → schedules
  const byDow: Record<number, typeof schedules> = {};
  for (const s of filtered) {
    if (!byDow[s.dayOfWeek]) byDow[s.dayOfWeek] = [];
    byDow[s.dayOfWeek].push(s);
  }

  // Build the list of dates to display
  const datesInView: Date[] = view === "week"
    ? Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
    : [currentDay];

  // Compute used hours across visible dates
  const eventsInView = datesInView.flatMap((d) =>
    (byDow[d.getDay()] ?? []).filter((s) => {
      if (!s.endDate) return true;
      const end = new Date(s.endDate);
      end.setHours(0, 0, 0, 0);
      return end >= d;
    })
  );
  const usedHours = new Set<number>();
  for (const s of eventsInView) {
    const sh = Math.floor(toMinutes(s.startTime) / 60);
    const eh = Math.ceil(toMinutes(s.endTime) / 60);
    for (let h = sh; h < eh; h++) usedHours.add(h);
  }
  const sortedHours = [...usedHours].sort((a, b) => a - b);
  const hourIndexMap = new Map(sortedHours.map((h, i) => [h, i]));
  const calendarHeight = Math.max(sortedHours.length * PX_PER_HOUR, 60);

  const gapPositions: number[] = [];
  for (let i = 1; i < sortedHours.length; i++) {
    if (sortedHours[i] !== sortedHours[i - 1] + 1) gapPositions.push(i * PX_PER_HOUR);
  }

  function eventTopPx(startMin: number) {
    const h = Math.floor(startMin / 60);
    return (hourIndexMap.get(h) ?? 0) * PX_PER_HOUR + (startMin % 60) / 60 * PX_PER_HOUR;
  }

  function eventHeightPx(startMin: number, endMin: number) {
    let px = 0;
    for (let min = startMin; min < endMin;) {
      const h = Math.floor(min / 60);
      const chunkEnd = Math.min((h + 1) * 60, endMin);
      if (usedHours.has(h)) px += (chunkEnd - min) / 60 * PX_PER_HOUR;
      min = (h + 1) * 60;
    }
    return Math.max(px - 2, 24);
  }

  // Header range label
  const weekEndDate = addDays(weekStart, 6);
  const weekLabel = weekStart.getMonth() === weekEndDate.getMonth()
    ? `${MONTHS[weekStart.getMonth()]} ${weekStart.getDate()}–${weekEndDate.getDate()}, ${weekStart.getFullYear()}`
    : `${MONTHS[weekStart.getMonth()]} ${weekStart.getDate()} – ${MONTHS[weekEndDate.getMonth()]} ${weekEndDate.getDate()}, ${weekStart.getFullYear()}`;
  const dayLabel = `${DAYS_FULL[currentDay.getDay()]}, ${MONTHS[currentDay.getMonth()]} ${currentDay.getDate()}, ${currentDay.getFullYear()}`;

  function navPrev() {
    if (view === "week") setWeekStart((d) => addDays(d, -7));
    else setCurrentDay((d) => addDays(d, -1));
  }
  function navNext() {
    if (view === "week") setWeekStart((d) => addDays(d, 7));
    else setCurrentDay((d) => addDays(d, 1));
  }
  function goToday() {
    setWeekStart(getWeekStart(today));
    setCurrentDay(new Date(today));
  }

  const isCurrentPeriod = view === "week"
    ? isSameDay(weekStart, getWeekStart(today))
    : isSameDay(currentDay, today);

  return (
    <>
      {/* dangerouslySetInnerHTML, not JSX text children -- React HTML-escapes text
          children (quotes become &quot;/&#x27;) even inside <style>, but <style> is a
          raw-text HTML element the browser never entity-decodes, so any escaped quote
          char here caused the server and client renders to permanently disagree. Setting
          innerHTML directly bypasses that escaping and matches what the browser parses. */}
      <style dangerouslySetInnerHTML={{ __html: `
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f9fafb; color: #111; }
        .wrapper { padding: 16px; max-width: 1100px; margin: 0 auto; }

        .toolbar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 14px; }
        .view-toggle { display: flex; border: 1.5px solid #e5e7eb; border-radius: 8px; overflow: hidden; flex-shrink: 0; }
        .view-btn { padding: 6px 16px; font-size: 12px; font-weight: 600; cursor: pointer; background: #fff; color: #6b7280; border: none; transition: background 0.15s, color 0.15s; }
        .view-btn.active { background: #111; color: #fff; }
        .nav-group { display: flex; align-items: center; gap: 6px; }
        .nav-btn { width: 30px; height: 30px; border-radius: 7px; border: 1.5px solid #e5e7eb; background: #fff; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; color: #374151; transition: border-color 0.15s; }
        .nav-btn:hover { border-color: #9ca3af; }
        .today-btn { padding: 5px 12px; border-radius: 7px; border: 1.5px solid #e5e7eb; background: #fff; font-size: 12px; font-weight: 600; cursor: pointer; color: #374151; transition: border-color 0.15s; }
        .today-btn:hover { border-color: #9ca3af; }
        .today-btn.current { border-color: #2563eb; color: #2563eb; }
        .period-label { font-size: 14px; font-weight: 700; color: #111; }

        .filters { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; align-items: center; }
        .filters-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #9ca3af; }
        .filter-chip { display: flex; align-items: center; gap: 6px; padding: 5px 11px; border-radius: 7px; border: 1.5px solid #e5e7eb; font-size: 12px; font-weight: 600; cursor: pointer; background: #fff; color: #374151; transition: border-color 0.15s, background 0.15s; user-select: none; }
        .filter-chip:hover { border-color: #9ca3af; }
        .filter-chip.checked { border-color: transparent; }
        .chip-checkbox { width: 14px; height: 14px; border-radius: 4px; border: 1.5px solid #d1d5db; background: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .chip-checkbox.on { border-color: transparent; }
        .chip-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

        .calendar-scroll { overflow-x: auto; }
        .calendar { border: 1px solid #e5e7eb; border-radius: 10px; background: #fff; overflow: hidden; min-width: 420px; }
        .day-header-row { display: flex; border-bottom: 2px solid #e5e7eb; background: #f9fafb; }
        .time-header { width: 56px; flex-shrink: 0; }
        .day-header { flex: 1; text-align: center; padding: 8px 4px 6px; border-left: 1px solid #e5e7eb; cursor: default; }
        .day-header-name { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #9ca3af; }
        .day-header-date { font-size: 20px; font-weight: 700; color: #374151; line-height: 1.2; margin-top: 2px; }
        .day-header.today .day-header-name { color: #2563eb; }
        .day-header.today .day-header-date { background: #2563eb; color: #fff; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; margin: 2px auto 0; font-size: 15px; }

        .calendar-body { display: flex; }
        .time-col { width: 56px; flex-shrink: 0; position: relative; }
        .time-label { position: absolute; right: 8px; font-size: 10px; color: #9ca3af; transform: translateY(-50%); white-space: nowrap; }
        .days-grid { flex: 1; display: grid; position: relative; }
        .day-col { position: relative; border-left: 1px solid #e5e7eb; }
        .hour-line { position: absolute; left: 0; right: 0; border-top: 1px solid #f0f0f0; pointer-events: none; z-index: 0; }
        .gap-line { position: absolute; left: 0; right: 0; border-top: 2px dashed #e5e7eb; pointer-events: none; z-index: 1; }
        .class-card { position: absolute; border-radius: 5px; padding: 4px 6px; overflow: hidden; cursor: pointer; border: 1px solid rgba(0,0,0,0.08); z-index: 2; transition: filter 0.1s, transform 0.1s; }
        .class-card:hover { filter: brightness(1.1); transform: scale(1.02); z-index: 3; }
        .class-name { font-size: 11px; font-weight: 700; line-height: 1.3; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .class-time { font-size: 10px; color: rgba(255,255,255,0.85); margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .class-coach { font-size: 10px; color: rgba(255,255,255,0.75); margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .empty { padding: 48px; text-align: center; font-size: 13px; color: #9ca3af; font-style: italic; background: #fff; border-radius: 10px; border: 1px solid #e5e7eb; }

        /* Modal */
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 16px; }
        .modal { background: #fff; border-radius: 14px; width: 100%; max-width: 400px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
        .modal-header { padding: 20px 20px 16px; position: relative; }
        .modal-color-bar { position: absolute; top: 0; left: 0; right: 0; height: 4px; }
        .modal-title { font-size: 20px; font-weight: 800; color: #111; margin-top: 8px; line-height: 1.2; }
        .modal-subtitle { font-size: 13px; color: #6b7280; margin-top: 4px; }
        .modal-close { position: absolute; top: 14px; right: 14px; width: 28px; height: 28px; border-radius: 50%; border: none; background: #f3f4f6; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; color: #6b7280; transition: background 0.15s; }
        .modal-close:hover { background: #e5e7eb; }
        .modal-body { padding: 0 20px 20px; display: flex; flex-direction: column; gap: 12px; }
        .modal-row { display: flex; align-items: flex-start; gap: 10px; }
        .modal-icon { width: 32px; height: 32px; border-radius: 8px; background: #f3f4f6; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 15px; }
        .modal-row-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: #9ca3af; }
        .modal-row-value { font-size: 14px; font-weight: 600; color: #111; margin-top: 1px; }
      ` }} />

      <div className="wrapper">

        {/* Toolbar */}
        <div className="toolbar">
          <div className="view-toggle">
            <button className={`view-btn${view === "week" ? " active" : ""}`} onClick={() => setView("week")}>Week</button>
            <button className={`view-btn${view === "day" ? " active" : ""}`} onClick={() => setView("day")}>Day</button>
          </div>

          <div className="nav-group">
            <button className="nav-btn" onClick={navPrev} title="Previous">&#8249;</button>
            <button className="nav-btn" onClick={navNext} title="Next">&#8250;</button>
            <button className={`today-btn${isCurrentPeriod ? " current" : ""}`} onClick={goToday}>Today</button>
            <span className="period-label">{view === "week" ? weekLabel : dayLabel}</span>
          </div>
        </div>

        {/* Filters */}
        <div className="filters">
          <span className="filters-label">Show:</span>
          {displayClasses.map((c) => {
            const on = selected.has(c.id);
            return (
              <div
                key={c.id}
                className={`filter-chip${on ? " checked" : ""}`}
                style={on ? { backgroundColor: c.color + "22", borderColor: c.color } : {}}
                onClick={() => toggle(c.id)}
              >
                <div className={`chip-checkbox${on ? " on" : ""}`} style={on ? { backgroundColor: c.color } : {}}>
                  {on && (
                    <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                      <path d="M1 3.5L3.5 6L8 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <div className="chip-dot" style={{ backgroundColor: c.color ?? "#6b7280" }} />
                {c.name}
              </div>
            );
          })}
        </div>

        {/* Calendar */}
        {sortedHours.length === 0 ? (
          <div className="empty">No classes scheduled.</div>
        ) : (
          <div className="calendar-scroll">
            <div className="calendar">
              {/* Day headers */}
              <div className="day-header-row">
                <div className="time-header" />
                {datesInView.map((date) => {
                  const isToday = isSameDay(date, today);
                  return (
                    <div key={date.toISOString()} className={`day-header${isToday ? " today" : ""}`}>
                      <div className="day-header-name">{DAYS_SHORT[date.getDay()]}</div>
                      <div className="day-header-date">{date.getDate()}</div>
                    </div>
                  );
                })}
              </div>

              {/* Body */}
              <div className="calendar-body">
                <div className="time-col" style={{ height: calendarHeight }}>
                  {sortedHours.map((h, i) => (
                    <div key={h} className="time-label" style={{ top: i * PX_PER_HOUR }}>{formatHourLabel(h)}</div>
                  ))}
                </div>

                <div className="days-grid" style={{ gridTemplateColumns: `repeat(${datesInView.length}, 1fr)`, height: calendarHeight }}>
                  {sortedHours.map((_, i) => (
                    <div key={i} className="hour-line" style={{ top: i * PX_PER_HOUR, left: 0, right: 0, position: "absolute" }} />
                  ))}
                  {gapPositions.map((y) => (
                    <div key={y} className="gap-line" style={{ top: y, left: 0, right: 0, position: "absolute" }} />
                  ))}

                  {datesInView.map((date, colIdx) => {
                    const dow = date.getDay();
                    const dayEvents = (byDow[dow] ?? []).filter((s) => {
                      if (!s.endDate) return true;
                      const end = new Date(s.endDate);
                      end.setHours(0, 0, 0, 0);
                      return end >= date;
                    });
                    const laid = layoutDay(dayEvents);
                    return (
                      <div key={date.toISOString()} className="day-col" style={{ gridColumn: colIdx + 1 }}>
                        {laid.map(({ event: s, col, totalCols }) => {
                          const cls = classMap[s.classId];
                          const startMin = toMinutes(s.startTime);
                          const endMin = toMinutes(s.endTime);
                          const topPx = eventTopPx(startMin);
                          const heightPx = eventHeightPx(startMin, endMin);
                          const coaches = s.coaches?.map((c: any) => `${c.employee.firstName} ${c.employee.lastName}`).join(", ") ?? "";
                          const bg = cls?.color ?? "#6b7280";
                          const W = 100 / totalCols;
                          return (
                            <div
                              key={s.id}
                              className="class-card"
                              style={{ top: topPx + 1, height: heightPx, backgroundColor: bg, left: `calc(${col * W}% + 2px)`, width: `calc(${W}% - 4px)` }}
                              title={`${cls?.name ?? "Class"} · ${formatTime(s.startTime)} – ${formatTime(s.endTime)}${coaches ? ` · ${coaches}` : ""}`}
                              onClick={() => setModalData({ schedule: s, date })}
                            >
                              <div className="class-name">{cls?.name ?? "Class"}</div>
                              {heightPx > 34 && <div className="class-time">{formatTime(s.startTime)} – {formatTime(s.endTime)}</div>}
                              {heightPx > 52 && coaches && <div className="class-coach">{coaches}</div>}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalData && (() => {
        const { schedule: s, date } = modalData;
        const cls = classMap[s.classId];
        const bg = cls?.color ?? "#6b7280";
        const coaches = s.coaches?.map((c: any) => `${c.employee.firstName} ${c.employee.lastName}`).join(", ") ?? "";
        const dateStr = `${DAYS_FULL[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
        const timeStr = `${formatTime(s.startTime)} – ${formatTime(s.endTime)}`;
        return (
          <div className="modal-overlay" onClick={() => setModalData(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-color-bar" style={{ backgroundColor: bg }} />
                <button className="modal-close" onClick={() => setModalData(null)}>×</button>
                <div className="modal-title">{cls?.name ?? "Class"}</div>
                <div className="modal-subtitle">{dateStr}</div>
              </div>
              <div className="modal-body">
                <div className="modal-row">
                  <div className="modal-icon">🕐</div>
                  <div>
                    <div className="modal-row-label">Time</div>
                    <div className="modal-row-value">{timeStr}</div>
                  </div>
                </div>
                {coaches && (
                  <div className="modal-row">
                    <div className="modal-icon">👤</div>
                    <div>
                      <div className="modal-row-label">Coach</div>
                      <div className="modal-row-value">{coaches}</div>
                    </div>
                  </div>
                )}
                {cls?.location && (
                  <div className="modal-row">
                    <div className="modal-icon">📍</div>
                    <div>
                      <div className="modal-row-label">Location</div>
                      <div className="modal-row-value">{cls.location}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
