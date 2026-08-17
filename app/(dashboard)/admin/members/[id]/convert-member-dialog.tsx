"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/lib/use-toast";
import { CheckCircle, Loader2 } from "lucide-react";
import { useTenantTimezone } from "@/components/tenant-timezone-provider";

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

const schema = z
  .object({
    memberNumber: z.string().optional(),
    serviceId: z.string().min(1, "Service is required"),
    startDate: z.string().min(1, "Start date is required"),
    subType: z.enum(["session", "date"]),
    sessionsTotal: z.string().optional(),
    endDate: z.string().optional(),
    price: z.string().min(1, "Price is required"),
    paymentMethod: z.string(),
    billingCycle: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.subType === "session") {
      const n = parseInt(data.sessionsTotal ?? "", 10);
      if (!data.sessionsTotal || isNaN(n) || n < 1) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["sessionsTotal"], message: "Total sessions is required" });
      }
    }
    const priceNum = parseFloat(data.price);
    if (isNaN(priceNum) || priceNum < 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["price"], message: "Enter a valid price" });
    }
  });

type FormData = z.infer<typeof schema>;

export function ConvertMemberDialog({ memberId, memberName, services, open, onOpenChange, onConverted }: Props) {
  const { toast } = useToast();
  const timeZone = useTenantTimezone();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [memberNumberPrefix, setMemberNumberPrefix] = useState("NS");
  const [result, setResult] = useState<{ memberNumber: string; serviceName: string } | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      memberNumber: "",
      serviceId: "",
      startDate: new Date().toLocaleDateString("en-CA", { timeZone }),
      subType: "session",
      sessionsTotal: "10",
      endDate: "",
      price: "",
      paymentMethod: "cash",
      billingCycle: "MONTHLY",
    },
  });
  const { register, watch, setValue, handleSubmit, formState: { errors } } = form;
  const subType = watch("subType");

  useEffect(() => {
    fetch("/api/member-number-prefix")
      .then((r) => r.json())
      .then((d) => d.prefix && setMemberNumberPrefix(d.prefix))
      .catch(() => {});
  }, []);

  function reset() {
    setStep(1);
    form.reset({
      memberNumber: "",
      serviceId: "",
      startDate: new Date().toLocaleDateString("en-CA", { timeZone }),
      subType: "session",
      sessionsTotal: "10",
      endDate: "",
      price: "",
      paymentMethod: "cash",
      billingCycle: "MONTHLY",
    });
    setResult(null);
  }

  function handleClose(open: boolean) {
    if (!open) reset();
    onOpenChange(open);
  }

  async function goToStep2() {
    setStep(2);
  }

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        memberNumber: data.memberNumber?.trim() || undefined,
        serviceId: data.serviceId,
        startDate: data.startDate,
        price: parseFloat(data.price),
        paymentMethod: data.paymentMethod,
        billingCycle: data.billingCycle,
      };
      if (data.subType === "session") {
        body.sessionsTotal = parseInt(data.sessionsTotal!, 10);
      } else {
        body.endDate = data.endDate || undefined;
      }

      const res = await fetch(`/api/members/${memberId}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const resData = await res.json();
      if (!res.ok) {
        toast({ variant: "destructive", title: resData.error ?? "Conversion failed" });
        return;
      }
      const svc = services.find((s) => s.id === data.serviceId);
      setResult({ memberNumber: resData.member.memberNumber, serviceName: svc?.name ?? "" });
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
                placeholder={`${memberNumberPrefix}-00001`}
                {...register("memberNumber")}
              />
            </div>
            <DialogFooter>
              <Button onClick={goToStep2}>Next: Subscription</Button>
            </DialogFooter>
          </div>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Service *</Label>
              <Select value={watch("serviceId")} onValueChange={(v) => setValue("serviceId", v, { shouldValidate: true })}>
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
              {errors.serviceId && <p className="text-sm text-destructive">{errors.serviceId.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Start Date *</Label>
              <Input type="date" {...register("startDate")} />
              {errors.startDate && <p className="text-sm text-destructive">{errors.startDate.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Subscription Type</Label>
              <Select value={subType} onValueChange={(v) => setValue("subType", v as "session" | "date")}>
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
                <Input type="number" min={1} {...register("sessionsTotal")} />
                {errors.sessionsTotal && <p className="text-sm text-destructive">{errors.sessionsTotal.message}</p>}
              </div>
            ) : (
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" {...register("endDate")} />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Price (₱) *</Label>
                <Input type="number" min={0} step={0.01} {...register("price")} />
                {errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={watch("paymentMethod")} onValueChange={(v) => setValue("paymentMethod", v)}>
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
              <Button type="button" variant="ghost" onClick={() => setStep(1)}>Back</Button>
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Convert Member
              </Button>
            </DialogFooter>
          </form>
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
