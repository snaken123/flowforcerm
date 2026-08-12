"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

type ActivationResult = { adminEmail: string; tempPassword: string; emailSent: boolean } | { error: string };
type DomainResult = { verified: boolean } | { error: string };

export function TenantRowActions({ tenantId }: { tenantId: string }) {
  const [activationLoading, setActivationLoading] = useState(false);
  const [activationResult, setActivationResult] = useState<ActivationResult | null>(null);
  const [domainLoading, setDomainLoading] = useState(false);
  const [domainResult, setDomainResult] = useState<DomainResult | null>(null);

  async function resendActivation() {
    setActivationLoading(true);
    setActivationResult(null);
    try {
      const res = await fetch(`/api/superadmin/tenants/${tenantId}/resend-activation`, { method: "POST" });
      const body = await res.json();
      setActivationResult(res.ok ? body : { error: body.error ?? "Failed to resend." });
    } catch {
      setActivationResult({ error: "Network error — please try again." });
    } finally {
      setActivationLoading(false);
    }
  }

  async function retryDomain() {
    setDomainLoading(true);
    setDomainResult(null);
    try {
      const res = await fetch(`/api/superadmin/tenants/${tenantId}/retry-domain`, { method: "POST" });
      const body = await res.json();
      setDomainResult(res.ok ? body : { error: body.error ?? "Failed to set up domain." });
    } catch {
      setDomainResult({ error: "Network error — please try again." });
    } finally {
      setDomainLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-col items-end gap-1">
        <button
          onClick={resendActivation}
          disabled={activationLoading}
          className="rounded-md border border-white/20 hover:bg-white hover:text-black transition-colors px-3 py-1.5 text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5"
        >
          {activationLoading && <Loader2 className="h-3 w-3 animate-spin" />}
          Resend Activation
        </button>
        {activationResult && "error" in activationResult && (
          <p className="text-xs text-destructive max-w-[220px] text-right">{activationResult.error}</p>
        )}
        {activationResult && !("error" in activationResult) && (
          <p className="text-xs text-[#888] max-w-[220px] text-right">
            {activationResult.emailSent
              ? `Sent to ${activationResult.adminEmail}`
              : `Email failed — temp password: ${activationResult.tempPassword}`}
          </p>
        )}
      </div>

      <div className="flex flex-col items-end gap-1">
        <button
          onClick={retryDomain}
          disabled={domainLoading}
          className="rounded-md border border-white/20 hover:bg-white hover:text-black transition-colors px-3 py-1.5 text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5"
        >
          {domainLoading && <Loader2 className="h-3 w-3 animate-spin" />}
          Retry Domain Setup
        </button>
        {domainResult && "error" in domainResult && (
          <p className="text-xs text-destructive max-w-[220px] text-right">{domainResult.error}</p>
        )}
        {domainResult && !("error" in domainResult) && (
          <p className="text-xs text-[#888] max-w-[220px] text-right">
            {domainResult.verified ? "Domain is live" : "Added, but not verified yet — try again shortly"}
          </p>
        )}
      </div>
    </div>
  );
}
