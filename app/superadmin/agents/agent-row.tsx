"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil } from "lucide-react";

type Agent = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  bankCode: string | null;
  bankAccountNumber: string | null;
  bankAccountHolderName: string | null;
};

export function AgentRow({ agent, tenantCount }: { agent: Agent; tenantCount: number }) {
  const router = useRouter();
  const [toggling, setToggling] = useState(false);
  const [editingBank, setEditingBank] = useState(false);
  const [savingBank, setSavingBank] = useState(false);
  const [bankCode, setBankCode] = useState(agent.bankCode ?? "");
  const [bankAccountNumber, setBankAccountNumber] = useState(agent.bankAccountNumber ?? "");
  const [bankAccountHolderName, setBankAccountHolderName] = useState(agent.bankAccountHolderName ?? agent.name);

  async function toggleActive() {
    setToggling(true);
    try {
      await fetch(`/api/superadmin/agents/${agent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !agent.isActive }),
      });
      router.refresh();
    } finally {
      setToggling(false);
    }
  }

  async function saveBank() {
    setSavingBank(true);
    try {
      await fetch(`/api/superadmin/agents/${agent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankCode, bankAccountNumber, bankAccountHolderName }),
      });
      setEditingBank(false);
      router.refresh();
    } finally {
      setSavingBank(false);
    }
  }

  const hasBankDetails = agent.bankCode && agent.bankAccountNumber && agent.bankAccountHolderName;

  return (
    <tr className="border-b border-white/5 last:border-0 align-top">
      <td className="px-4 py-3">{agent.name}</td>
      <td className="px-4 py-3 text-[#888]">
        <div>{agent.email ?? "—"}</div>
        <div className="text-xs text-[#555]">{agent.phone ?? "—"}</div>
      </td>
      <td className="px-4 py-3 text-[#888]">
        {editingBank ? (
          <div className="space-y-1.5 max-w-[220px]">
            <input
              value={bankAccountHolderName}
              onChange={(e) => setBankAccountHolderName(e.target.value)}
              placeholder="Account holder name"
              className="w-full bg-[#1a1a1a] border border-white/20 rounded-md px-2 py-1 text-xs text-white placeholder:text-[#555]"
            />
            <input
              value={bankCode}
              onChange={(e) => setBankCode(e.target.value)}
              placeholder="Bank code (e.g. BDO, BPI)"
              className="w-full bg-[#1a1a1a] border border-white/20 rounded-md px-2 py-1 text-xs text-white placeholder:text-[#555]"
            />
            <input
              value={bankAccountNumber}
              onChange={(e) => setBankAccountNumber(e.target.value)}
              placeholder="Account number"
              className="w-full bg-[#1a1a1a] border border-white/20 rounded-md px-2 py-1 text-xs text-white placeholder:text-[#555]"
            />
            <div className="flex gap-2">
              <button
                onClick={saveBank}
                disabled={savingBank}
                className="rounded-md bg-white text-black px-2 py-1 text-xs font-semibold disabled:opacity-50 flex items-center gap-1"
              >
                {savingBank && <Loader2 className="h-3 w-3 animate-spin" />}
                Save
              </button>
              <button
                onClick={() => setEditingBank(false)}
                className="text-xs text-[#888] hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : hasBankDetails ? (
          <div>
            <div>{agent.bankCode} — ••••{agent.bankAccountNumber!.slice(-4)}</div>
            <div className="text-xs text-[#555]">{agent.bankAccountHolderName}</div>
            <button
              onClick={() => setEditingBank(true)}
              className="text-xs text-[#666] hover:text-white transition-colors flex items-center gap-1 mt-0.5"
            >
              <Pencil className="h-2.5 w-2.5" /> Edit
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditingBank(true)}
            className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
          >
            + Add bank details
          </button>
        )}
      </td>
      <td className="px-4 py-3 text-[#888]">{tenantCount}</td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={toggleActive}
          disabled={toggling}
          className={
            "rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5 ml-auto " +
            (agent.isActive
              ? "border-white/20 hover:bg-white hover:text-black"
              : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10")
          }
        >
          {toggling && <Loader2 className="h-3 w-3 animate-spin" />}
          {agent.isActive ? "Deactivate" : "Activate"}
        </button>
      </td>
    </tr>
  );
}
