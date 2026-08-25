"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export function NewAgentForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/superadmin/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email: email || undefined, phone: phone || undefined }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Failed to create agent.");
        return;
      }
      setName("");
      setEmail("");
      setPhone("");
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
        + New Agent
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-white/10 bg-[#111] p-6 mb-6 grid grid-cols-3 gap-4">
      <div className="space-y-1">
        <label className="text-xs text-[#888]">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Jane Dela Cruz"
          className="w-full bg-[#1a1a1a] border border-white/20 rounded-md px-3 py-2 text-sm text-white placeholder:text-[#555]"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-[#888]">Email (optional)</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jane@example.com"
          className="w-full bg-[#1a1a1a] border border-white/20 rounded-md px-3 py-2 text-sm text-white placeholder:text-[#555]"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-[#888]">Phone (optional)</label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="09171234567"
          className="w-full bg-[#1a1a1a] border border-white/20 rounded-md px-3 py-2 text-sm text-white placeholder:text-[#555]"
        />
      </div>

      <p className="col-span-3 text-xs text-[#555] -mt-2">
        Bank account details for commission payouts can be added after creation.
      </p>

      {error && (
        <div className="col-span-3 rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="col-span-3 flex gap-3 justify-end">
        <button
          type="button"
          onClick={() => { setOpen(false); setError(null); }}
          className="px-4 py-2 text-sm text-[#888] hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting || !name.trim()}
          className="rounded-md bg-white text-black hover:bg-[#e0e0e0] transition-colors px-4 py-2 text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitting ? "Creating…" : "Create Agent"}
        </button>
      </div>
    </form>
  );
}
