"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

type Result = { adminEmail: string; tempPassword: string; emailSent: boolean } | { error: string };

export function TenantRowActions({ tenantId }: { tenantId: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function resendActivation() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/superadmin/tenants/${tenantId}/resend-activation`, { method: "POST" });
      const body = await res.json();
      setResult(res.ok ? body : { error: body.error ?? "Failed to resend." });
    } catch {
      setResult({ error: "Network error — please try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={resendActivation}
        disabled={loading}
        className="rounded-md border border-white/20 hover:bg-white hover:text-black transition-colors px-3 py-1.5 text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5"
      >
        {loading && <Loader2 className="h-3 w-3 animate-spin" />}
        Resend Activation
      </button>
      {result && "error" in result && (
        <p className="text-xs text-destructive max-w-[220px] text-right">{result.error}</p>
      )}
      {result && !("error" in result) && (
        <p className="text-xs text-[#888] max-w-[220px] text-right">
          {result.emailSent
            ? `Sent to ${result.adminEmail}`
            : `Email failed — temp password: ${result.tempPassword}`}
        </p>
      )}
    </div>
  );
}
