import { NotebookPen } from "lucide-react";
import type { TrainingPlanCell } from "@/lib/training-plan";

function cellClass(cell: TrainingPlanCell) {
  return `${cell.bold ? "font-bold" : ""} ${cell.italic ? "italic" : ""}`;
}

// Shared read-only presentation, used both inline on the board's card tiles and inside
// the expand modal's view mode -- a clean, printed-card-like list rather than a grid of
// empty bordered form fields. Rows nobody filled in are simply not shown, and each
// remaining row reads as one line (label right-aligned, description left-aligned)
// instead of two disconnected boxes. maxHeight caps very long cards with internal
// scroll, so one outlier card doesn't force its whole board row to match its full size.
export function TrainingPlanReadOnlyView({
  rows,
  notes,
  color,
  maxHeight,
  emptyMessage = "Nothing programmed for this yet.",
}: {
  rows: TrainingPlanCell[][];
  notes: string;
  color: string;
  maxHeight?: number;
  emptyMessage?: string;
}) {
  const visibleRows = rows.filter((row) => row.some((cell) => cell.text.trim()));

  if (visibleRows.length === 0 && !notes.trim()) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-4 overflow-y-auto" style={maxHeight ? { maxHeight } : undefined}>
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
