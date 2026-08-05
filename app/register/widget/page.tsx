"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, CheckCircle2, AlertCircle } from "lucide-react";

type Step = "form" | "sent" | "exists";

export default function RegisterWidget() {
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [step, setStep] = useState<Step>("form");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]   = useState("");
  const [email, setEmail]         = useState("");
  const [phone, setPhone]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  useEffect(() => {
    fetch("/api/admin/settings/registration")
      .then((r) => r.json())
      .then((d) => setWelcomeMessage(d.message ?? ""));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/register/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email, phone }),
      });
      const data = await res.json();
      if (data.exists) { setStep("exists"); return; }
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setStep("sent");
    } catch (err: any) {
      setError(err.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-zinc-950 px-8 py-6 text-center">
        <img src="/NS LOGO.png" alt="FlowForceRM" className="h-12 w-12 rounded-full object-cover mx-auto mb-3" />
        <p className="text-white font-bold text-lg tracking-wide uppercase">FlowForceRM</p>
        <p className="text-zinc-400 text-xs uppercase tracking-widest">Manage Less. Train More.</p>
      </div>

      <div className="px-8 py-6">
        {step === "form" && (
          <>
            {welcomeMessage && (
              <p className="text-sm text-zinc-600 mb-6 text-center leading-relaxed">{welcomeMessage}</p>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName" className="text-xs font-semibold text-zinc-700">First Name</Label>
                  <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Juan" required className="text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName" className="text-xs font-semibold text-zinc-700">Last Name</Label>
                  <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)}
                    placeholder="Dela Cruz" required className="text-sm" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-zinc-700">Email Address</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="juan@email.com" required className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-semibold text-zinc-700">Phone Number</Label>
                <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                  placeholder="09XX XXX XXXX" required className="text-sm" />
              </div>
              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  <AlertCircle className="h-4 w-4 shrink-0" /> {error}
                </div>
              )}
              <Button type="submit" className="w-full bg-zinc-950 hover:bg-zinc-800 text-white font-semibold" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {loading ? "Sending…" : "Get My Free Trial →"}
              </Button>
              <p className="text-[11px] text-zinc-400 text-center">
                We'll send you a link to choose your class. No credit card required.
              </p>
            </form>
          </>
        )}

        {step === "sent" && (
          <div className="text-center py-4 space-y-4">
            <div className="flex justify-center">
              <div className="rounded-full bg-green-100 p-4">
                <Mail className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <h3 className="font-bold text-lg text-zinc-900">Check your inbox!</h3>
            <p className="text-sm text-zinc-600 leading-relaxed">
              We sent a confirmation link to <strong>{email}</strong>.
              Click it to choose your free class.
            </p>
            <p className="text-xs text-zinc-400">The link expires in 1 hour. Check your spam folder if you don't see it.</p>
          </div>
        )}

        {step === "exists" && (
          <div className="text-center py-4 space-y-4">
            <div className="flex justify-center">
              <div className="rounded-full bg-amber-100 p-4">
                <AlertCircle className="h-8 w-8 text-amber-600" />
              </div>
            </div>
            <h3 className="font-bold text-lg text-zinc-900">Email already registered</h3>
            <p className="text-sm text-zinc-600 leading-relaxed">
              It looks like <strong>{email}</strong> has already been used to claim a free trial.
            </p>
            <p className="text-sm text-zinc-600">
              If you think this is a mistake, please coordinate with our front desk — we'd be happy to help!
            </p>
            <p className="text-xs text-zinc-400">members@flowforcerm.com</p>
            <button
              onClick={() => { setStep("form"); setEmail(""); setError(""); }}
              className="text-sm text-zinc-500 underline underline-offset-2 hover:text-zinc-800 transition-colors"
            >
              ← Go back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
