"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, CreditCard, AlertCircle } from "lucide-react";
import { toast } from "@/lib/use-toast";

type SubscriptionInfo = {
  baseRateCentavos: number;
  status: string;
  trialEndsAt: string | null;
  paymentMethodSetupAt: string | null;
};

const ERROR_MESSAGES: Record<string, string> = {
  missing: "We couldn't find a pending payment method setup. Please start again.",
  incomplete: "It looks like the card entry wasn't completed. Please try again.",
  failed: "Something went wrong finishing setup. Please try again.",
};

export default function BillingSetupPage() {
  const searchParams = useSearchParams();
  const [info, setInfo] = useState<SubscriptionInfo | null>(null);
  const [starting, setStarting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetch("/api/billing-setup").then((r) => r.json()).then((d) => {
      if (!("error" in d)) setInfo(d);
    });
  }, []);

  const errorMsg = searchParams.get("error");

  async function startSetup() {
    setStarting(true);
    try {
      const res = await fetch("/api/billing-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast({ variant: "destructive", title: "Billing isn't connected yet", description: body.error });
        return;
      }
      if (body.actionUrl) {
        window.location.href = body.actionUrl;
      } else {
        toast({ variant: "destructive", title: "No payment page returned. Please try again." });
      }
    } catch {
      toast({ variant: "destructive", title: "Network error — please try again." });
    } finally {
      setStarting(false);
    }
  }

  async function cancelTrial() {
    setCancelling(true);
    try {
      const res = await fetch("/api/billing-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast({ variant: "destructive", title: "Couldn't cancel", description: body.error });
        return;
      }
      toast({ title: "Cancelled — you won't be billed." });
    } catch {
      toast({ variant: "destructive", title: "Network error — please try again." });
    } finally {
      setCancelling(false);
    }
  }

  const pesos = info ? (info.baseRateCentavos / 100).toFixed(2) : null;
  const alreadySetUp = !!info?.paymentMethodSetupAt;

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <CreditCard className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Set Up Billing</CardTitle>
          <CardDescription>
            {pesos ? `Your plan is ₱${pesos}/month.` : "Loading your plan…"} Start with a free 30-day trial —
            we just need a payment method on file first.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMsg && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              {ERROR_MESSAGES[errorMsg] ?? "Something went wrong."}
            </div>
          )}

          <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1.5">
            <p>
              <strong className="text-foreground">You won't be charged today.</strong> Your 30-day free trial
              starts as soon as your payment method is on file.
            </p>
            <p>
              You can cancel anytime within the first 30 days at no cost. If you don't cancel, billing starts
              automatically once the trial ends.
            </p>
          </div>

          {alreadySetUp ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                Payment method on file
                {info?.trialEndsAt && ` — trial ends ${new Date(info.trialEndsAt).toLocaleDateString()}`}.
              </p>
              {info?.status === "PENDING_FIRST_CHARGE" && (
                <Button variant="outline" className="w-full" onClick={cancelTrial} disabled={cancelling}>
                  {cancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Cancel trial (no charge)
                </Button>
              )}
            </div>
          ) : (
            <Button className="w-full" onClick={startSetup} disabled={starting}>
              {starting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Payment Method & Start Trial
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
