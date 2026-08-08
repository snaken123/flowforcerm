"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, ShoppingBag, Inbox, Upload, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { toast } from "@/lib/use-toast";
import { PAYMENT_MODES, PAYMENT_SUB } from "@/app/(dashboard)/admin/store/shop-client";

function SaleFixActions({ sale, onDone }: { sale: any; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState("");
  const [subMode, setSubMode] = useState("");

  const missingPayment = !sale.paymentMode;
  const missingReceipt = !sale.receiptUrl && sale.needsReceipt;

  async function patch(body: object) {
    setBusy(true);
    try {
      const res = await fetch(`/api/shop/sales/${sale.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      onDone();
    } catch {
      toast({ variant: "destructive", title: "Could not update sale" });
    } finally {
      setBusy(false);
    }
  }

  async function savePaymentMode() {
    if (!mode) return;
    const needsSub = PAYMENT_SUB[mode]?.length;
    if (needsSub && !subMode) return;
    const full = needsSub ? `${mode} - ${subMode}` : mode;
    await patch({ paymentMode: full });
  }

  async function markNoReceiptNeeded() {
    await patch({ needsReceipt: false });
  }

  async function uploadFile(file: File) {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("memberId", sale.buyerMember?.id ?? "walk-in");
      fd.append("lastName", sale.buyerMember?.lastName ?? sale.buyerEmployee?.lastName ?? sale.buyerName ?? "WalkIn");
      fd.append("sport", "Shop");
      fd.append("package", sale.items.map((i: any) => i.shopItem.name).join(", "));
      fd.append("amount", String(sale.total));
      fd.append("paymentMethod", sale.paymentMode ?? "");
      const upRes = await fetch("/api/upload-receipt", { method: "POST", body: fd });
      if (!upRes.ok) throw new Error();
      const data = await upRes.json();
      await patch({ receiptUrl: data.link });
    } catch {
      toast({ variant: "destructive", title: "Upload failed" });
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {missingPayment && (
        <div className="flex items-center gap-1.5">
          <Select value={mode} onValueChange={(v) => { setMode(v); setSubMode(""); }}>
            <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Payment mode" /></SelectTrigger>
            <SelectContent>{PAYMENT_MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
          {mode && PAYMENT_SUB[mode]?.length > 0 && (
            <Select value={subMode} onValueChange={setSubMode}>
              <SelectTrigger className="h-8 w-24 text-xs"><SelectValue placeholder="Bank/wallet" /></SelectTrigger>
              <SelectContent>{PAYMENT_SUB[mode].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          )}
          <Button size="sm" variant="outline" className="h-8 text-xs px-2" disabled={busy || !mode || (!!PAYMENT_SUB[mode]?.length && !subMode)} onClick={savePaymentMode}>
            Save
          </Button>
        </div>
      )}
      {missingReceipt && (
        <div className="flex items-center gap-1.5">
          <Label htmlFor={`sale-receipt-upload-${sale.id}`} className="cursor-pointer">
            <span className="inline-flex h-8 items-center gap-1.5 rounded-md border px-2 text-xs hover:bg-muted transition-colors">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              Upload
            </span>
          </Label>
          <input
            id={`sale-receipt-upload-${sale.id}`}
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
      )}
    </div>
  );
}

export function PendingStoreSalesClient() {
  const [sales, setSales] = useState<any[] | null>(null);

  const load = useCallback(() => {
    fetch("/api/shop/sales/pending")
      .then((r) => r.json())
      .then((d) => setSales(Array.isArray(d) ? d : []))
      .catch(() => setSales([]));
  }, []);

  useEffect(() => { load(); }, [load]);

  if (sales === null) {
    return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
  }

  if (sales.length === 0) {
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
      {sales.map((sale) => {
        const buyer = sale.buyerMember
          ? `${sale.buyerMember.firstName} ${sale.buyerMember.lastName}`
          : sale.buyerEmployee
          ? `${sale.buyerEmployee.firstName} ${sale.buyerEmployee.lastName}`
          : sale.buyerName ?? "Walk-in";
        return (
          <Card key={sale.id}>
            <CardContent className="p-4 flex items-start gap-4">
              <ShoppingBag className="h-8 w-8 text-muted-foreground shrink-0 mt-1" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{buyer}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {sale.items.map((i: any) => `${i.shopItem.name} ×${i.quantity}`).join(", ")}
                </p>
                <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3">
                  <span>{new Date(sale.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}</span>
                  <span className="font-medium">{formatCurrency(sale.total)}</span>
                  <span>{sale.staffName}</span>
                </div>
              </div>
              <SaleFixActions sale={sale} onDone={load} />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
