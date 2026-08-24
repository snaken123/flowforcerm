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
  facilitator: { name: string };
  tenant: { name: string };
};

export function CommissionEntryRow({ entry }: { entry: Entry }) {
  const router = useRouter();
  const [marking, setMarking] = useState(false);

  async function markPaid() {
    setMarking(true);
    try {
      await fetch(`/api/superadmin/commission-entries/${entry.id}`, { method: "PATCH" });
      router.refresh();
    } finally {
      setMarking(false);
    }
  }

  return (
    <tr className="border-b border-white/5 last:border-0">
      <td className="px-4 py-3">{entry.facilitator.name}</td>
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
          <button
            onClick={markPaid}
            disabled={marking}
            className="rounded-md border border-white/20 hover:bg-white hover:text-black transition-colors px-3 py-1.5 text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5 ml-auto"
          >
            {marking && <Loader2 className="h-3 w-3 animate-spin" />}
            Mark Paid Out
          </button>
        )}
      </td>
    </tr>
  );
}
