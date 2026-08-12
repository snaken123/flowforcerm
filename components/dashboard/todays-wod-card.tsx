"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Dumbbell, Loader2, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrainingPlanReadOnlyView } from "@/components/training-plan/training-plan-read-only-view";
import { TRAINING_PLAN_CATEGORIES, type TrainingPlanCell } from "@/lib/training-plan";
import { useTenantTimezone } from "@/components/tenant-timezone-provider";

type TrainingPlanCardData = { categoryKey: string; rows: TrainingPlanCell[][]; notes: string };

// Which categories default to collapsed on load -- a personal display preference, so it
// lives in localStorage rather than being sent to the server. Absent/unset = starts
// expanded (today's current behavior). Chevron clicks below only ever change the current
// view, never this stored default.
const STORAGE_KEY = "todaysWodDefaultCollapsed";

export function TodaysWodCard({ showPlanLink }: { showPlanLink: boolean }) {
  const timeZone = useTenantTimezone();
  const [cards, setCards] = useState<TrainingPlanCardData[] | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [defaultCollapsed, setDefaultCollapsed] = useState<Set<string>>(new Set());

  // Reads localStorage after hydration (it's unavailable during SSR, so this can't run
  // in the initial useState without causing a server/client mismatch).
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
      if (Array.isArray(saved) && saved.length > 0) {
        const savedSet = new Set<string>(saved);
        setDefaultCollapsed(savedSet);
        setCollapsed(savedSet);
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
    setDefaultCollapsed((prev) => {
      const next = new Set(prev);
      if (startExpanded) next.delete(key);
      else next.add(key);
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
              const startsExpanded = !defaultCollapsed.has(cat.key);
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
