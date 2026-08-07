"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/lib/use-toast";
import { FIXED_COLS, MAX_ROWS, defaultGrid, type TrainingPlanCell } from "@/lib/training-plan";
import { TrainingPlanCellSelect } from "./training-plan-cell-select";

type Category = { key: string; label: string; color: string; sortOrder: number };

function cellClass(cell: TrainingPlanCell) {
  return `${cell.bold ? "font-bold" : ""} ${cell.italic ? "italic" : ""}`;
}

// Read-only presentation: a clean, printed-card-like list rather than a grid of empty
// bordered form fields -- rows nobody filled in are simply not shown, and each remaining
// row reads as one line (quantity/label on the left, description on the right) instead
// of two disconnected boxes.
function TrainingPlanReadOnlyView({ rows, notes, color }: { rows: TrainingPlanCell[][]; notes: string; color: string }) {
  const visibleRows = rows.filter((row) => row.some((cell) => cell.text.trim()));

  if (visibleRows.length === 0 && !notes.trim()) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Nothing programmed for this yet.</p>;
  }

  return (
    <div className="space-y-4">
      {visibleRows.length > 0 && (
        <div className="rounded-lg border overflow-hidden" style={{ borderLeft: `3px solid ${color}` }}>
          <div className="divide-y divide-border">
            {visibleRows.map((row, i) => (
              <div key={i} className="flex items-baseline gap-4 px-4 py-2.5 odd:bg-muted/30">
                <span className={`w-20 shrink-0 text-right text-sm text-foreground/90 ${cellClass(row[0])}`}>{row[0].text}</span>
                <span className={`flex-1 text-sm text-foreground ${cellClass(row[1])}`}>{row[1].text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {notes.trim() && (
        <div className="flex gap-2.5 rounded-lg bg-muted/40 p-3.5">
          <NotebookPen className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-0.5">Coach's Notes</p>
            <p className="text-sm whitespace-pre-wrap">{notes}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export function TrainingPlanCardModal({
  open,
  onOpenChange,
  date,
  category,
  initialRows,
  initialNotes,
  canEdit,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  category: Category;
  initialRows?: TrainingPlanCell[][];
  initialNotes?: string;
  canEdit: boolean;
  onSaved: () => void;
}) {
  const [rows, setRows] = useState<TrainingPlanCell[][]>(initialRows ?? defaultGrid());
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setRows(initialRows && initialRows.length > 0 ? initialRows : defaultGrid());
      setNotes(initialNotes ?? "");
    }
  }, [open, initialRows, initialNotes]);

  function updateCell(r: number, c: number, cell: TrainingPlanCell) {
    setRows((prev) => prev.map((row, ri) => (ri !== r ? row : row.map((cur, ci) => (ci !== c ? cur : cell)))));
  }

  function addRow() {
    setRows((prev) => (prev.length >= MAX_ROWS ? prev : [...prev, Array.from({ length: FIXED_COLS }, () => ({ text: "", bold: false, italic: false }))]));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/training-plan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, categoryKey: category.key, rows, notes }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Training plan saved" });
      onSaved();
    } catch {
      toast({ variant: "destructive", title: "Could not save" });
    } finally {
      setSaving(false);
    }
  }

  const displayDate = new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[80vw] w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: category.color }} />
            {category.label} — {displayDate}
          </DialogTitle>
        </DialogHeader>

        {canEdit ? (
          <>
            <div className="space-y-2">
              <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${FIXED_COLS}, minmax(0, 1fr))` }}>
                {rows.map((row, r) =>
                  row.map((cell, c) => (
                    <TrainingPlanCellSelect
                      key={`${r}-${c}`}
                      cell={cell}
                      onChange={(next) => updateCell(r, c, next)}
                      canEdit={canEdit}
                    />
                  ))
                )}
              </div>
            </div>

            <div>
              <Button type="button" variant="outline" size="sm" onClick={addRow} disabled={rows.length >= MAX_ROWS}>
                <Plus className="mr-2 h-3.5 w-3.5" />
                Add Row
              </Button>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Coach's Notes</p>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[80px] text-sm"
                placeholder="Notes for this card..."
              />
            </div>
          </>
        ) : (
          <TrainingPlanReadOnlyView rows={rows} notes={notes} color={category.color} />
        )}

        {canEdit && (
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
