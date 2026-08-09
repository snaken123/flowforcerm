"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Camera, CheckCircle2, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { toast } from "@/lib/use-toast";
import { getUtcOffsetString } from "@/lib/timezone-offset";

const SPECIAL_PRICE_REASONS = [
  "Employee Price",
  "Family / Friend Discount",
  "Loyalty Discount",
  "Promotional Rate",
  "Complimentary",
  "Bundle Deal",
];

export function AssignMembershipDialog({
  open,
  onOpenChange,
  member,
  services,
  timeZone,
  onAssigned,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: { id: string; firstName: string; lastName: string; subscriptions: any[] };
  services: any[];
  timeZone: string;
  onAssigned?: () => void;
}) {
  const router = useRouter();
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedPackageId, setSelectedPackageId] = useState("");

  const hasActiveAnnual = member.subscriptions.some((s: any) =>
    s.status === "ACTIVE" &&
    s.service?.name?.toLowerCase().includes("annual") &&
    (!s.endDate || new Date(s.endDate).getTime() >= Date.now())
  );

  const [rateType, setRateType] = useState<"member" | "nonMember">(hasActiveAnnual ? "member" : "nonMember");
  const [discount, setDiscount] = useState("0");
  const [specialPriceOpen, setSpecialPriceOpen] = useState(false);
  const [specialPriceInput, setSpecialPriceInput] = useState("");
  const [specialPriceReasons, setSpecialPriceReasons] = useState<string[]>([]);
  const [specialPriceOther, setSpecialPriceOther] = useState("");
  const [specialPriceNote, setSpecialPriceNote] = useState("");
  const [paymentMode, setPaymentMode] = useState("");
  const [paymentSubMode, setPaymentSubMode] = useState<string[]>([]);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [receiptStatus, setReceiptStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [receiptLink, setReceiptLink] = useState<string | null>(null);
  const [membershipNeedsReceipt, setMembershipNeedsReceipt] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [showDupConfirm, setShowDupConfirm] = useState(false);

  const selectedService = services.find((s) => s.id === selectedServiceId);
  const selectedPackage = selectedService?.packages?.find((p: any) => p.id === selectedPackageId);
  const basePrice = rateType === "member" ? (selectedPackage?.memberPrice ?? 0) : (selectedPackage?.nonMemberPrice ?? 0);
  const discountPct = Math.min(Math.max(Number(discount) || 0, 0), 100);
  const discountAmt = basePrice * (discountPct / 100);
  const finalPrice = basePrice - discountAmt;

  function resetForm() {
    setSelectedServiceId("");
    setSelectedPackageId("");
    setDiscount("0");
    setSpecialPriceNote("");
    setSpecialPriceReasons([]);
    setSpecialPriceOther("");
    setSpecialPriceInput("");
    setSpecialPriceOpen(false);
    setPaymentMode("");
    setPaymentSubMode([]);
    setReceiptFile(null);
    setReceiptPreview(null);
    setReceiptStatus("idle");
    setReceiptLink(null);
    setMembershipNeedsReceipt(true);
  }

  async function assignMembership(skipDupCheck = false) {
    if (!selectedServiceId || !selectedPackageId) return;

    // HIGH-8: warn if the member already has an active/paused sub for this service
    if (!skipDupCheck) {
      const existing = member.subscriptions.find(
        (s: any) =>
          s.serviceId === selectedServiceId &&
          (s.status === "ACTIVE" || s.status === "PAUSED") &&
          (!s.endDate || new Date(s.endDate).getTime() >= Date.now()) &&
          (s.sessionsTotal === null || s.sessionsUsed < s.sessionsTotal)
      );
      if (existing) {
        setShowDupConfirm(true);
        return;
      }
    }

    setAssigning(true);
    try {
      // Upload the receipt photo first (if attached) so its URL can ride along with the
      // subscription/payment creation, instead of being uploaded after and discarded.
      let uploadedReceiptUrl: string | null = null;
      let uploadError = false;
      if (receiptFile && selectedService && selectedPackage) {
        setReceiptStatus("uploading");
        try {
          const fd = new FormData();
          fd.append("file", receiptFile);
          fd.append("memberId", member.id);
          fd.append("lastName", member.lastName);
          fd.append("sport", selectedService.name);
          fd.append("package", selectedPackage.name);
          fd.append("amount", String(finalPrice));
          fd.append("paymentMethod", paymentSubMode.length ? `${paymentMode}${paymentSubMode.join("")}` : paymentMode);
          const upRes = await fetch("/api/upload-receipt", { method: "POST", body: fd });
          if (upRes.ok) {
            const data = await upRes.json();
            uploadedReceiptUrl = data.link ?? null;
            setReceiptLink(uploadedReceiptUrl);
            setReceiptStatus("done");
          } else {
            setReceiptStatus("error");
            uploadError = true;
          }
        } catch {
          setReceiptStatus("error");
          uploadError = true;
        }
      }

      // Calculate end date from package validDays
      const startDateStr = new Date().toLocaleDateString("en-CA", { timeZone });
      const startOffset = getUtcOffsetString(new Date(`${startDateStr}T12:00:00Z`), timeZone);
      const startDate = new Date(startDateStr + "T00:00:00" + startOffset);
      const endDate = selectedPackage
        ? new Date(startDate.getTime() + selectedPackage.validDays * 86400000)
        : undefined;

      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: member.id,
          serviceId: selectedServiceId,
          packageId: selectedPackageId,
          price: finalPrice,
          startDate: startDateStr,
          endDate: endDate ? endDate.toLocaleDateString("en-CA", { timeZone }) : undefined,
          sessionsTotal: selectedPackage?.sessions ?? null,
          paymentMethod: paymentSubMode.length ? `${paymentMode} - ${paymentSubMode.join(" & ")}` : paymentMode || undefined,
          needsReceipt: membershipNeedsReceipt,
          receiptUrl: uploadedReceiptUrl ?? undefined,
          ...(specialPriceNote ? { notes: specialPriceNote } : {}),
        }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err?.error || "Failed"); }

      const paymentMethodFull = paymentSubMode.length ? `${paymentMode} - ${paymentSubMode.join(" & ")}` : paymentMode || undefined;
      const isPaymentComplete = !!paymentMethodFull && (!membershipNeedsReceipt || !!uploadedReceiptUrl);
      toast({
        title: "Membership assigned",
        description: !isPaymentComplete
          ? "Incomplete payment info — added to To-Do."
          : uploadError && membershipNeedsReceipt
          ? "Receipt upload failed — membership was still created, flagged in To Do until a receipt is added."
          : undefined,
      });
      onOpenChange(false);
      resetForm();
      router.refresh();
      onAssigned?.();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Could not assign membership", description: e?.message });
    } finally {
      setAssigning(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) resetForm();
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Membership — {member.firstName} {member.lastName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Membership</Label>
              <Select value={selectedServiceId} onValueChange={(v) => { setSelectedServiceId(v); setSelectedPackageId(""); setRateType(hasActiveAnnual ? "member" : "nonMember"); }}>
                <SelectTrigger><SelectValue placeholder="Select a membership..." /></SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedService && (
              <div className="space-y-1">
                <Label>Package</Label>
                {selectedService.packages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No packages for this membership.</p>
                ) : (
                  <Select value={selectedPackageId} onValueChange={(v) => { setSelectedPackageId(v); setRateType(hasActiveAnnual ? "member" : "nonMember"); }}>
                    <SelectTrigger><SelectValue placeholder="Select a package..." /></SelectTrigger>
                    <SelectContent>
                      {selectedService.packages
                        .filter((pkg: any) => rateType === "member" || pkg.nonMemberPrice > 0 || pkg.memberPrice === 0)
                        .map((pkg: any) => (
                          <SelectItem key={pkg.id} value={pkg.id}>
                            {pkg.name} — {pkg.sessions ? `${pkg.sessions} sessions` : "Unlimited"} / {pkg.validDays}d · {formatCurrency(rateType === "member" ? pkg.memberPrice : pkg.nonMemberPrice)}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {selectedPackage && (
              <>
                {/* Rate selector — auto-set based on annual membership, staff can override */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Rate</Label>
                    <span className="text-xs text-muted-foreground">
                      {hasActiveAnnual ? "Auto: member (has annual membership)" : "Auto: non-member (no annual membership)"}
                    </span>
                  </div>
                  <div className="flex rounded-md border overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setRateType("member")}
                      className={`flex-1 py-2 text-sm font-medium transition-colors ${rateType === "member" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                    >
                      Member — {formatCurrency(selectedPackage.memberPrice)}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRateType("nonMember")}
                      disabled={!selectedPackage.nonMemberPrice}
                      className={`flex-1 py-2 text-sm font-medium border-l transition-colors ${rateType === "nonMember" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"} disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      Non-member — {selectedPackage.nonMemberPrice ? formatCurrency(selectedPackage.nonMemberPrice) : "N/A"}
                    </button>
                  </div>
                </div>

                <div className="rounded-md bg-muted/50 border p-3 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sessions</span>
                    <span className="font-medium">{selectedPackage.sessions ? `${selectedPackage.sessions} sessions` : "Unlimited"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valid for</span>
                    <span className="font-medium">{selectedPackage.validDays} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{rateType === "member" ? "Member rate" : "Non-member rate"}</span>
                    <span className="font-medium">{formatCurrency(basePrice)}</span>
                  </div>
                  {discountAmt > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Discount</span>
                      <span className="font-medium text-destructive">− {formatCurrency(discountAmt)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center border-t pt-1 mt-1">
                    <span className="font-medium">Total</span>
                    <div className="flex items-center gap-2">
                      {specialPriceNote && (
                        <span className="text-xs text-muted-foreground line-through">{formatCurrency(basePrice)}</span>
                      )}
                      <span className="font-bold text-green-700">{formatCurrency(finalPrice)}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSpecialPriceInput(String(finalPrice));
                          setSpecialPriceOpen((o) => !o);
                        }}
                        className="text-xs px-2 py-0.5 rounded border border-amber-400 text-amber-600 hover:bg-amber-50 font-medium transition-colors"
                      >
                        {specialPriceNote ? "Edit Special" : "Special Price"}
                      </button>
                    </div>
                  </div>
                  {specialPriceNote && (
                    <div className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <span>⚡ Special price applied:</span>
                      <span className="truncate">{specialPriceNote}</span>
                      <button
                        type="button"
                        onClick={() => { setSpecialPriceNote(""); setSpecialPriceReasons([]); setSpecialPriceOther(""); setDiscount("0"); setSpecialPriceOpen(false); }}
                        className="ml-auto text-muted-foreground hover:text-destructive"
                      >✕</button>
                    </div>
                  )}
                </div>

                {specialPriceOpen && (
                  <div className="rounded-md border border-amber-200 bg-amber-50/60 p-3 space-y-3">
                    <p className="text-sm font-medium text-amber-800">Special Price</p>
                    <div className="space-y-1">
                      <Label className="text-xs">New Total Amount (₱)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={specialPriceInput}
                        onChange={(e) => setSpecialPriceInput(e.target.value)}
                        placeholder="0.00"
                        className="bg-white"
                      />
                      {basePrice > 0 && Number(specialPriceInput) >= 0 && Number(specialPriceInput) < basePrice && (
                        <p className="text-xs text-muted-foreground">
                          {Math.round((basePrice - Number(specialPriceInput)) / basePrice * 100)}% off — saving ₱{(basePrice - Number(specialPriceInput)).toFixed(2)}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Reason (select all that apply)</Label>
                      {SPECIAL_PRICE_REASONS.map((r) => (
                        <label key={r} className="flex items-center gap-2 cursor-pointer text-sm">
                          <input
                            type="checkbox"
                            checked={specialPriceReasons.includes(r)}
                            onChange={(e) => setSpecialPriceReasons((prev) =>
                              e.target.checked ? [...prev, r] : prev.filter((x) => x !== r)
                            )}
                          />
                          {r}
                        </label>
                      ))}
                      <Input
                        value={specialPriceOther}
                        onChange={(e) => setSpecialPriceOther(e.target.value)}
                        placeholder="Other reason..."
                        className="bg-white mt-1"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setSpecialPriceOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="flex-1"
                        disabled={
                          !specialPriceInput ||
                          Number(specialPriceInput) < 0 ||
                          Number(specialPriceInput) > basePrice ||
                          (specialPriceReasons.length === 0 && !specialPriceOther.trim())
                        }
                        onClick={() => {
                          const newTotal = parseFloat(specialPriceInput);
                          const pct = basePrice > 0 ? ((basePrice - newTotal) / basePrice) * 100 : 0;
                          setDiscount(String(Math.round(pct * 100) / 100));
                          const note = [
                            ...specialPriceReasons,
                            ...(specialPriceOther.trim() ? [specialPriceOther.trim()] : []),
                          ].join("; ");
                          setSpecialPriceNote(note);
                          setSpecialPriceOpen(false);
                        }}
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <Label>Discount (%)</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      placeholder="0"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Mode of Payment</Label>
                  <Select value={paymentMode} onValueChange={(v) => { setPaymentMode(v); setPaymentSubMode([]); }}>
                    <SelectTrigger><SelectValue placeholder="Select payment method..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Credit Card">Credit Card</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="eWallet">eWallet</SelectItem>
                      <SelectItem value="Class Pass">Class Pass</SelectItem>
                    </SelectContent>
                  </Select>
                  {paymentMode === "Bank Transfer" && (
                    <Select value={paymentSubMode[0] ?? ""} onValueChange={(v) => setPaymentSubMode([v])}>
                      <SelectTrigger><SelectValue placeholder="Select bank..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BDO">BDO</SelectItem>
                        <SelectItem value="BPI">BPI</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  {paymentMode === "eWallet" && (
                    <Select value={paymentSubMode[0] ?? ""} onValueChange={(v) => setPaymentSubMode([v])}>
                      <SelectTrigger><SelectValue placeholder="Select e-wallet..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GCash">GCash</SelectItem>
                        <SelectItem value="Maya">Maya</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
                {/* Receipt photo */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <input
                      type="checkbox"
                      id="membershipNeedsReceiptCheck"
                      checked={membershipNeedsReceipt}
                      onChange={(e) => setMembershipNeedsReceipt(e.target.checked)}
                      className="h-4 w-4 accent-primary cursor-pointer"
                    />
                    <label htmlFor="membershipNeedsReceiptCheck" className="text-xs font-medium cursor-pointer select-none">Needs Receipt</label>
                  </div>
                  <Label>Receipt / Proof of Payment <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
                  {receiptPreview ? (
                    <div className="relative w-full">
                      <img src={receiptPreview} alt="Receipt preview" className="w-full max-h-40 object-cover rounded-lg border" />
                      <button
                        type="button"
                        onClick={() => { setReceiptFile(null); setReceiptPreview(null); setReceiptStatus("idle"); }}
                        className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full p-0.5 hover:bg-black/80"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                      {receiptStatus === "done" && (
                        <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 bg-green-600 text-white text-xs px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="h-3 w-3" /> Uploaded
                        </div>
                      )}
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 cursor-pointer border-2 border-dashed border-border rounded-lg px-4 py-3 hover:border-primary/50 transition-colors">
                      <Camera className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Take photo or choose image</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setReceiptFile(file);
                          setReceiptPreview(URL.createObjectURL(file));
                          setReceiptStatus("idle");
                        }}
                      />
                    </label>
                  )}
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={() => assignMembership()} disabled={!selectedServiceId || !selectedPackageId || assigning}>
              {assigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign Membership
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* HIGH-8: Duplicate membership confirmation */}
      <Dialog open={showDupConfirm} onOpenChange={(o) => !o && setShowDupConfirm(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="h-4 w-4" />Duplicate Membership
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This athlete already has an active <span className="font-medium text-foreground">{services.find((s) => s.id === selectedServiceId)?.name}</span> membership. Are you sure you want to assign another?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDupConfirm(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { setShowDupConfirm(false); assignMembership(true); }}>
              Assign Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
