"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

type ActivationResult = { adminEmail: string; tempPassword: string; emailSent: boolean } | { error: string };
type DomainResult = { verified: boolean } | { error: string };

export function TenantRowActions({ tenantId, subdomain, name }: { tenantId: string; subdomain: string; name: string }) {
  const router = useRouter();
  const [activationLoading, setActivationLoading] = useState(false);
  const [activationResult, setActivationResult] = useState<ActivationResult | null>(null);
  const [domainLoading, setDomainLoading] = useState(false);
  const [domainResult, setDomainResult] = useState<DomainResult | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function deleteTenant() {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/superadmin/tenants/${tenantId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmSubdomain: deleteConfirmText.trim() }),
      });
      const body = await res.json();
      if (!res.ok) {
        setDeleteError(body.error ?? "Failed to delete gym.");
        return;
      }
      router.refresh();
    } catch {
      setDeleteError("Network error — please try again.");
    } finally {
      setDeleting(false);
    }
  }

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

      <div className="flex flex-col items-end gap-1">
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="rounded-md border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors px-3 py-1.5 text-xs font-semibold"
          >
            Delete Gym
          </button>
        ) : (
          <div className="w-64 rounded-md border border-red-500/40 bg-red-500/5 p-3 space-y-2">
            <p className="text-xs font-semibold text-red-400">
              This permanently deletes "{name}" and every member, payment, schedule, and record in its database. This cannot be undone — there is no backup or restore.
            </p>
            <p className="text-xs text-[#888]">
              Type <span className="font-mono text-white">{subdomain}</span> to confirm.
            </p>
            <input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={subdomain}
              className="w-full bg-[#1a1a1a] border border-white/20 rounded-md px-2 py-1 text-xs text-white font-mono placeholder:text-[#555]"
            />
            {deleteError && <p className="text-xs text-red-400">{deleteError}</p>}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(""); setDeleteError(null); }}
                className="px-2 py-1 text-xs text-[#888] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={deleteTenant}
                disabled={deleting || deleteConfirmText.trim() !== subdomain}
                className="rounded-md bg-red-600 hover:bg-red-500 transition-colors text-white px-3 py-1.5 text-xs font-semibold disabled:opacity-40 flex items-center gap-1.5"
              >
                {deleting && <Loader2 className="h-3 w-3 animate-spin" />}
                {deleting ? "Deleting…" : "Delete Permanently"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
