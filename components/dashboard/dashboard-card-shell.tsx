"use client";

import { GripVertical, X } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CardId, CardWidth } from "@/lib/dashboard-layout";

// Maps a card's width (out of 4) to how many columns it spans at each breakpoint: 1 col
// on mobile always, then scaled up from the grid's own responsive column count (2 on
// tablet, 4 on wide screens) in customizable-dashboard-grid.tsx.
function widthClass(width: CardWidth): string {
  if (width === 4) return "sm:col-span-2 xl:col-span-4";
  if (width === 2) return "sm:col-span-2";
  return "";
}

// Wraps a dashboard card with drag/resize/remove chrome, but only when editMode is on --
// in normal view this renders its children with zero extra markup, so the dashboard
// looks pixel-identical to before this feature existed.
export function DashboardCardShell({
  id,
  width,
  editMode,
  onToggleWidth,
  onRemove,
  children,
}: {
  id: CardId;
  width: CardWidth;
  editMode: boolean;
  onToggleWidth: () => void;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !editMode,
  });

  if (!editMode) {
    return <div className={widthClass(width)}>{children}</div>;
  }

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={widthClass(width)}>
      <div className="flex items-center justify-between mb-1.5 px-0.5">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none"
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleWidth}
            className="px-1.5 py-0.5 rounded text-[10px] font-medium tabular-nums text-muted-foreground hover:text-foreground hover:bg-muted"
            title={`Width: ${width} of 4 columns — click to resize`}
          >
            {width}/4
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            title="Remove card"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="rounded-lg ring-1 ring-dashed ring-border/60 p-0.5">{children}</div>
    </div>
  );
}
