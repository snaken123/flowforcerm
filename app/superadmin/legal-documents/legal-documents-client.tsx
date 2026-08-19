"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Eye, X } from "lucide-react";
import { SanitizedMarkdown } from "@/components/legal/sanitized-markdown";

type LegalDocument = {
  id: string;
  type: string;
  title: string;
  version: string;
  content: string;
  contentHash: string | null;
  status: "DRAFT" | "PUBLISHED" | "SUPERSEDED" | "ARCHIVED";
  summaryOfChanges: string | null;
  effectiveDate: string | null;
  publishedAt: string | null;
  supersededAt: string | null;
  createdAt: string;
};

const TYPES = [
  { key: "TERMS_OF_SERVICE", label: "Terms of Service" },
  { key: "PRIVACY_POLICY", label: "Privacy Policy" },
  { key: "DATA_PROCESSING_AGREEMENT", label: "Data Processing Agreement" },
  { key: "ACCEPTABLE_USE_POLICY", label: "Acceptable Use Policy" },
] as const;

const STATUS_STYLE: Record<string, string> = {
  DRAFT: "bg-[#333] text-[#ccc]",
  PUBLISHED: "bg-emerald-500/20 text-emerald-400",
  SUPERSEDED: "bg-amber-500/20 text-amber-400",
  ARCHIVED: "bg-[#222] text-[#666]",
};

function inputClass() {
  return "w-full bg-[#1a1a1a] border border-white/20 rounded-md px-3 py-2 text-sm text-white placeholder:text-[#555]";
}

// ── Create/edit form ──────────────────────────────────────────────────────────

function DocumentForm({
  type,
  editing,
  onDone,
  onCancel,
}: {
  type: string;
  editing?: LegalDocument;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(editing?.title ?? "");
  const [version, setVersion] = useState(editing?.version ?? "1.0");
  const [content, setContent] = useState(
    editing?.content ??
      "**DRAFT / PLACEHOLDER — REQUIRES REVIEW AND APPROVAL BY QUALIFIED PHILIPPINE LEGAL/PRIVACY COUNSEL BEFORE COMMERCIAL USE.**\n\n"
  );
  const [summaryOfChanges, setSummaryOfChanges] = useState(editing?.summaryOfChanges ?? "");
  const [effectiveDate, setEffectiveDate] = useState(editing?.effectiveDate?.slice(0, 10) ?? "");
  const [preview, setPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setSubmitting(true);
    setError("");
    try {
      const url = editing ? `/api/superadmin/legal-documents/${editing.id}` : "/api/superadmin/legal-documents";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editing ? {} : { type }),
          title,
          version,
          content,
          summaryOfChanges: summaryOfChanges || undefined,
          effectiveDate: effectiveDate || undefined,
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
    <div className="rounded-xl border border-white/10 bg-[#111] p-6 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs text-[#888]">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="FlowForceRM Terms of Service" className={inputClass()} />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-[#888]">Version</label>
          <input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.0" className={inputClass()} />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs text-[#888]">Summary of Changes (optional)</label>
        <input value={summaryOfChanges} onChange={(e) => setSummaryOfChanges(e.target.value)} placeholder="What changed from the previous version" className={inputClass()} />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-[#888]">Effective Date (optional)</label>
        <input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} className={inputClass()} />
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-xs text-[#888]">Content (Markdown)</label>
          <button type="button" onClick={() => setPreview((p) => !p)} className="text-xs text-[#888] hover:text-white flex items-center gap-1">
            <Eye className="h-3 w-3" /> {preview ? "Edit" : "Preview"}
          </button>
        </div>
        {preview ? (
          <div className="h-64 overflow-y-auto rounded-md bg-[#1a1a1a] border border-white/20 p-4 text-sm text-[#ddd]">
            <SanitizedMarkdown content={content} className="space-y-3 [&_ul]:list-disc [&_ul]:pl-5 [&_strong]:font-semibold" />
          </div>
        ) : (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={12}
            className={`${inputClass()} font-mono resize-y`}
          />
        )}
      </div>

      {error && <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">{error}</div>}

      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-[#888] hover:text-white transition-colors">
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={submitting || !title.trim() || !version.trim() || !content.trim()}
          className="rounded-md bg-white text-black hover:bg-[#e0e0e0] transition-colors px-4 py-2 text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {editing ? "Save Draft" : "Create Draft"}
        </button>
      </div>
    </div>
  );
}

// ── Stats panel ────────────────────────────────────────────────────────────────

function StatsPanel({ documentId, onClose }: { documentId: string; onClose: () => void }) {
  const [stats, setStats] = useState<{ totalAccepted: number; perTenant: { subdomain: string; accepted: number }[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/superadmin/legal-documents/${documentId}/stats`)
      .then((r) => r.json())
      .then(setStats)
      .finally(() => setLoading(false));
  }, [documentId]);

  return (
    <div className="rounded-xl border border-white/10 bg-[#111] p-6 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Acceptance Stats</p>
        <button onClick={onClose} className="text-[#888] hover:text-white"><X className="h-4 w-4" /></button>
      </div>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-[#666]" />
      ) : stats ? (
        <div className="space-y-2 text-sm">
          <p className="text-2xl font-bold">{stats.totalAccepted} <span className="text-sm font-normal text-[#888]">total accepted</span></p>
          <div className="divide-y divide-white/5">
            {stats.perTenant.map((t) => (
              <div key={t.subdomain} className="flex justify-between py-1.5 text-[#ccc]">
                <span>{t.subdomain}</span>
                <span>{t.accepted}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-[#666]">Failed to load.</p>
      )}
    </div>
  );
}

// ── Document row ───────────────────────────────────────────────────────────────

function DocumentRow({
  doc,
  onEdit,
  onPublished,
  onArchived,
  onStats,
}: {
  doc: LegalDocument;
  onEdit: () => void;
  onPublished: () => void;
  onArchived: () => void;
  onStats: () => void;
}) {
  const [viewing, setViewing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function act(path: "publish" | "archive", after: () => void) {
    if (path === "publish" && !confirm(`Publish ${doc.title} v${doc.version}? This will supersede the current published version, if any.`)) return;
    if (path === "archive" && !confirm(`Archive ${doc.title} v${doc.version}?`)) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/superadmin/legal-documents/${doc.id}/${path}`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed.");
      after();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-white/10 bg-[#0a0a0a] p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{doc.title}</span>
          <span className="text-xs text-[#666]">v{doc.version}</span>
          <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded ${STATUS_STYLE[doc.status]}`}>{doc.status}</span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <button onClick={() => setViewing((v) => !v)} className="text-[#888] hover:text-white">{viewing ? "Hide" : "View"}</button>
          {doc.status === "DRAFT" && (
            <>
              <button onClick={onEdit} className="text-[#888] hover:text-white">Edit</button>
              <button onClick={() => act("publish", onPublished)} disabled={busy} className="text-emerald-400 hover:text-emerald-300">Publish</button>
              <button onClick={() => act("archive", onArchived)} disabled={busy} className="text-[#888] hover:text-white">Archive</button>
            </>
          )}
          {doc.status === "SUPERSEDED" && (
            <button onClick={() => act("archive", onArchived)} disabled={busy} className="text-[#888] hover:text-white">Archive</button>
          )}
          {(doc.status === "PUBLISHED" || doc.status === "SUPERSEDED") && (
            <button onClick={onStats} className="text-[#888] hover:text-white">Stats</button>
          )}
        </div>
      </div>
      {doc.summaryOfChanges && <p className="text-xs text-[#666]">{doc.summaryOfChanges}</p>}
      {doc.contentHash && <p className="text-[10px] font-mono text-[#444]">SHA-256: {doc.contentHash.slice(0, 16)}…</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
      {viewing && (
        <div className="mt-2 max-h-64 overflow-y-auto rounded-md bg-[#111] border border-white/10 p-4 text-sm text-[#ccc]">
          <SanitizedMarkdown content={doc.content} className="space-y-3 [&_ul]:list-disc [&_ul]:pl-5 [&_strong]:font-semibold" />
        </div>
      )}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export function LegalDocumentsClient({ initialDocuments }: { initialDocuments: LegalDocument[] }) {
  const router = useRouter();
  const [creatingType, setCreatingType] = useState<string | null>(null);
  const [editingDoc, setEditingDoc] = useState<LegalDocument | null>(null);
  const [statsDocId, setStatsDocId] = useState<string | null>(null);

  function refresh() {
    setCreatingType(null);
    setEditingDoc(null);
    router.refresh();
  }

  return (
    <div className="space-y-10">
      {TYPES.map(({ key, label }) => {
        const docs = initialDocuments.filter((d) => d.type === key);
        return (
          <div key={key} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[#aaa]">{label}</h2>
              {creatingType !== key && (
                <button
                  onClick={() => setCreatingType(key)}
                  className="text-xs rounded-md bg-white text-black hover:bg-[#e0e0e0] transition-colors px-3 py-1.5 font-semibold"
                >
                  + New Draft
                </button>
              )}
            </div>

            {creatingType === key && <DocumentForm type={key} onDone={refresh} onCancel={() => setCreatingType(null)} />}
            {editingDoc && editingDoc.type === key && (
              <DocumentForm type={key} editing={editingDoc} onDone={refresh} onCancel={() => setEditingDoc(null)} />
            )}

            {docs.length === 0 ? (
              <p className="text-sm text-[#555]">No documents yet.</p>
            ) : (
              <div className="space-y-2">
                {docs.map((doc) => (
                  <div key={doc.id}>
                    <DocumentRow
                      doc={doc}
                      onEdit={() => setEditingDoc(doc)}
                      onPublished={refresh}
                      onArchived={refresh}
                      onStats={() => setStatsDocId(statsDocId === doc.id ? null : doc.id)}
                    />
                    {statsDocId === doc.id && <StatsPanel documentId={doc.id} onClose={() => setStatsDocId(null)} />}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
