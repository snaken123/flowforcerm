"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Loader2, Snowflake, Inbox, Check, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDate, getInitials } from "@/lib/utils";
import { toast } from "@/lib/use-toast";

function FreezeRequestActions({ requestId, onDone }: { requestId: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  async function act(path: "approve" | "reject", body?: object) {
    setBusy(true);
    try {
      const res = await fetch(`/api/freeze-requests/${requestId}/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
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
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && reason.trim()) act("reject", { reason: reason.trim() });
            if (e.key === "Escape") { setRejecting(false); setReason(""); }
          }}
          placeholder="Reason for rejection..."
          className="h-8 w-48 rounded-md border px-2 text-xs bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <Button size="sm" variant="destructive" className="h-8 text-xs px-2" disabled={busy || !reason.trim()} onClick={() => act("reject", { reason: reason.trim() })}>
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
      <Button size="sm" variant="outline" className="h-8 text-xs px-2 text-emerald-700 border-emerald-200 hover:bg-emerald-50" disabled={busy} onClick={() => act("approve")}>
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Check className="h-3.5 w-3.5 mr-1" />Approve</>}
      </Button>
      <Button size="sm" variant="outline" className="h-8 text-xs px-2 text-destructive border-destructive/30 hover:bg-destructive/10" disabled={busy} onClick={() => setRejecting(true)}>
        <X className="h-3.5 w-3.5 mr-1" />Reject
      </Button>
    </div>
  );
}

export function PendingFreezeRequestsClient({ canApprove }: { canApprove: boolean }) {
  const [requests, setRequests] = useState<any[] | null>(null);

  const load = useCallback(() => {
    fetch("/api/freeze-requests")
      .then((r) => r.json())
      .then((d) => setRequests(Array.isArray(d) ? d : []))
      .catch(() => setRequests([]));
  }, []);

  useEffect(() => { load(); }, [load]);

  if (requests === null) {
    return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 flex flex-col items-center gap-2 text-muted-foreground">
          <Inbox className="h-8 w-8" />
          <p className="text-sm">No pending freeze requests.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((r) => (
        <Card key={r.id}>
          <CardContent className="p-4 flex items-start gap-4">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={r.member?.photoUrl ?? ""} />
              <AvatarFallback>{getInitials(`${r.member?.firstName ?? ""} ${r.member?.lastName ?? ""}`)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <Link href={`/admin/members/${r.member?.id}`} className="font-medium text-sm hover:underline">
                {r.member?.firstName} {r.member?.lastName}
              </Link>
              <div className="flex items-center gap-2 mt-0.5 text-sm">
                <Snowflake className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                <span className="font-medium">{r.days} day{r.days !== 1 ? "s" : ""}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{r.reason}</p>
              <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3">
                <span>{formatDate(r.createdAt)}</span>
                <span>Requested by {r.createdBy?.name ?? r.createdBy?.email ?? "Unknown"}</span>
              </div>
              {r.photoUrl && (
                <a href={r.photoUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-2">
                  <img src={r.photoUrl} alt="Proof" className="h-16 w-16 rounded-md object-cover border hover:opacity-80 transition-opacity" />
                </a>
              )}
            </div>
            {canApprove ? (
              <FreezeRequestActions requestId={r.id} onDone={load} />
            ) : (
              <span className="text-xs text-muted-foreground shrink-0">Awaiting admin review</span>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
