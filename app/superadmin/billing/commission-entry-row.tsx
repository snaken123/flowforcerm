"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

type Entry = {
  id: string;
  amountCentavos: number;
  commissionPercent: number;
  paidOutAt: string | null;
  createdAt: string;
  agent: { name: string };
  tenant: { name: string };
};

export function CommissionEntryRow({ entry }: { entry: Entry }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"mark_paid" | "disburse" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(action: "mark_paid" | "disburse") {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(`/api/superadmin/commission-entries/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Failed");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <tr className="border-b border-white/5 last:border-0 align-top">
      <td className="px-4 py-3">{entry.agent.name}</td>
      <td className="px-4 py-3 text-[#888]">{entry.tenant.name}</td>
      <td className="px-4 py-3 text-[#888]">{entry.commissionPercent}%</td>
      <td className="px-4 py-3">₱{(entry.amountCentavos / 100).toFixed(2)}</td>
      <td className="px-4 py-3 text-[#666]">{new Date(entry.createdAt).toLocaleDateString()}</td>
      <td className="px-4 py-3 text-right">
        {entry.paidOutAt ? (
          <span className="text-xs text-emerald-400">
            Paid {new Date(entry.paidOutAt).toLocaleDateString()}
          </span>
        ) : (
          <div className="flex flex-col items-end gap-1">
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => act("disburse")}
                disabled={busy !== null}
                className="rounded-md bg-white text-black px-3 py-1.5 text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5"
              >
                {busy === "disburse" && <Loader2 className="h-3 w-3 animate-spin" />}
                Pay via Xendit
              </button>
              <button
                onClick={() => act("mark_paid")}
                disabled={busy !== null}
                className="rounded-md border border-white/20 hover:bg-white hover:text-black transition-colors px-3 py-1.5 text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5"
              >
                {busy === "mark_paid" && <Loader2 className="h-3 w-3 animate-spin" />}
                Mark Paid
              </button>
            </div>
            {error && <p className="text-xs text-destructive max-w-[220px] text-right">{error}</p>}
          </div>
        )}
      </td>
    </tr>
  );
}
