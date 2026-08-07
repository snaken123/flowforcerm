"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/use-toast";
import type { TrainingPlanCell } from "@/lib/training-plan";

// Per-cell dropdown for the Training Plan grid: cells pick from a shared, global list of
// options (persisted via /api/training-plan/cell-options) rather than free text. Picking
// "Others..." reveals an inline text box; saving it both selects the value for this cell
// and adds it to the shared list for every other cell going forward. Modeled on
// components/location-select.tsx's exact interaction pattern, extended with a bold/italic
// toggle (Ctrl+B / Ctrl+I while the cell is focused) since that's still per-cell, not
// per-option.
export function TrainingPlanCellSelect({
  cell,
  onChange,
  canEdit,
}: {
  cell: TrainingPlanCell;
  onChange: (cell: TrainingPlanCell) => void;
  canEdit: boolean;
}) {
  const [options, setOptions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newOption, setNewOption] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/training-plan/cell-options")
      .then((r) => (r.ok ? r.json() : { options: [] }))
      .then((d) => setOptions(d.options ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setAdding(false);
        setNewOption("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function persist(next: string[]) {
    const res = await fetch("/api/training-plan/cell-options", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ options: next }),
    });
    if (!res.ok) {
      toast({ variant: "destructive", title: "Only admins/coaches can manage options" });
      return false;
    }
    setOptions(next);
    return true;
  }

  async function handleAddNew() {
    const name = newOption.trim();
    if (!name) return;
    if (options.includes(name)) {
      onChange({ ...cell, text: name });
      setAdding(false);
      setNewOption("");
      setOpen(false);
      return;
    }
    const ok = await persist([...options, name]);
    if (ok) {
      onChange({ ...cell, text: name });
      setAdding(false);
      setNewOption("");
      setOpen(false);
    }
  }

  async function handleDelete(opt: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Remove "${opt}" from the option list?`)) return;
    const ok = await persist(options.filter((o) => o !== opt));
    if (ok && cell.text === opt) onChange({ ...cell, text: "" });
  }

  function handleTriggerKeyDown(e: React.KeyboardEvent) {
    if (!canEdit || (!e.ctrlKey && !e.metaKey)) return;
    if (e.key.toLowerCase() === "b") {
      e.preventDefault();
      onChange({ ...cell, bold: !cell.bold });
    } else if (e.key.toLowerCase() === "i") {
      e.preventDefault();
      onChange({ ...cell, italic: !cell.italic });
    }
  }

  const textClass = `${cell.bold ? "font-bold" : ""} ${cell.italic ? "italic" : ""}`;

  if (!canEdit) {
    return (
      <div className={`min-h-[44px] w-full rounded-md border border-input bg-muted/30 px-3 py-2 text-sm flex items-center ${textClass}`}>
        {cell.text}
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleTriggerKeyDown}
        className={`flex min-h-[44px] w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm text-left ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${textClass}`}
      >
        {cell.text}
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[180px] rounded-md border border-border bg-white dark:bg-zinc-900 shadow-md">
          <div className="max-h-52 overflow-y-auto py-1">
            <button
              type="button"
              onClick={() => { onChange({ ...cell, text: "" }); setOpen(false); }}
              className="flex w-full items-center px-3 py-2 text-sm hover:bg-accent text-left text-muted-foreground"
            >
              (blank)
            </button>
            {options.map((opt) => (
              <div key={opt} className="flex items-center hover:bg-accent">
                <button
                  type="button"
                  onClick={() => { onChange({ ...cell, text: opt }); setOpen(false); }}
                  className="flex-1 px-3 py-2 text-sm text-left"
                >
                  {opt}
                </button>
                <button
                  type="button"
                  title={`Remove ${opt}`}
                  onClick={(e) => handleDelete(opt, e)}
                  className="px-2 py-2 text-muted-foreground hover:text-destructive"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="border-t border-border">
            {adding ? (
              <div className="flex items-center gap-1 p-2">
                <Input
                  autoFocus
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); handleAddNew(); }
                    if (e.key === "Escape") { setAdding(false); setNewOption(""); }
                  }}
                  placeholder="New option..."
                  className="h-8 text-sm"
                />
                <button type="button" onClick={handleAddNew} className="shrink-0 p-1.5 rounded hover:bg-accent">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left text-muted-foreground"
              >
                <Plus className="h-3.5 w-3.5" />
                Others...
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
