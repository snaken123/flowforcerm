"use client";

import { GripVertical, Maximize2, Minimize2, X } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CardId, CardWidth } from "@/lib/dashboard-layout";

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
    return <div className={width === 2 ? "sm:col-span-2" : ""}>{children}</div>;
  }

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={width === 2 ? "sm:col-span-2" : ""}>
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
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
            title={width === 2 ? "Shrink to half width" : "Expand to full width"}
          >
            {width === 2 ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
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
