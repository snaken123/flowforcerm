export type CategoryKey = "warmup" | "strength" | "metcon" | "accessory" | "coach_note";

export type TrainingPlanCategory = {
  key: CategoryKey;
  defaultLabel: string;
  color: string; // fixed header color, not user-editable
  sortOrder: number;
  excludedForMembers: boolean;
};

export const TRAINING_PLAN_CATEGORIES: TrainingPlanCategory[] = [
  { key: "warmup", defaultLabel: "Warm-up", color: "#f59e0b", sortOrder: 1, excludedForMembers: false },
  { key: "strength", defaultLabel: "Strength", color: "#3b82f6", sortOrder: 2, excludedForMembers: false },
  { key: "metcon", defaultLabel: "METCON", color: "#10b981", sortOrder: 3, excludedForMembers: false },
  { key: "accessory", defaultLabel: "ACCESSORY", color: "#8b5cf6", sortOrder: 4, excludedForMembers: false },
  { key: "coach_note", defaultLabel: "Coach's Note", color: "#ef4444", sortOrder: 5, excludedForMembers: true },
];

export const CATEGORY_KEYS = TRAINING_PLAN_CATEGORIES.map((c) => c.key) as CategoryKey[];

export const DEFAULT_ROWS = 3;
export const FIXED_COLS = 2;
export const MAX_ROWS = 50;

export type TrainingPlanCell = { text: string; bold: boolean; italic: boolean };

export function emptyCell(): TrainingPlanCell {
  return { text: "", bold: false, italic: false };
}

export function defaultGrid(rows: number = DEFAULT_ROWS): TrainingPlanCell[][] {
  return Array.from({ length: rows }, () => Array.from({ length: FIXED_COLS }, emptyCell));
}

export function isGridEmpty(rows: TrainingPlanCell[][]): boolean {
  return rows.every((row) => row.every((cell) => !cell.text.trim() && !cell.bold && !cell.italic));
}

// role===ADMIN, or role===STAFF with the "COACH" employeeTypes tag, gets full edit
// access to the Training Plan; everyone else (plain STAFF, MEMBER) is read-only. Mirrors
// the isCoachOnly precedent at app/(dashboard)/admin/schedule/page.tsx:63-67, which
// blends the same two session fields for the same "is this person a coach" question.
export function canEditTrainingPlan(session: { user?: any } | null): boolean {
  if (!session?.user) return false;
  const role = session.user.role;
  if (role === "ADMIN") return true;
  const employeeTypes: string[] = session.user.employeeTypes ?? [];
  return role === "STAFF" && employeeTypes.includes("COACH");
}
