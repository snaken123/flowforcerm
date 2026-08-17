"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate, formatCurrency } from "@/lib/utils";
import { toast } from "@/lib/use-toast";

const PAYMENT_MODES = ["Cash", "Credit Card", "Bank Transfer", "eWallet", "Class Pass"];
const PAYMENT_SUB: Record<string, string[]> = {
  "Bank Transfer": ["BDO", "BPI"],
  "eWallet": ["GCash", "Maya"],
};
const DECLINE_REASONS = [
  "Price too high",
  "Schedule doesn't fit",
  "Not interested anymore",
  "Joined another gym",
  "No response / unreachable",
  "Others",
];

export function FreeTrialFollowUpsClient({
  openFollowUps,
  services,
}: {
  openFollowUps: any[];
  services: any[];
}) {
  const router = useRouter();
  const [localFollowUps, setLocalFollowUps] = useState(openFollowUps);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [mode, setMode] = useState<Record<string, "converted" | "declined">>({});
  const [form, setForm] = useState<Record<string, any>>({});
  const [decline, setDecline] = useState<Record<string, { reason: string; detail: string; notes: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);

  function openRow(fu: any) {
    if (expanded === fu.id) { setExpanded(null); return; }
    setExpanded(fu.id);
    if (!form[fu.id]) {
      setForm((prev) => ({
        ...prev,
        [fu.id]: {
          serviceId: fu.subscription?.service?.id ?? "",
          packageId: "",
          rateType: "member",
          discount: "",
          paymentMode: "",
          paymentSub: "",
          needsReceipt: true,
          receiptUrl: "",
          notes: "",
        },
      }));
    }
    if (!decline[fu.id]) {
      setDecline((prev) => ({
        ...prev,
        [fu.id]: { reason: "", detail: "", notes: "" },
      }));
    }
  }

  function getPackages(fuId: string) {
    const f = form[fuId];
    if (!f) return [];
    return services.find((s: any) => s.id === f.serviceId)?.packages ?? [];
  }

  function getFinalPrice(fuId: string) {
    const f = form[fuId];
    if (!f) return 0;
    const pkg = getPackages(fuId).find((p: any) => p.id === f.packageId);
    if (!pkg) return 0;
    const base = f.rateType === "member" ? (pkg.memberPrice ?? 0) : (pkg.nonMemberPrice ?? 0);
    const disc = parseFloat(f.discount) || 0;
    return Math.max(0, base - (base * disc) / 100);
  }

  function updateForm(fuId: string, patch: Record<string, any>) {
    setForm((prev) => ({ ...prev, [fuId]: { ...(prev[fuId] ?? {}), ...patch } }));
  }

  function updateDecline(fuId: string, patch: Record<string, string>) {
    setDecline((prev) => ({ ...prev, [fuId]: { ...(prev[fuId] ?? { reason: "", detail: "", notes: "" }), ...patch } }));
  }

  async function saveConverted(fuId: string, memberId: string) {
    const f = form[fuId];
    if (!f) return;
    const finalPrice = getFinalPrice(fuId);
    const fullPaymentMode = f.paymentSub ? `${f.paymentMode} - ${f.paymentSub}` : f.paymentMode;
    setSaving(fuId);
    try {
      const subRes = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId,
          serviceId: f.serviceId,
          packageId: f.packageId || undefined,
          price: finalPrice,
          paymentMethod: fullPaymentMode || undefined,
          needsReceipt: f.needsReceipt,
          receiptUrl: f.receiptUrl || undefined,
          notes: f.notes || undefined,
        }),
      });
      if (!subRes.ok) throw new Error("Subscription creation failed");

      const fuRes = await fetch(`/api/free-trial-followups/${fuId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CONVERTED", notes: f.notes || undefined }),
      });
      if (!fuRes.ok) throw new Error("Follow-up update failed");

      setLocalFollowUps((prev) => prev.filter((fu) => fu.id !== fuId));
      setExpanded(null);
      toast({ title: "Converted", description: "Membership assigned and follow-up resolved." });
      router.refresh();
    } catch {
      toast({ variant: "destructive", title: "Could not convert follow-up" });
    } finally {
      setSaving(null);
    }
  }

  async function saveDeclined(fuId: string) {
    const dec = decline[fuId];
    if (!dec?.reason) return;
    setSaving(fuId);
    try {
      const res = await fetch(`/api/free-trial-followups/${fuId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "DECLINED",
          declineReason: dec.reason,
          declineReasonDetail: dec.reason === "Others" ? dec.detail : undefined,
          notes: dec.notes || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      setLocalFollowUps((prev) => prev.filter((fu) => fu.id !== fuId));
      setExpanded(null);
      toast({ title: "Declined", description: "Follow-up marked as declined." });
      router.refresh();
    } catch {
      toast({ variant: "destructive", title: "Could not decline follow-up" });
    } finally {
      setSaving(null);
    }
  }

  if (localFollowUps.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No free trial follow-ups. All caught up!
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {localFollowUps.map((fu) => {
        const name = `${fu.member.firstName} ${fu.member.lastName}`;
        const trialServices: any[] = fu.member.subscriptions ?? [];
        const checkInDate = fu.checkIn
          ? new Date(fu.checkIn.checkedInAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })
          : null;
        const isExpanded = expanded === fu.id;
        const currentMode = mode[fu.id];
        const f = form[fu.id];
        const dec = decline[fu.id];
        const pkgs = getPackages(fu.id);

        return (
          <div key={fu.id} className="rounded-md border overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
              onClick={() => openRow(fu)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    href={`/admin/members/${fu.member.id}`}
                    className="text-sm font-medium hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {name}
                  </Link>
                  {fu.member.memberNumber && (
                    <span className="text-xs font-mono text-muted-foreground">{fu.member.memberNumber}</span>
                  )}
                  {trialServices.map((sub) => (
                    <span
                      key={sub.id}
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded-full border"
                      style={{ borderColor: sub.service.color, color: sub.service.color }}
                    >
                      {sub.service.name}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {checkInDate ? `Checked in: ${checkInDate}` : "Not yet attended"}
                </p>
              </div>
              {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
            </button>

            {isExpanded && (
              <div className="border-t bg-muted/20 px-4 py-4 space-y-4">
                {/* Mode selector */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={currentMode === "converted" ? "default" : "outline"}
                    onClick={() => setMode((prev) => ({ ...prev, [fu.id]: "converted" }))}
                  >
                    Converted
                  </Button>
                  <Button
                    size="sm"
                    variant={currentMode === "declined" ? "destructive" : "outline"}
                    onClick={() => setMode((prev) => ({ ...prev, [fu.id]: "declined" }))}
                  >
                    Declined
                  </Button>
                </div>

                {currentMode === "converted" && f && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs">Service</Label>
                        <Select value={f.serviceId} onValueChange={(v) => updateForm(fu.id, { serviceId: v, packageId: "" })}>
                          <SelectTrigger className="h-9"><SelectValue placeholder="Select service..." /></SelectTrigger>
                          <SelectContent>
                            {services.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Package</Label>
                        <Select value={f.packageId} onValueChange={(v) => updateForm(fu.id, { packageId: v })}>
                          <SelectTrigger className="h-9"><SelectValue placeholder="Select package..." /></SelectTrigger>
                          <SelectContent>
                            {pkgs.map((p: any) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name} · {formatCurrency(f.rateType === "member" ? p.memberPrice : p.nonMemberPrice)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs">Rate Type</Label>
                        <div className="flex rounded-md border overflow-hidden">
                          <button
                            type="button"
                            className={`flex-1 py-2 text-xs font-medium transition-colors ${f.rateType === "member" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                            onClick={() => updateForm(fu.id, { rateType: "member" })}
                          >
                            Member
                          </button>
                          <button
                            type="button"
                            className={`flex-1 py-2 text-xs font-medium border-l transition-colors ${f.rateType === "nonMember" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                            onClick={() => updateForm(fu.id, { rateType: "nonMember" })}
                          >
                            Non-member
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Discount (%)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          className="h-9 text-sm"
                          placeholder="0"
                          value={f.discount}
                          onChange={(e) => updateForm(fu.id, { discount: e.target.value })}
                        />
                      </div>
                    </div>

                    {f.packageId && (
                      <p className="text-sm font-semibold text-green-700">
                        Final price: {formatCurrency(getFinalPrice(fu.id))}
                      </p>
                    )}

                    <div className="space-y-1">
                      <Label className="text-xs">Payment Mode</Label>
                      <Select value={f.paymentMode} onValueChange={(v) => updateForm(fu.id, { paymentMode: v, paymentSub: "" })}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Select payment mode..." /></SelectTrigger>
                        <SelectContent>
                          {PAYMENT_MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {PAYMENT_SUB[f.paymentMode] && (
                        <Select value={f.paymentSub} onValueChange={(v) => updateForm(fu.id, { paymentSub: v })}>
                          <SelectTrigger className="h-9"><SelectValue placeholder={`Select ${f.paymentMode} method...`} /></SelectTrigger>
                          <SelectContent>
                            {PAYMENT_SUB[f.paymentMode].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`needsReceipt-fu-${fu.id}`}
                          checked={f.needsReceipt}
                          onChange={(e) => updateForm(fu.id, { needsReceipt: e.target.checked })}
                          className="h-4 w-4 rounded border-input"
                        />
                        <label htmlFor={`needsReceipt-fu-${fu.id}`} className="text-sm cursor-pointer select-none">
                          Needs Receipt
                        </label>
                      </div>
                      {f.needsReceipt && (
                        <div className="space-y-1">
                          <Label className="text-xs">Receipt URL (Google Drive link)</Label>
                          <Input
                            className="h-9 text-sm"
                            placeholder="https://drive.google.com/..."
                            value={f.receiptUrl}
                            onChange={(e) => updateForm(fu.id, { receiptUrl: e.target.value })}
                          />
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Notes <span className="text-muted-foreground">(optional)</span></Label>
                      <Input
                        className="h-9 text-sm"
                        placeholder="Any additional notes..."
                        value={f.notes}
                        onChange={(e) => updateForm(fu.id, { notes: e.target.value })}
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => setExpanded(null)}>Cancel</Button>
                      <Button
                        size="sm"
                        disabled={saving === fu.id || !f.serviceId || !f.packageId}
                        onClick={() => saveConverted(fu.id, fu.member.id)}
                      >
                        {saving === fu.id && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                        Save & Convert
                      </Button>
                    </div>
                  </div>
                )}

                {currentMode === "declined" && dec && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Reason</Label>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        value={dec.reason}
                        onChange={(e) => updateDecline(fu.id, { reason: e.target.value, detail: "" })}
                      >
                        <option value="">Select reason...</option>
                        {DECLINE_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    {dec.reason === "Others" && (
                      <div className="space-y-1">
                        <Label className="text-xs">Please specify</Label>
                        <Input
                          className="h-9 text-sm"
                          placeholder="Describe the reason..."
                          value={dec.detail}
                          onChange={(e) => updateDecline(fu.id, { detail: e.target.value })}
                        />
                      </div>
                    )}
                    <div className="space-y-1">
                      <Label className="text-xs">Notes <span className="text-muted-foreground">(optional)</span></Label>
                      <textarea
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                        rows={3}
                        placeholder="Any additional notes..."
                        value={dec.notes}
                        onChange={(e) => updateDecline(fu.id, { notes: e.target.value })}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => setExpanded(null)}>Cancel</Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={saving === fu.id || !dec.reason || (dec.reason === "Others" && !dec.detail.trim())}
                        onClick={() => saveDeclined(fu.id)}
                      >
                        {saving === fu.id && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                        Mark Declined
                      </Button>
                    </div>
                  </div>
                )}

                {!currentMode && (
                  <p className="text-xs text-muted-foreground">Select an outcome above to resolve this follow-up.</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
