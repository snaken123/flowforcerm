"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";

type Flag = { key: string; description: string | null };
type Tenant = { id: string; name: string; subdomain: string; activeFlagKeys: string[] };

export function FlagMatrix({ flags, tenants }: { flags: Flag[]; tenants: Tenant[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null); // `${tenantId}:${flagKey}`
  const [error, setError] = useState<string | null>(null);

  async function toggle(tenantId: string, flagKey: string, enabled: boolean) {
    const cellKey = `${tenantId}:${flagKey}`;
    setPending(cellKey);
    setError(null);
    try {
      const res = await fetch(`/api/superadmin/tenants/${tenantId}/flags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flagKey, enabled }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Failed to update flag.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setPending(null);
    }
  }

  if (flags.length === 0) {
    return <div className="rounded-xl border border-white/10 bg-[#111] p-12 text-center text-[#666]">No flags yet — create one above.</div>;
  }
  if (tenants.length === 0) {
    return <div className="rounded-xl border border-white/10 bg-[#111] p-12 text-center text-[#666]">No tenants yet.</div>;
  }

  return (
    <div className="rounded-xl border border-white/10 bg-[#111] overflow-x-auto">
      {error && (
        <div className="m-4 rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 text-left text-[#888] uppercase text-xs tracking-wide">
            <th className="px-4 py-3 font-medium sticky left-0 bg-[#111]">Gym</th>
            {flags.map((f) => (
              <th key={f.key} className="px-4 py-3 font-medium text-center" title={f.description ?? undefined}>
                {f.key}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tenants.map((t) => (
            <tr key={t.id} className="border-b border-white/5 last:border-0">
              <td className="px-4 py-3 sticky left-0 bg-[#111]">
                <div>{t.name}</div>
                <div className="text-[#666] text-xs">{t.subdomain}.flowforcerm.com</div>
              </td>
              {flags.map((f) => {
                const enabled = t.activeFlagKeys.includes(f.key);
                const cellKey = `${t.id}:${f.key}`;
                const isPending = pending === cellKey;
                return (
                  <td key={f.key} className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggle(t.id, f.key, !enabled)}
                      disabled={isPending}
                      className={
                        "inline-flex h-6 w-6 items-center justify-center rounded border transition-colors disabled:opacity-50 " +
                        (enabled
                          ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                          : "bg-white/5 border-white/20 text-transparent hover:border-white/40")
                      }
                      aria-label={`${enabled ? "Disable" : "Enable"} ${f.key} for ${t.name}`}
                    >
                      {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin text-white" /> : <Check className="h-4 w-4" />}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
