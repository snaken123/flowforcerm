"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Minus, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/use-toast";

export function LocationSelect({
  value,
  onChange,
  canManage = true,
}: {
  value: string;
  onChange: (value: string) => void;
  canManage?: boolean;
}) {
  const [locations, setLocations] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newLocation, setNewLocation] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/admin/settings/class-locations")
      .then((r) => (r.ok ? r.json() : { locations: [] }))
      .then((d) => setLocations(d.locations ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setAdding(false);
        setNewLocation("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function persist(next: string[]) {
    const res = await fetch("/api/admin/settings/class-locations", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locations: next }),
    });
    if (!res.ok) {
      toast({ variant: "destructive", title: "Only admins can manage locations" });
      return false;
    }
    setLocations(next);
    return true;
  }

  async function handleAddNew() {
    const name = newLocation.trim();
    if (!name) return;
    if (locations.includes(name)) {
      onChange(name);
      setAdding(false);
      setNewLocation("");
      setOpen(false);
      return;
    }
    const ok = await persist([...locations, name]);
    if (ok) {
      onChange(name);
      setAdding(false);
      setNewLocation("");
      setOpen(false);
    }
  }

  async function handleDelete(loc: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Remove "${loc}" from the location list?`)) return;
    const ok = await persist(locations.filter((l) => l !== loc));
    if (ok && value === loc) onChange("");
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className={!value ? "text-muted-foreground" : ""}>{value || "Select location..."}</span>
        <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-white dark:bg-zinc-900 shadow-md">
          <div className="max-h-52 overflow-y-auto py-1">
            <button
              type="button"
              onClick={() => { onChange(""); setOpen(false); }}
              className="flex w-full items-center px-3 py-2 text-sm hover:bg-accent text-left text-muted-foreground"
            >
              Select location...
            </button>
            {locations.map((loc) => (
              <div key={loc} className="flex items-center hover:bg-accent">
                <button
                  type="button"
                  onClick={() => { onChange(loc); setOpen(false); }}
                  className="flex-1 px-3 py-2 text-sm text-left"
                >
                  {loc}
                </button>
                {canManage && (
                  <button
                    type="button"
                    title={`Remove ${loc}`}
                    onClick={(e) => handleDelete(loc, e)}
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
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); handleAddNew(); }
                      if (e.key === "Escape") { setAdding(false); setNewLocation(""); }
                    }}
                    placeholder="New location name..."
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
