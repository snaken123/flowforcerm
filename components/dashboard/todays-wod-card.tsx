"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Dumbbell, Loader2, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrainingPlanReadOnlyView } from "@/components/training-plan/training-plan-read-only-view";
import { TRAINING_PLAN_CATEGORIES, type TrainingPlanCell } from "@/lib/training-plan";
import { useTenantTimezone } from "@/components/tenant-timezone-provider";

type TrainingPlanCardData = { categoryKey: string; rows: TrainingPlanCell[][]; notes: string };

// Which categories default to EXPANDED on load -- a personal display preference, so it
// lives in localStorage rather than being sent to the server. Absent/unset = starts
// collapsed. Chevron clicks below only ever change the current view, never this stored
// default.
const STORAGE_KEY = "todaysWodDefaultExpanded";
const ALL_CATEGORY_KEYS = TRAINING_PLAN_CATEGORIES.map((c) => c.key);

export function TodaysWodCard({ showPlanLink }: { showPlanLink: boolean }) {
  const timeZone = useTenantTimezone();
  const [cards, setCards] = useState<TrainingPlanCardData[] | null>(null);
  // Starts with everything collapsed (SSR-safe -- ALL_CATEGORY_KEYS is a static import,
  // not a browser API, so this doesn't cause a hydration mismatch the way reading
  // localStorage here would).
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set(ALL_CATEGORY_KEYS));
  const [defaultExpanded, setDefaultExpanded] = useState<Set<string>>(new Set());

  // Reads localStorage after hydration (it's unavailable during SSR) and un-collapses
  // whichever categories are checked as "start expanded".
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
      if (Array.isArray(saved) && saved.length > 0) {
        const savedSet = new Set<string>(saved);
        setDefaultExpanded(savedSet);
        setCollapsed(new Set(ALL_CATEGORY_KEYS.filter((k) => !savedSet.has(k))));
      }
    } catch {}
  }, []);

  function toggleCategory(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // The checkbox: checked = "start expanded". Updates the persisted default AND applies
  // immediately to the current view, so checking/unchecking never looks like a no-op.
  function setStartExpanded(key: string, startExpanded: boolean) {
    setDefaultExpanded((prev) => {
      const next = new Set(prev);
      if (startExpanded) next.add(key);
      else next.delete(key);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...next])); } catch {}
      return next;
    });
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (startExpanded) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  useEffect(() => {
    const today = new Date().toLocaleDateString("en-CA", { timeZone });
    fetch(`/api/training-plan?start=${today}&end=${today}`)
      .then((r) => r.json())
      .then((d) => setCards(Array.isArray(d.cards) ? d.cards : []))
      .catch(() => setCards([]));
  }, [timeZone]);

  const cardsByCategory = Object.fromEntries((cards ?? []).map((c) => [c.categoryKey, c]));
  const hasAnything = (cards ?? []).some((c) => c.rows.some((row: TrainingPlanCell[]) => row.some((cell) => cell.text.trim())) || c.notes.trim());

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Dumbbell className="h-4 w-4" />Today&apos;s WOD
        </CardTitle>
        {showPlanLink && (
          <Link href="/admin/schedule/training-plan" className="text-xs text-primary hover:underline flex items-center gap-1">
            View Full Plan<ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </CardHeader>
      <CardContent>
        {cards === null ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !hasAnything ? (
          <p className="text-sm text-muted-foreground text-center py-8">No workout programmed for today.</p>
        ) : (
          <div className="space-y-3">
            {TRAINING_PLAN_CATEGORIES.map((cat) => {
              const card = cardsByCategory[cat.key];
              if (!card) return null;
              const hasContent = card.rows.some((row: TrainingPlanCell[]) => row.some((cell) => cell.text.trim())) || card.notes.trim();
              if (!hasContent) return null;
              const isCollapsed = collapsed.has(cat.key);
              const startsExpanded = defaultExpanded.has(cat.key);
              return (
                <div key={cat.key} className="space-y-1">
                  <div className="w-full flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={startsExpanded}
                      onChange={(e) => setStartExpanded(cat.key, e.target.checked)}
                      title="Start this section expanded"
                      className="h-3.5 w-3.5 shrink-0 accent-current cursor-pointer"
                      style={{ color: cat.color }}
                    />
                    <button
                      type="button"
                      onClick={() => toggleCategory(cat.key)}
                      className="flex-1 flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide cursor-pointer select-none"
                      style={{ color: cat.color }}
                    >
                      {cat.defaultLabel}
                      {isCollapsed ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronUp className="h-3.5 w-3.5 shrink-0" />}
                    </button>
                  </div>
                  {!isCollapsed && <TrainingPlanReadOnlyView rows={card.rows} notes={card.notes} color={cat.color} compact />}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
