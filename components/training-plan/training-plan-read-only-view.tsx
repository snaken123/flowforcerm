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
// compact tightens font/spacing for the narrow board-card context (the modal keeps the
// roomier default sizing). min-w-0 + break-words on the flex-1 column is load-bearing:
// without it, long text doesn't shrink or wrap -- it overflows the row and gets silently
// clipped by the card's own overflow-hidden, which is why content was going missing.
export function TrainingPlanReadOnlyView({
  rows,
  notes,
  color,
  maxHeight,
  emptyMessage = "Nothing programmed for this yet.",
  compact = false,
}: {
  rows: TrainingPlanCell[][];
  notes: string;
  color: string;
  maxHeight?: number;
  emptyMessage?: string;
  compact?: boolean;
}) {
  const visibleRows = rows.filter((row) => row.some((cell) => cell.text.trim()));

  if (visibleRows.length === 0 && !notes.trim()) {
    return <p className={`text-center text-muted-foreground ${compact ? "py-3 text-xs" : "py-8 text-sm"}`}>{emptyMessage}</p>;
  }

  const textSize = compact ? "text-xs" : "text-sm";
  const rowPad = compact ? "px-2 py-1" : "px-4 py-2.5";
  const rowGap = compact ? "gap-1.5" : "gap-4";
  const labelWidth = compact ? "w-12" : "w-20";

  return (
    <div className={`overflow-y-auto ${compact ? "space-y-2" : "space-y-4"}`} style={maxHeight ? { maxHeight } : undefined}>
      {visibleRows.length > 0 && (
        <div className="rounded-lg border overflow-hidden" style={{ borderLeft: `3px solid ${color}` }}>
          <div className="divide-y divide-border">
            {visibleRows.map((row, i) => (
              <div key={i} className={`flex items-baseline ${rowGap} ${rowPad} odd:bg-muted/30`}>
                <span className={`${labelWidth} shrink-0 break-words text-right ${textSize} text-foreground/90 ${cellClass(row[0])}`}>{row[0].text}</span>
                <span className={`flex-1 min-w-0 break-words ${textSize} text-foreground ${cellClass(row[1])}`}>{row[1].text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {notes.trim() && (
        <div className={`flex gap-2 rounded-lg bg-muted/40 ${compact ? "p-2" : "p-3.5"}`}>
          <NotebookPen className={`shrink-0 mt-0.5 text-muted-foreground ${compact ? "h-3 w-3" : "h-4 w-4"}`} />
          <div className="min-w-0">
            <p className={`font-medium text-muted-foreground mb-0.5 ${compact ? "text-[10px]" : "text-xs"}`}>Coach's Notes</p>
            <p className={`whitespace-pre-wrap break-words ${textSize}`}>{notes}</p>
          </div>
        </div>
      )}
    </div>
  );
}
