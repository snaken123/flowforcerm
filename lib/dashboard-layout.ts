// Personal display preference (drag order, width, hidden cards) for the Admin/Staff
// dashboard -- lives in localStorage, same pattern as the WOD collapse-state, not synced
// to the server or across devices.

export type CardId =
  | "wod"
  | "announcements"
  | "stat-total-members"
  | "stat-today-checkins"
  | "stat-new-month"
  | "stat-overdue-payments"
  | "recent-checkins"
  | "newest-members"
  | "expiring-soon";

export type CardWidth = 1 | 2;

export type CardLayoutItem = { id: CardId; width: CardWidth; hidden: boolean };

export const CARD_LABELS: Record<CardId, string> = {
  wod: "Today's WOD",
  announcements: "Gym Announcements",
  "stat-total-members": "Total Members",
  "stat-today-checkins": "Today's Check-ins",
  "stat-new-month": "New This Month",
  "stat-overdue-payments": "Overdue Payments",
  "recent-checkins": "Recent Check-ins",
  "newest-members": "Newest Members",
  "expiring-soon": "Expiring Soon",
};

// Order here = default display order. Matches today's fixed layout: WOD + Announcements
// side by side, stat tiles paired two-up, Recent Check-ins + Newest Members side by
// side, Expiring Soon full-width.
export const DEFAULT_LAYOUT: CardLayoutItem[] = [
  { id: "wod", width: 1, hidden: false },
  { id: "announcements", width: 1, hidden: false },
  { id: "stat-total-members", width: 1, hidden: false },
  { id: "stat-today-checkins", width: 1, hidden: false },
  { id: "stat-new-month", width: 1, hidden: false },
  { id: "stat-overdue-payments", width: 1, hidden: false },
  { id: "recent-checkins", width: 1, hidden: false },
  { id: "newest-members", width: 1, hidden: false },
  { id: "expiring-soon", width: 2, hidden: false },
];

const STORAGE_KEY = "adminDashboardLayout";

// Merges a saved layout against DEFAULT_LAYOUT so a future code change that adds/removes
// a card doesn't break an existing saved preference: unknown ids are dropped, missing
// ones are appended at the end using their default width/visibility.
export function loadDashboardLayout(): CardLayoutItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LAYOUT;
    const saved = JSON.parse(raw) as CardLayoutItem[];
    if (!Array.isArray(saved)) return DEFAULT_LAYOUT;

    const knownIds = new Set(DEFAULT_LAYOUT.map((c) => c.id));
    const savedIds = new Set(saved.map((c) => c.id));
    const cleaned = saved.filter((c) => knownIds.has(c.id));
    const missing = DEFAULT_LAYOUT.filter((c) => !savedIds.has(c.id));
    return [...cleaned, ...missing];
  } catch {
    return DEFAULT_LAYOUT;
  }
}

export function saveDashboardLayout(layout: CardLayoutItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch {}
}
