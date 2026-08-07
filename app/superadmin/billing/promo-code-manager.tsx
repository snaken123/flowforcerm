"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

type PromoCode = {
  id: string;
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
  isActive: boolean;
  maxRedemptions: number | null;
  redemptionCount: number;
  _count: { subscriptions: number };
};

function formatValue(pc: PromoCode) {
  return pc.type === "PERCENT" ? `${pc.value}%` : `₱${(pc.value / 100).toFixed(2)}`;
}

export function PromoCodeManager({ promoCodes }: { promoCodes: PromoCode[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [type, setType] = useState<"PERCENT" | "FIXED">("PERCENT");
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/superadmin/promo-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          type,
          value: type === "FIXED" ? Math.round(Number(value) * 100) : Number(value),
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Failed to create promo code.");
        return;
      }
      setCode("");
      setValue("");
      setOpen(false);
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(pc: PromoCode) {
    setTogglingId(pc.id);
    try {
      await fetch(`/api/superadmin/promo-codes/${pc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !pc.isActive }),
      });
      router.refresh();
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wide">Promo Codes</h2>
        <button
          onClick={() => setOpen((o) => !o)}
          className="rounded-md bg-white text-black hover:bg-[#e0e0e0] transition-colors px-4 py-2 text-sm font-semibold"
        >
          {open ? "Cancel" : "+ New Code"}
        </button>
      </div>

      {open && (
        <form onSubmit={onCreate} className="rounded-xl border border-white/10 bg-[#111] p-6 mb-6 grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-[#888]">Code</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="LAUNCH20"
              className="w-full bg-[#1a1a1a] border border-white/20 rounded-md px-3 py-2 text-sm text-white placeholder:text-[#555] font-mono"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-[#888]">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "PERCENT" | "FIXED")}
              className="w-full bg-[#1a1a1a] border border-white/20 rounded-md px-3 py-2 text-sm text-white"
            >
              <option value="PERCENT">Percent off</option>
              <option value="FIXED">Fixed amount off (₱)</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-[#888]">{type === "PERCENT" ? "Percent (0-100)" : "Amount (₱)"}</label>
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={type === "PERCENT" ? "20" : "500"}
              className="w-full bg-[#1a1a1a] border border-white/20 rounded-md px-3 py-2 text-sm text-white placeholder:text-[#555]"
            />
          </div>

          {error && (
            <div className="col-span-3 rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="col-span-3 flex justify-end">
            <button
              type="submit"
              disabled={submitting || !code.trim() || !value}
              className="rounded-md bg-white text-black hover:bg-[#e0e0e0] transition-colors px-4 py-2 text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? "Creating…" : "Create Code"}
            </button>
          </div>
        </form>
      )}

      {promoCodes.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-[#111] p-12 text-center text-[#666]">No promo codes yet.</div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-[#111] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-[#888] uppercase text-xs tracking-wide">
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Discount</th>
                <th className="px-4 py-3 font-medium">Used By</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {promoCodes.map((pc) => (
                <tr key={pc.id} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3 font-mono">{pc.code}</td>
                  <td className="px-4 py-3 text-[#888]">{formatValue(pc)}</td>
                  <td className="px-4 py-3 text-[#888]">
                    {pc._count.subscriptions} gym{pc._count.subscriptions === 1 ? "" : "s"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        "inline-block rounded-full px-2 py-0.5 text-xs font-medium " +
                        (pc.isActive ? "bg-emerald-500/10 text-emerald-400" : "bg-white/10 text-[#888]")
                      }
                    >
                      {pc.isActive ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => toggleActive(pc)}
                      disabled={togglingId === pc.id}
                      className="text-xs text-[#888] hover:text-white transition-colors disabled:opacity-50"
                    >
                      {togglingId === pc.id ? "…" : pc.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
