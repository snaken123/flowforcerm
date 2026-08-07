"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export function NewFlagForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/superadmin/flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, description: description || undefined }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Failed to create flag.");
        return;
      }
      setKey("");
      setDescription("");
      setOpen(false);
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-white text-black hover:bg-[#e0e0e0] transition-colors px-4 py-2 text-sm font-semibold"
      >
        + New Flag
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-white/10 bg-[#111] p-6 mb-6 grid grid-cols-2 gap-4">
      <div className="space-y-1">
        <label className="text-xs text-[#888]">Key</label>
        <input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="advanced_reports"
          className="w-full bg-[#1a1a1a] border border-white/20 rounded-md px-3 py-2 text-sm text-white placeholder:text-[#555] font-mono"
        />
        <p className="text-xs text-[#555]">Lowercase snake_case.</p>
      </div>
      <div className="space-y-1">
        <label className="text-xs text-[#888]">Description (optional)</label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enables the advanced analytics dashboard"
          className="w-full bg-[#1a1a1a] border border-white/20 rounded-md px-3 py-2 text-sm text-white placeholder:text-[#555]"
        />
      </div>

      {error && (
        <div className="col-span-2 rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="col-span-2 flex gap-3 justify-end">
        <button
          type="button"
          onClick={() => { setOpen(false); setError(null); }}
          className="px-4 py-2 text-sm text-[#888] hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting || !key.trim()}
          className="rounded-md bg-white text-black hover:bg-[#e0e0e0] transition-colors px-4 py-2 text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitting ? "Creating…" : "Create Flag"}
        </button>
      </div>
    </form>
  );
}
