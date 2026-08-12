"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Dumbbell, Loader2, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrainingPlanReadOnlyView } from "@/components/training-plan/training-plan-read-only-view";
import { TRAINING_PLAN_CATEGORIES, type TrainingPlanCell } from "@/lib/training-plan";
import { useTenantTimezone } from "@/components/tenant-timezone-provider";

type TrainingPlanCardData = { categoryKey: string; rows: TrainingPlanCell[][]; notes: string };

export function TodaysWodCard({ showPlanLink }: { showPlanLink: boolean }) {
  const timeZone = useTenantTimezone();
  const [cards, setCards] = useState<TrainingPlanCardData[] | null>(null);

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
              return (
                <div key={cat.key} className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: cat.color }}>{cat.defaultLabel}</p>
                  <TrainingPlanReadOnlyView rows={card.rows} notes={card.notes} color={cat.color} compact />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
