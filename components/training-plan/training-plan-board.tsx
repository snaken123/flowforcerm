"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, LayoutGrid, Calendar, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTenantTimezone } from "@/components/tenant-timezone-provider";
import { dateStrInZone } from "@/lib/timezone-offset";
import { toast } from "@/lib/use-toast";
import { TrainingPlanCardModal } from "./training-plan-card-modal";
import type { TrainingPlanCell } from "@/lib/training-plan";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getWeekStart(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}
function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
function todayMidnight() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

type Category = { key: string; label: string; color: string; sortOrder: number };
type Card = { date: string; categoryKey: string; rows: TrainingPlanCell[][]; notes?: string };

function previewText(rows?: TrainingPlanCell[][]) {
  if (!rows) return "";
  for (const row of rows) {
    for (const cell of row) {
      if (cell.text.trim()) return cell.text.trim();
    }
  }
  return "";
}

// Shared week/day calendar for the Training Plan board — used by both the admin
// "Class Schedule"/"Training Plan" tabs and the member "My Schedule" page, in edit or
// read-only mode. canEdit only gates which controls render; the API independently
// re-checks permission server-side on every write, and Coach's Note visibility is
// decided entirely server-side (from the session) on every fetch, not passed in here.
export function TrainingPlanBoard({ canEdit }: { canEdit: boolean }) {
  const timeZone = useTenantTimezone();
  const [viewMode, setViewMode] = useState<"week" | "day">("week");
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [dayView, setDayView] = useState(() => todayMidnight());
  const [categories, setCategories] = useState<Category[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [selected, setSelected] = useState<{ date: string; category: Category } | null>(null);
  const [renamingKey, setRenamingKey] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const days = viewMode === "week" ? Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)) : [dayView];
  const startStr = dateStrInZone(days[0], timeZone);
  const endStr = dateStrInZone(days[days.length - 1], timeZone);
  const todayStr = dateStrInZone(todayMidnight(), timeZone);

  const refetchCategories = useCallback(() => {
    fetch("/api/training-plan/categories")
      .then((r) => r.json())
      .then((d) => setCategories((d.categories ?? []).sort((a: Category, b: Category) => a.sortOrder - b.sortOrder)))
      .catch(() => {});
  }, []);

  useEffect(() => { refetchCategories(); }, [refetchCategories]);

  const refetchCards = useCallback(() => {
    fetch(`/api/training-plan?start=${startStr}&end=${endStr}`)
      .then((r) => r.json())
      .then((d) => setCards(d.cards ?? []))
      .catch(() => {});
  }, [startStr, endStr]);

  useEffect(() => { refetchCards(); }, [refetchCards]);

  function cardFor(dateStr: string, categoryKey: string) {
    return cards.find((c) => c.date === dateStr && c.categoryKey === categoryKey);
  }

  function startRename(cat: Category) {
    setRenamingKey(cat.key);
    setRenameValue(cat.label);
  }

  async function saveRename(key: string) {
    const label = renameValue.trim();
    if (!label) { setRenamingKey(null); return; }
    try {
      const overrides = Object.fromEntries(categories.map((c) => [c.key, c.key === key ? label : c.label]));
      const res = await fetch("/api/training-plan/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labels: overrides }),
      });
      if (!res.ok) throw new Error();
      refetchCategories();
    } catch {
      toast({ variant: "destructive", title: "Could not rename header" });
    } finally {
      setRenamingKey(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Category legend — one place to rename headers, rather than repeating an edit
          icon on every card across every day. */}
      <div className="flex flex-wrap items-center gap-3">
        {categories.map((cat) => (
          <div key={cat.key} className="flex items-center gap-1.5 text-sm">
            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
            {renamingKey === cat.key ? (
              <div className="flex items-center gap-1">
                <Input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); saveRename(cat.key); }
                    if (e.key === "Escape") setRenamingKey(null);
                  }}
                  className="h-7 w-32 text-sm"
                  maxLength={40}
                />
                <button type="button" onClick={() => saveRename(cat.key)} className="text-muted-foreground hover:text-foreground">
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => setRenamingKey(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <>
                <span className="font-medium">{cat.label}</span>
                {canEdit && (
                  <button type="button" title={`Rename ${cat.label}`} onClick={() => startRename(cat)} className="text-muted-foreground hover:text-foreground">
                    <Pencil className="h-3 w-3" />
                  </button>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {/* Nav header — mirrors the Prev/Today/Next + Week/Day toggle on the Class Schedule tab */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">
          {viewMode === "week"
            ? `${weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${addDays(weekStart, 6).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
            : dayView.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => (viewMode === "week" ? setWeekStart((w) => addDays(w, -7)) : setDayView((d) => addDays(d, -1)))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (viewMode === "week") setWeekStart(getWeekStart(new Date()));
              else setDayView(todayMidnight());
            }}
          >
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => (viewMode === "week" ? setWeekStart((w) => addDays(w, 7)) : setDayView((d) => addDays(d, 1)))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="flex rounded-md border overflow-hidden">
            <button
              type="button"
              title="Week View"
              onClick={() => setViewMode("week")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${viewMode === "week" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Week</span>
            </button>
            <button
              type="button"
              title="Day View"
              onClick={() => { setViewMode("day"); setDayView(todayMidnight()); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors border-l ${viewMode === "day" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Day</span>
            </button>
          </div>
        </div>
      </div>

      {/* Board */}
      <div className={`grid gap-3 ${viewMode === "week" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-7" : "grid-cols-1"}`}>
        {days.map((day) => {
          const dateStr = dateStrInZone(day, timeZone);
          const isToday = dateStr === todayStr;
          return (
            <div key={dateStr} className="rounded-md border overflow-hidden">
              <div className={`px-2 py-1.5 text-center border-b ${isToday ? "bg-primary/10" : "bg-muted/40"}`}>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{DAY_NAMES[day.getDay()]}</p>
                <p className="text-sm font-bold">{day.getDate()}</p>
              </div>
              <div className="p-1.5 space-y-1.5">
                {categories.map((cat) => {
                  const card = cardFor(dateStr, cat.key);
                  const preview = previewText(card?.rows);
                  return (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setSelected({ date: dateStr, category: cat })}
                      className="w-full text-left rounded px-2 py-1.5 text-white text-xs transition-[filter] hover:brightness-110"
                      style={{ backgroundColor: cat.color }}
                    >
                      <div className="font-semibold truncate">{cat.label}</div>
                      {preview && <div className="text-[10px] opacity-90 truncate">{preview}</div>}
                    </button>
                  );
                })}
                {categories.length === 0 && <p className="text-[11px] text-muted-foreground text-center py-2">—</p>}
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <TrainingPlanCardModal
          open={!!selected}
          onOpenChange={(o) => !o && setSelected(null)}
          date={selected.date}
          category={selected.category}
          initialRows={cardFor(selected.date, selected.category.key)?.rows}
          initialNotes={cardFor(selected.date, selected.category.key)?.notes}
          canEdit={canEdit}
          onSaved={() => { refetchCards(); setSelected(null); }}
        />
      )}
    </div>
  );
}
