"use client";

import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

// Clickable column-header label + direction arrow, reused by every sortable table in the
// app. `direction` is null when this column isn't the table's active sort field.
export function SortableHeader({
  label,
  direction,
  onClick,
  className,
}: {
  label: string;
  direction: "asc" | "desc" | null;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 hover:text-foreground transition-colors ${className ?? ""}`}
    >
      {label}
      {direction === "asc" ? (
        <ArrowUp className="h-3 w-3" />
      ) : direction === "desc" ? (
        <ArrowDown className="h-3 w-3" />
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      )}
    </button>
  );
}
