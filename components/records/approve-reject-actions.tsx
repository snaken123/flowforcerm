"use client";

import { useState } from "react";
import { Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/use-toast";

export function ApproveRejectActions({ recordId, onDone }: { recordId: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  async function patch(body: object) {
    setBusy(true);
    try {
      const res = await fetch(`/api/ranks/${recordId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error ?? "Failed"); }
      onDone();
    } catch (e: any) {
      toast({ variant: "destructive", title: typeof e?.message === "string" ? e.message : "Could not update record" });
    } finally {
      setBusy(false);
    }
  }

  if (rejecting) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          autoFocus
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && reason.trim()) patch({ status: "REJECTED", rejectionReason: reason.trim() });
            if (e.key === "Escape") { setRejecting(false); setReason(""); }
          }}
          placeholder="Reason for rejection..."
          className="h-8 w-48 rounded-md border px-2 text-xs bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <Button size="sm" variant="destructive" className="h-8 text-xs px-2" disabled={busy || !reason.trim()} onClick={() => patch({ status: "REJECTED", rejectionReason: reason.trim() })}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Confirm"}
        </Button>
        <Button size="sm" variant="ghost" className="h-8 text-xs px-2" onClick={() => { setRejecting(false); setReason(""); }}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button size="sm" variant="outline" className="h-8 text-xs px-2 text-emerald-700 border-emerald-200 hover:bg-emerald-50" disabled={busy} onClick={() => patch({ status: "APPROVED" })}>
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Check className="h-3.5 w-3.5 mr-1" />Approve</>}
      </Button>
      <Button size="sm" variant="outline" className="h-8 text-xs px-2 text-destructive border-destructive/30 hover:bg-destructive/10" disabled={busy} onClick={() => setRejecting(true)}>
        <X className="h-3.5 w-3.5 mr-1" />Reject
      </Button>
    </div>
  );
}
