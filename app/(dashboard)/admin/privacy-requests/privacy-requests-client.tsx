"use client";

import { useState, useCallback } from "react";
import { Loader2, Inbox, Check, X, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { toast } from "@/lib/use-toast";

type Request = {
  id: string;
  type: string;
  details: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  resolutionNotes: string | null;
  createdAt: string;
  reviewedAt: string | null;
  requestedByName: string;
  requestedByEmail: string | null;
  requestedBy: { role: string } | null; // null once the requester's own account has been deleted
  reviewedBy: { name: string | null; email: string | null } | null;
};

const TYPE_LABELS: Record<string, string> = {
  ACCESS: "Access",
  CORRECTION: "Correction",
  DELETION: "Deletion",
  OBJECTION: "Objection",
  DATA_PORTABILITY: "Data Portability",
  OTHER: "Other",
};

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-destructive/10 text-destructive border-destructive/20",
};

function RequestActions({ requestId, onDone }: { requestId: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [notes, setNotes] = useState("");

  async function act(action: "complete" | "reject", resolutionNotes?: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/privacy-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, resolutionNotes }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error ?? "Failed"); }
      onDone();
    } catch (e: any) {
      toast({ variant: "destructive", title: typeof e?.message === "string" ? e.message : "Could not update request" });
    } finally {
      setBusy(false);
    }
  }

  if (rejecting) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          autoFocus
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") act("reject", notes.trim() || undefined);
            if (e.key === "Escape") { setRejecting(false); setNotes(""); }
          }}
          placeholder="Reason (optional)..."
          className="h-8 w-48 rounded-md border px-2 text-xs bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <Button size="sm" variant="destructive" className="h-8 text-xs px-2" disabled={busy} onClick={() => act("reject", notes.trim() || undefined)}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Confirm"}
        </Button>
        <Button size="sm" variant="ghost" className="h-8 text-xs px-2" onClick={() => { setRejecting(false); setNotes(""); }}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button size="sm" variant="outline" className="h-8 text-xs px-2 text-emerald-700 border-emerald-200 hover:bg-emerald-50" disabled={busy} onClick={() => act("complete")}>
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Check className="h-3.5 w-3.5 mr-1" />Mark Complete</>}
      </Button>
      <Button size="sm" variant="outline" className="h-8 text-xs px-2 text-destructive border-destructive/30 hover:bg-destructive/10" disabled={busy} onClick={() => setRejecting(true)}>
        <X className="h-3.5 w-3.5 mr-1" />Reject
      </Button>
    </div>
  );
}

export function PrivacyRequestsClient({ initialRequests }: { initialRequests: Request[] }) {
  const [requests, setRequests] = useState(initialRequests);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(() => {
    setLoading(true);
    fetch("/api/privacy-requests")
      .then((r) => r.json())
      .then((d) => setRequests(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 flex flex-col items-center gap-2 text-muted-foreground">
          <Inbox className="h-8 w-8" />
          <p className="text-sm">No privacy requests yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      {requests.map((r) => (
        <Card key={r.id}>
          <CardContent className="p-4 flex items-start gap-4">
            <ShieldCheck className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{TYPE_LABELS[r.type] ?? r.type}</span>
                <Badge variant="outline" className={`text-[10px] ${STATUS_STYLE[r.status]}`}>{r.status}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {r.requestedByName}
                {r.requestedBy ? <span className="text-xs"> ({r.requestedBy.role})</span> : <span className="text-xs"> (account deleted)</span>}
              </p>
              {r.details && <p className="text-sm mt-1">{r.details}</p>}
              <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3">
                <span>Submitted {formatDate(r.createdAt)}</span>
                {r.reviewedAt && r.reviewedBy && (
                  <span>Reviewed by {r.reviewedBy.name ?? r.reviewedBy.email} on {formatDate(r.reviewedAt)}</span>
                )}
              </div>
              {r.resolutionNotes && <p className="text-xs text-muted-foreground mt-1">Notes: {r.resolutionNotes}</p>}
            </div>
            {r.status === "PENDING" && <RequestActions requestId={r.id} onDone={reload} />}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
