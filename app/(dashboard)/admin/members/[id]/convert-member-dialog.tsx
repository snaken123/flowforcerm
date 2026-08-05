"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/lib/use-toast";
import { CheckCircle, Loader2 } from "lucide-react";

interface Service {
  id: string;
  name: string;
  color: string;
}

interface Props {
  memberId: string;
  memberName: string;
  services: Service[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConverted: () => void;
}

type Step = 1 | 2 | 3;

export function ConvertMemberDialog({ memberId, memberName, services, open, onOpenChange, onConverted }: Props) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);

  // Step 1: confirm identity / member number
  const [memberNumber, setMemberNumber] = useState("");

  // Step 2: subscription details
  const [serviceId, setServiceId] = useState("");
  const [startDate, setStartDate] = useState(new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" }));
  const [subType, setSubType] = useState<"session" | "date">("session");
  const [sessionsTotal, setSessionsTotal] = useState("10");
  const [endDate, setEndDate] = useState("");
  const [price, setPrice] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [billingCycle, setBillingCycle] = useState("MONTHLY");

  // Step 3: result
  const [result, setResult] = useState<{ memberNumber: string; serviceName: string } | null>(null);

  function reset() {
    setStep(1);
    setMemberNumber("");
    setServiceId("");
    setStartDate(new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" }));
    setSubType("session");
    setSessionsTotal("10");
    setEndDate("");
    setPrice("");
    setPaymentMethod("cash");
    setBillingCycle("MONTHLY");
    setResult(null);
  }

  function handleClose(open: boolean) {
    if (!open) reset();
    onOpenChange(open);
  }

  async function handleConvert() {
    if (!serviceId || !startDate || !price) {
      toast({ variant: "destructive", title: "Please fill in all required fields." });
      return;
    }
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        memberNumber: memberNumber.trim() || undefined,
        serviceId,
        startDate,
        price: parseFloat(price),
        paymentMethod,
        billingCycle,
      };
      if (subType === "session") {
        body.sessionsTotal = parseInt(sessionsTotal, 10);
      } else {
        body.endDate = endDate || undefined;
      }

      const res = await fetch(`/api/members/${memberId}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ variant: "destructive", title: data.error ?? "Conversion failed" });
        return;
      }
      const svc = services.find((s) => s.id === serviceId);
      setResult({ memberNumber: data.member.memberNumber, serviceName: svc?.name ?? "" });
      setStep(3);
      onConverted();
    } catch {
      toast({ variant: "destructive", title: "An error occurred. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Convert to Full Member</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div className="rounded-lg border p-3 bg-muted/30 text-sm">
              <p className="font-medium">{memberName}</p>
              <p className="text-muted-foreground text-xs mt-0.5">Trial / Inactive member</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="memberNumber">Member Number <span className="text-muted-foreground text-xs">(leave blank to auto-assign)</span></Label>
              <Input
                id="memberNumber"
                placeholder="NS-00001"
                value={memberNumber}
                onChange={(e) => setMemberNumber(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button onClick={() => setStep(2)}>Next: Subscription</Button>
            </DialogFooter>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Service *</Label>
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full inline-block" style={{ backgroundColor: s.color }} />
                        {s.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Start Date *</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Subscription Type</Label>
              <Select value={subType} onValueChange={(v) => setSubType(v as "session" | "date")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="session">Session-based</SelectItem>
                  <SelectItem value="date">Date-based</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {subType === "session" ? (
              <div className="space-y-2">
                <Label>Total Sessions *</Label>
                <Input type="number" min={1} value={sessionsTotal} onChange={(e) => setSessionsTotal(e.target.value)} />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Price (₱) *</Label>
                <Input type="number" min={0} step={0.01} value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                    <SelectItem value="gcash">GCash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="flex gap-2">
              <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={handleConvert} disabled={loading || !serviceId || !price}>
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Convert Member
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 3 && result && (
          <div className="space-y-4 text-center py-4">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            <div>
              <p className="font-semibold text-lg">Member Converted!</p>
              <p className="text-muted-foreground text-sm mt-1">{memberName} is now a full member.</p>
            </div>
            <div className="rounded-lg border p-3 bg-muted/30 space-y-1 text-sm text-left">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Member Number</span>
                <Badge variant="outline">{result.memberNumber}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service</span>
                <span className="font-medium">{result.serviceName}</span>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => handleClose(false)}>Done</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
