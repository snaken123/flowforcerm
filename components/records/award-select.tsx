"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Plus, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/use-toast";

// "Award" field: a dropdown of radio-button options (Medal/Certifications/PR/Belt by
// default), persisted via /api/records/award-options. Picking "Others…" reveals an
// inline text box; saving it both selects the value and adds it to the shared list for
// everyone going forward. Modeled on TrainingPlanCellSelect's exact interaction pattern,
// but renders real <input type="radio"> rows per spec, and only admins/coaches
// (canManage) can add or delete options — members pick from the list but don't edit it.
export function AwardSelect({
  value,
  onChange,
  canManage,
}: {
  value: string;
  onChange: (value: string) => void;
  canManage: boolean;
}) {
  const [options, setOptions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newOption, setNewOption] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/records/award-options")
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
    const res = await fetch("/api/records/award-options", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ options: next }),
    });
    if (!res.ok) {
      toast({ variant: "destructive", title: "Only admins/coaches can manage award types" });
      return false;
    }
    setOptions(next);
    return true;
  }

  async function handleAddNew() {
    const name = newOption.trim();
    if (!name) return;
    if (options.includes(name)) {
      onChange(name);
      setAdding(false);
      setNewOption("");
      setOpen(false);
      return;
    }
    const ok = await persist([...options, name]);
    if (ok) {
      onChange(name);
      setAdding(false);
      setNewOption("");
      setOpen(false);
    }
  }

  async function handleDelete(opt: string, e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (!confirm(`Remove "${opt}" from the award list?`)) return;
    const ok = await persist(options.filter((o) => o !== opt));
    if (ok && value === opt) onChange("");
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-left ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className={value ? "" : "text-muted-foreground"}>{value || "Select award type…"}</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[200px] rounded-md border border-border bg-white dark:bg-zinc-900 shadow-md">
          <div className="max-h-52 overflow-y-auto py-1">
            {options.map((opt) => (
              <div key={opt} className="flex items-center hover:bg-accent">
                <label className="flex-1 flex items-center gap-2 px-3 py-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="award-select"
                    checked={value === opt}
                    onChange={() => { onChange(opt); setOpen(false); }}
                    className="h-3.5 w-3.5 accent-primary"
                  />
                  {opt}
                </label>
                {canManage && (
                  <button
                    type="button"
                    title={`Remove ${opt}`}
                    onClick={(e) => handleDelete(opt, e)}
                    className="px-2 py-2 text-muted-foreground hover:text-destructive"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {canManage && (
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
                    placeholder="New award type..."
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
          )}
        </div>
      )}
    </div>
  );
}
