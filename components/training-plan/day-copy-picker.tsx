"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export type DayOption = { dateStr: string; label: string; hasContent: boolean };

// Shared "pick days to copy into" popover, used both for copying a single card and for
// copying a whole day's cards. Custom-built (not a library popover) to match the same
// click-outside-to-close pattern already used by components/location-select.tsx and
// training-plan-cell-select.tsx elsewhere in this feature. Days that already have
// content are flagged so overwriting them is a visible, confirmed choice, not an
// accident.
export function DayCopyPicker({
  trigger,
  days,
  onConfirm,
  align = "left",
}: {
  trigger: React.ReactNode;
  days: DayOption[];
  onConfirm: (selectedDates: string[]) => Promise<void>;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSelected(new Set());
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function toggle(dateStr: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(dateStr)) next.delete(dateStr);
      else next.add(dateStr);
      return next;
    });
  }

  async function handleConfirm() {
    if (selected.size === 0) return;
    const overwriting = days.filter((d) => selected.has(d.dateStr) && d.hasContent);
    if (overwriting.length > 0) {
      const names = overwriting.map((d) => d.label).join(", ");
      if (!confirm(`${names} already ${overwriting.length === 1 ? "has" : "have"} content and will be overwritten. Continue?`)) return;
    }
    setBusy(true);
    try {
      await onConfirm([...selected]);
      setOpen(false);
      setSelected(new Set());
    } finally {
      setBusy(false);
    }
  }

  return (
    <div ref={ref} className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <span onClick={() => setOpen((o) => !o)}>{trigger}</span>
      {open && (
        <div className={`absolute z-50 mt-1 w-56 rounded-md border border-border bg-white dark:bg-zinc-900 shadow-md ${align === "right" ? "right-0" : "left-0"}`}>
          <p className="text-xs font-medium px-3 pt-2.5 pb-1 text-muted-foreground">Copy to:</p>
          <div className="max-h-52 overflow-y-auto px-1 pb-1">
            {days.length === 0 && <p className="text-xs text-muted-foreground px-2 py-3">No other days visible.</p>}
            {days.map((d) => (
              <label key={d.dateStr} className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent rounded cursor-pointer">
                <input type="checkbox" checked={selected.has(d.dateStr)} onChange={() => toggle(d.dateStr)} className="accent-primary" />
                <span className="flex-1">{d.label}</span>
                {d.hasContent && <span className="text-[10px] text-muted-foreground">has content</span>}
              </label>
            ))}
          </div>
          <div className="border-t border-border p-2">
            <Button type="button" size="sm" className="w-full" disabled={selected.size === 0 || busy} onClick={handleConfirm}>
              {busy && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Copy to {selected.size > 0 ? selected.size : ""} day{selected.size === 1 ? "" : "s"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
