"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

type Subprocessor = {
  id: string;
  name: string;
  service: string;
  purpose: string;
  dataCategories: string;
  location: string | null;
  status: "ACTIVE" | "INACTIVE";
  effectiveDate: string | null;
  referenceUrl: string | null;
};

function inputClass() {
  return "w-full bg-[#1a1a1a] border border-white/20 rounded-md px-3 py-2 text-sm text-white placeholder:text-[#555]";
}

function SubprocessorForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [service, setService] = useState("");
  const [purpose, setPurpose] = useState("");
  const [dataCategories, setDataCategories] = useState("");
  const [location, setLocation] = useState("");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/superadmin/subprocessors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, service, purpose, dataCategories,
          location: location || undefined,
          referenceUrl: referenceUrl || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to save.");
      onDone();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-[#111] p-6 space-y-4 mb-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs text-[#888]">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Vercel" className={inputClass()} />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-[#888]">Service</label>
          <input value={service} onChange={(e) => setService(e.target.value)} placeholder="Hosting" className={inputClass()} />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs text-[#888]">Purpose</label>
        <input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Application hosting and edge network" className={inputClass()} />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-[#888]">Data Categories</label>
        <input value={dataCategories} onChange={(e) => setDataCategories(e.target.value)} placeholder="All data in transit; request logs" className={inputClass()} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs text-[#888]">Location (optional)</label>
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="United States" className={inputClass()} />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-[#888]">Reference URL (optional)</label>
          <input value={referenceUrl} onChange={(e) => setReferenceUrl(e.target.value)} placeholder="https://vercel.com/legal/privacy-policy" className={inputClass()} />
        </div>
      </div>
      {error && <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">{error}</div>}
      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-[#888] hover:text-white transition-colors">Cancel</button>
        <button
          type="button"
          onClick={submit}
          disabled={submitting || !name.trim() || !service.trim() || !purpose.trim() || !dataCategories.trim()}
          className="rounded-md bg-white text-black hover:bg-[#e0e0e0] transition-colors px-4 py-2 text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Add Subprocessor
        </button>
      </div>
    </div>
  );
}

export function SubprocessorsClient({ initialSubprocessors }: { initialSubprocessors: Subprocessor[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function toggleStatus(sp: Subprocessor) {
    setBusyId(sp.id);
    try {
      await fetch(`/api/superadmin/subprocessors/${sp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: sp.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" }),
      });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {!adding && (
          <button onClick={() => setAdding(true)} className="text-xs rounded-md bg-white text-black hover:bg-[#e0e0e0] transition-colors px-3 py-1.5 font-semibold">
            + Add Subprocessor
          </button>
        )}
      </div>
      {adding && <SubprocessorForm onDone={() => { setAdding(false); router.refresh(); }} onCancel={() => setAdding(false)} />}

      <div className="space-y-2">
        {initialSubprocessors.map((sp) => (
          <div key={sp.id} className="rounded-lg border border-white/10 bg-[#0a0a0a] p-4 space-y-1.5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <span className="font-medium text-sm">{sp.name}</span>
                <span className="text-xs text-[#666]">{sp.service}</span>
                <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded shrink-0 ${sp.status === "ACTIVE" ? "bg-emerald-500/20 text-emerald-400" : "bg-[#222] text-[#666]"}`}>
                  {sp.status}
                </span>
              </div>
              <button
                onClick={() => toggleStatus(sp)}
                disabled={busyId === sp.id}
                className="rounded-md border border-white/20 hover:bg-white hover:text-black transition-colors px-2.5 py-1 text-xs font-semibold disabled:opacity-50 shrink-0 flex items-center gap-1.5"
              >
                {busyId === sp.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {sp.status === "ACTIVE" ? "Deactivate" : "Reactivate"}
              </button>
            </div>
            <p className="text-xs text-[#999]">{sp.purpose}</p>
            <p className="text-xs text-[#666]">Data: {sp.dataCategories}{sp.location ? ` · Location: ${sp.location}` : ""}</p>
            {sp.referenceUrl && (
              <a href={sp.referenceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-[#888] hover:text-white underline">
                {sp.referenceUrl}
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
