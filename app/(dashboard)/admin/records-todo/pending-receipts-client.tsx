"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Loader2, Receipt, Inbox, Upload, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { formatDate, formatCurrency, getInitials } from "@/lib/utils";
import { toast } from "@/lib/use-toast";

function ResolveReceiptActions({ paymentId, onDone }: { paymentId: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);

  async function markNoReceiptNeeded() {
    setBusy(true);
    try {
      const res = await fetch(`/api/payments/${paymentId}/receipt`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ needsReceipt: false }),
      });
      if (!res.ok) throw new Error();
      onDone();
    } catch {
      toast({ variant: "destructive", title: "Could not update payment" });
    } finally {
      setBusy(false);
    }
  }

  async function uploadFile(file: File) {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/payments/${paymentId}/receipt`, { method: "POST", body: fd });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error ?? "Upload failed"); }
      onDone();
    } catch (e: any) {
      toast({ variant: "destructive", title: typeof e?.message === "string" ? e.message : "Upload failed" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <Label htmlFor={`receipt-upload-${paymentId}`} className="cursor-pointer">
        <span className="inline-flex h-8 items-center gap-1.5 rounded-md border px-2 text-xs hover:bg-muted transition-colors">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          Upload
        </span>
      </Label>
      <input
        id={`receipt-upload-${paymentId}`}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        disabled={busy}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadFile(file);
          e.target.value = "";
        }}
      />
      <Button size="sm" variant="outline" className="h-8 text-xs px-2" disabled={busy} onClick={markNoReceiptNeeded}>
        <Check className="h-3.5 w-3.5 mr-1" />No Receipt Needed
      </Button>
    </div>
  );
}

export function PendingReceiptsClient() {
  const [payments, setPayments] = useState<any[] | null>(null);

  const load = useCallback(() => {
    fetch("/api/payments/pending-receipts")
      .then((r) => r.json())
      .then((d) => setPayments(Array.isArray(d) ? d : []))
      .catch(() => setPayments([]));
  }, []);

  useEffect(() => { load(); }, [load]);

  if (payments === null) {
    return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
  }

  if (payments.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 flex flex-col items-center gap-2 text-muted-foreground">
          <Inbox className="h-8 w-8" />
          <p className="text-sm">Nothing pending — you're all caught up.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {payments.map((p) => {
        const name = p.member
          ? `${p.member.firstName} ${p.member.lastName}`
          : p.employee
          ? `${p.employee.firstName} ${p.employee.lastName}`
          : "—";
        const memberLink = p.member ? `/admin/members/${p.member.id}` : undefined;
        return (
          <Card key={p.id}>
            <CardContent className="p-4 flex items-start gap-4">
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={p.member?.photoUrl ?? ""} />
                <AvatarFallback>{getInitials(name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                {memberLink ? (
                  <Link href={memberLink} className="font-medium text-sm hover:underline">{name}</Link>
                ) : (
                  <span className="font-medium text-sm">{name}</span>
                )}
                <div className="flex items-center gap-2 mt-0.5 text-sm">
                  <Receipt className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  {p.subscription?.service && (
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: p.subscription.service.color }} />
                      {p.subscription.service.name}
                    </span>
                  )}
                  <span className="font-medium">{formatCurrency(p.amount)}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3">
                  <span>{formatDate(p.paidAt ?? p.createdAt)}</span>
                  {p.method && <span>{p.method}</span>}
                </div>
              </div>
              <ResolveReceiptActions paymentId={p.id} onDone={load} />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
