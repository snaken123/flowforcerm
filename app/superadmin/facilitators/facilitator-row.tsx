"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

type Facilitator = { id: string; name: string; email: string | null; phone: string | null; isActive: boolean };

export function FacilitatorRow({ facilitator, tenantCount }: { facilitator: Facilitator; tenantCount: number }) {
  const router = useRouter();
  const [toggling, setToggling] = useState(false);

  async function toggleActive() {
    setToggling(true);
    try {
      await fetch(`/api/superadmin/facilitators/${facilitator.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !facilitator.isActive }),
      });
      router.refresh();
    } finally {
      setToggling(false);
    }
  }

  return (
    <tr className="border-b border-white/5 last:border-0">
      <td className="px-4 py-3">{facilitator.name}</td>
      <td className="px-4 py-3 text-[#888]">{facilitator.email ?? "—"}</td>
      <td className="px-4 py-3 text-[#888]">{facilitator.phone ?? "—"}</td>
      <td className="px-4 py-3 text-[#888]">{tenantCount}</td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={toggleActive}
          disabled={toggling}
          className={
            "rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5 ml-auto " +
            (facilitator.isActive
              ? "border-white/20 hover:bg-white hover:text-black"
              : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10")
          }
        >
          {toggling && <Loader2 className="h-3 w-3 animate-spin" />}
          {facilitator.isActive ? "Deactivate" : "Activate"}
        </button>
      </td>
    </tr>
  );
}
