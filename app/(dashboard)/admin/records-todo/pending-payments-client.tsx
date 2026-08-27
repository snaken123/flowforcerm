"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { formatDate, formatCurrency } from "@/lib/utils";
import { toast } from "@/lib/use-toast";

const PAYMENT_MODES = ["Cash", "Credit Card", "Bank Transfer", "eWallet", "Class Pass"];
const PAYMENT_SUB: Record<string, string[]> = {
  "Bank Transfer": ["BDO", "BPI"],
  "eWallet": ["GCash", "Maya"],
};

function parsePmMode(full: string | null) {
  if (!full) return { mode: "", sub: "" };
  for (const mode of PAYMENT_MODES) {
    if (full.startsWith(mode)) {
      const sub = full.slice(mode.length).replace(/^[\s\-]+/, "");
      return { mode, sub };
    }
  }
  return { mode: full, sub: "" };
}

export function PendingPaymentsClient({ pendingPayments }: { pendingPayments: any[] }) {
  const [localPayments, setLocalPayments] = useState(pendingPayments);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editMode, setEditMode] = useState("");
  const [editSub, setEditSub] = useState("");
  const [editNeedsReceipt, setEditNeedsReceipt] = useState(true);
  const [editReceiptUrl, setEditReceiptUrl] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [paidDateMode, setPaidDateMode] = useState<"today" | "custom">("today");
  const [customPaidDate, setCustomPaidDate] = useState("");
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  function openRow(payment: any) {
    if (expanded === payment.id) { setExpanded(null); return; }
    const { mode, sub } = parsePmMode(payment.method);
    setEditMode(mode);
    setEditSub(sub);
    setEditNeedsReceipt(payment.needsReceipt ?? true);
    setEditReceiptUrl(payment.receiptUrl ?? "");
    setEditNotes(payment.notes ?? "");
    setPaidDateMode("today");
    setCustomPaidDate(new Date().toISOString().slice(0, 10));
    setExpanded(payment.id);
  }

  async function savePayment(paymentId: string) {
    setSaving((s) => ({ ...s, [paymentId]: true }));
    try {
      const fullMode = editSub ? `${editMode} - ${editSub}` : editMode;
      const res = await fetch(`/api/payments/${paymentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: fullMode || undefined,
          needsReceipt: editNeedsReceipt,
          receiptUrl: editReceiptUrl || null,
          notes: editNotes || null,
          ...(paidDateMode === "custom" && customPaidDate ? { paidAt: customPaidDate } : {}),
        }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      if (updated.status === "PAID") {
        setLocalPayments((prev) => prev.filter((p) => p.id !== paymentId));
        setExpanded(null);
        toast({ title: "Payment resolved", description: "Removed from To-Do." });
      } else {
        setLocalPayments((prev) => prev.map((p) => (p.id === paymentId ? { ...p, ...updated } : p)));
        toast({ title: "Payment updated" });
      }
    } catch {
      toast({ variant: "destructive", title: "Could not save payment" });
    } finally {
      setSaving((s) => ({ ...s, [paymentId]: false }));
    }
  }

  if (localPayments.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No pending membership payments. All caught up!
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {localPayments.map((p) => {
        const name = p.member
          ? `${p.member.firstName} ${p.member.lastName}`
          : p.employee
          ? `${p.employee.firstName} ${p.employee.lastName} (Staff)`
          : "—";
        const memberLink = p.member ? `/admin/members/${p.member.id}` : undefined;
        const serviceName = p.subscription?.service?.name ?? "—";
        const missingMethod = !p.method;
        const missingReceipt = !p.receiptUrl && (p.needsReceipt ?? true);
        const isExpanded = expanded === p.id;

        return (
          <div key={p.id} className="rounded-md border overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
              onClick={() => openRow(p)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {memberLink ? (
                    <Link href={memberLink} className="text-sm font-medium hover:underline" onClick={(e) => e.stopPropagation()}>
                      {name}
                    </Link>
                  ) : (
                    <span className="text-sm font-medium">{name}</span>
                  )}
                  {p.member?.memberNumber && (
                    <span className="text-xs font-mono text-muted-foreground">{p.member.memberNumber}</span>
                  )}
                  <span className="text-xs text-muted-foreground">{serviceName}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(p.createdAt)}</span>
                  <span className="text-sm font-semibold tabular-nums ml-auto">{formatCurrency(p.amount)}</span>
                </div>
                <div className="flex gap-2 mt-1">
                  {missingMethod && (
                    <span className="inline-flex items-center gap-1 text-xs text-orange-600 font-medium">
                      <AlertCircle className="h-3 w-3" />Payment mode missing
                    </span>
                  )}
                  {missingReceipt && (
                    <span className="inline-flex items-center gap-1 text-xs text-orange-600 font-medium">
                      <AlertCircle className="h-3 w-3" />Receipt missing
                    </span>
                  )}
                </div>
              </div>
              {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
            </button>

            {isExpanded && (
              <div className="border-t bg-muted/20 px-4 py-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Payment Mode</Label>
                    <Select value={editMode} onValueChange={(v) => { setEditMode(v); setEditSub(""); }}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select payment mode..." />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {PAYMENT_SUB[editMode] && (
                      <Select value={editSub} onValueChange={setEditSub}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder={`Select ${editMode} method...`} />
                        </SelectTrigger>
                        <SelectContent>
                          {PAYMENT_SUB[editMode].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Notes</Label>
                    <Input
                      className="h-9 text-sm"
                      placeholder="Optional notes..."
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Date Paid</Label>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="radio"
                        id={`paid-today-${p.id}`}
                        checked={paidDateMode === "today"}
                        onChange={() => setPaidDateMode("today")}
                        className="h-3.5 w-3.5"
                      />
                      <label htmlFor={`paid-today-${p.id}`} className="text-sm cursor-pointer select-none">Today</label>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="radio"
                        id={`paid-custom-${p.id}`}
                        checked={paidDateMode === "custom"}
                        onChange={() => setPaidDateMode("custom")}
                        className="h-3.5 w-3.5"
                      />
                      <label htmlFor={`paid-custom-${p.id}`} className="text-sm cursor-pointer select-none">Custom</label>
                    </div>
                    {paidDateMode === "custom" && (
                      <Input
                        type="date"
                        className="h-8 text-sm w-40"
                        value={customPaidDate}
                        max={new Date().toISOString().slice(0, 10)}
                        onChange={(e) => setCustomPaidDate(e.target.value)}
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`needsReceipt-pm-${p.id}`}
                      checked={editNeedsReceipt}
                      onChange={(e) => setEditNeedsReceipt(e.target.checked)}
                      className="h-4 w-4 rounded border-input"
                    />
                    <label htmlFor={`needsReceipt-pm-${p.id}`} className="text-sm cursor-pointer select-none">
                      Needs Receipt
                    </label>
                  </div>

                  {editNeedsReceipt && (
                    <div className="space-y-1">
                      <Label className="text-xs">Receipt URL (Google Drive link)</Label>
                      <Input
                        className="h-9 text-sm"
                        placeholder="https://drive.google.com/..."
                        value={editReceiptUrl}
                        onChange={(e) => setEditReceiptUrl(e.target.value)}
                      />
                      {editReceiptUrl && (
                        <a href={editReceiptUrl} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center text-xs text-primary hover:underline">
                          View receipt
                        </a>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => setExpanded(null)}>Cancel</Button>
                  <Button size="sm" disabled={saving[p.id]} onClick={() => savePayment(p.id)}>
                    {saving[p.id] && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                    Save
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
