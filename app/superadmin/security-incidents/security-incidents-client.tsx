"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";

type Tenant = { id: string; name: string; subdomain: string };
type Incident = {
  id: string;
  detectedAt: string;
  occurredAt: string | null;
  affectedSystems: string;
  dataCategories: string;
  affectedRecordsEstimate: number | null;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "OPEN" | "CONTAINED" | "INVESTIGATING" | "RESOLVED";
  remediation: string | null;
  notificationStatus: string | null;
  resolvedAt: string | null;
  affectedTenants: { tenant: Tenant }[];
};

const SEVERITY_STYLE: Record<string, string> = {
  LOW: "bg-[#333] text-[#ccc]",
  MEDIUM: "bg-amber-500/20 text-amber-400",
  HIGH: "bg-orange-500/20 text-orange-400",
  CRITICAL: "bg-red-500/20 text-red-400",
};

const STATUS_STYLE: Record<string, string> = {
  OPEN: "bg-red-500/20 text-red-400",
  CONTAINED: "bg-amber-500/20 text-amber-400",
  INVESTIGATING: "bg-blue-500/20 text-blue-400",
  RESOLVED: "bg-emerald-500/20 text-emerald-400",
};

function inputClass() {
  return "w-full bg-[#1a1a1a] border border-white/20 rounded-md px-3 py-2 text-sm text-white placeholder:text-[#555]";
}

function NewIncidentForm({ tenants, onDone, onCancel }: { tenants: Tenant[]; onDone: () => void; onCancel: () => void }) {
  const [detectedAt, setDetectedAt] = useState(new Date().toISOString().slice(0, 16));
  const [affectedSystems, setAffectedSystems] = useState("");
  const [dataCategories, setDataCategories] = useState("");
  const [affectedRecordsEstimate, setAffectedRecordsEstimate] = useState("");
  const [severity, setSeverity] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("MEDIUM");
  const [selectedTenantIds, setSelectedTenantIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/superadmin/security-incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          detectedAt: new Date(detectedAt).toISOString(),
          affectedSystems,
          dataCategories,
          affectedRecordsEstimate: affectedRecordsEstimate ? parseInt(affectedRecordsEstimate) : undefined,
          severity,
          affectedTenantIds: [...selectedTenantIds],
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs text-[#888]">Detected At</label>
          <input type="datetime-local" value={detectedAt} onChange={(e) => setDetectedAt(e.target.value)} className={inputClass()} />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-[#888]">Severity</label>
          <select value={severity} onChange={(e) => setSeverity(e.target.value as any)} className={inputClass()}>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs text-[#888]">Affected Systems</label>
        <input value={affectedSystems} onChange={(e) => setAffectedSystems(e.target.value)} placeholder="e.g. Member photo storage (R2 bucket)" className={inputClass()} />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-[#888]">Data Categories</label>
        <input value={dataCategories} onChange={(e) => setDataCategories(e.target.value)} placeholder="e.g. Names, phone numbers" className={inputClass()} />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-[#888]">Affected Records Estimate (optional)</label>
        <input type="number" min="0" value={affectedRecordsEstimate} onChange={(e) => setAffectedRecordsEstimate(e.target.value)} className={inputClass()} />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-[#888]">Affected Tenants</label>
        <div className="max-h-32 overflow-y-auto rounded-md border border-white/20 bg-[#1a1a1a] p-2 space-y-1">
          {tenants.map((t) => {
            const checked = selectedTenantIds.has(t.id);
            return (
              <button
                type="button"
                key={t.id}
                onClick={() => setSelectedTenantIds((prev) => {
                  const next = new Set(prev);
                  if (checked) next.delete(t.id); else next.add(t.id);
                  return next;
                })}
                className="flex items-center gap-2 text-sm text-[#ccc] cursor-pointer w-full text-left px-1 py-0.5 rounded hover:bg-white/5"
              >
                <span
                  className={
                    "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors " +
                    (checked ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" : "bg-white/5 border-white/20 text-transparent")
                  }
                >
                  <Check className="h-3 w-3" />
                </span>
                {t.name} ({t.subdomain})
              </button>
            );
          })}
        </div>
      </div>
      {error && <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">{error}</div>}
      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-[#888] hover:text-white transition-colors">Cancel</button>
        <button
          type="button"
          onClick={submit}
          disabled={submitting || !affectedSystems.trim() || !dataCategories.trim()}
          className="rounded-md bg-white text-black hover:bg-[#e0e0e0] transition-colors px-4 py-2 text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Record Incident
        </button>
      </div>
    </div>
  );
}

function IncidentRow({ incident, onUpdated }: { incident: Incident; onUpdated: () => void }) {
  const [busy, setBusy] = useState(false);

  async function updateStatus(status: string) {
    setBusy(true);
    try {
      await fetch(`/api/superadmin/security-incidents/${incident.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      onUpdated();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-white/10 bg-[#0a0a0a] p-4 space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded shrink-0 ${SEVERITY_STYLE[incident.severity]}`}>{incident.severity}</span>
          <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded shrink-0 ${STATUS_STYLE[incident.status]}`}>{incident.status}</span>
          <span className="text-xs text-[#666]">Detected {new Date(incident.detectedAt).toLocaleString()}</span>
        </div>
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#666]" />
        ) : (
          <select
            value={incident.status}
            onChange={(e) => updateStatus(e.target.value)}
            className="bg-[#1a1a1a] border border-white/20 rounded-md px-2 py-1 text-xs text-white"
          >
            <option value="OPEN">Open</option>
            <option value="CONTAINED">Contained</option>
            <option value="INVESTIGATING">Investigating</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        )}
      </div>
      <p className="text-sm text-[#ccc]">{incident.affectedSystems}</p>
      <p className="text-xs text-[#888]">Data: {incident.dataCategories}{incident.affectedRecordsEstimate != null ? ` · ~${incident.affectedRecordsEstimate} records` : ""}</p>
      {incident.affectedTenants.length > 0 && (
        <p className="text-xs text-[#666]">
          Tenants: {incident.affectedTenants.map((t) => t.tenant.subdomain).join(", ")}
        </p>
      )}
    </div>
  );
}

export function SecurityIncidentsClient({ initialIncidents, tenants }: { initialIncidents: Incident[]; tenants: Tenant[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {!adding && (
          <button onClick={() => setAdding(true)} className="text-xs rounded-md bg-white text-black hover:bg-[#e0e0e0] transition-colors px-3 py-1.5 font-semibold">
            + Record Incident
          </button>
        )}
      </div>
      {adding && <NewIncidentForm tenants={tenants} onDone={() => { setAdding(false); router.refresh(); }} onCancel={() => setAdding(false)} />}

      {initialIncidents.length === 0 ? (
        <p className="text-sm text-[#555]">No incidents recorded.</p>
      ) : (
        <div className="space-y-2">
          {initialIncidents.map((i) => (
            <IncidentRow key={i.id} incident={i} onUpdated={() => router.refresh()} />
          ))}
        </div>
      )}
    </div>
  );
}
