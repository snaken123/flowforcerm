"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Eye, EyeOff, CheckCircle2, ChevronDown, Loader2, Shield, FileText, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STEPS = [
  { id: "password", label: "Set Password",   icon: Shield },
  { id: "waiver",   label: "Liability Waiver", icon: FileText },
  { id: "privacy",  label: "Privacy Policy",  icon: Shield },
  { id: "welcome",  label: "Welcome",         icon: BookOpen },
] as const;

type StepId = (typeof STEPS)[number]["id"];

// -- Waiver/privacy text now comes from GET /api/legal-documents (lib/legal-documents.ts) --

// ── Helpers ─────────────────────────────────────────────────────────────────

function ScrollDocument({ text, onScrolled }: { text: string; onScrolled: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const notified = useRef(false);

  function handleScroll() {
    if (notified.current) return;
    const el = ref.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) {
      notified.current = true;
      onScrolled();
    }
  }

  return (
    <div className="relative">
      <div
        ref={ref}
        onScroll={handleScroll}
        className="h-72 overflow-y-auto rounded-lg border bg-muted/30 p-5 text-sm leading-relaxed whitespace-pre-wrap font-mono text-foreground/80"
      >
        {text}
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-background/80 to-transparent pointer-events-none rounded-b-lg flex items-end justify-center pb-1">
        <ChevronDown className="h-4 w-4 text-muted-foreground animate-bounce" />
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

type LegalDocuments = {
  waiverText: string;
  privacyText: string;
  rulesPdfUrl: string | null;
  handbookPdfUrl: string | null;
};

export default function SetupAccountPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const mustChangePassword = (session?.user as any)?.mustChangePassword ?? false;
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [legalDocs, setLegalDocs] = useState<LegalDocuments | null>(null);

  useEffect(() => {
    if (session !== undefined) {
      setCurrentStep(mustChangePassword ? 0 : 1);
    }
  }, [session, mustChangePassword]);

  useEffect(() => {
    fetch("/api/legal-documents").then((r) => r.json()).then(setLegalDocs).catch(() => {});
  }, []);

  const [error, setError] = useState("");

  // Password step state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Document scroll/agree state
  const [scrolled, setScrolled] = useState(false);
  const [agreed, setAgreed] = useState(false);

  function resetDocState() {
    setScrolled(false);
    setAgreed(false);
  }

  async function submit(step: StepId, extra?: object) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/setup-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step, ...extra }),
      });
      if (!res.ok) throw new Error("Something went wrong. Please try again.");
      if (currentStep !== null && currentStep < STEPS.length - 1) {
        setCurrentStep((s) => (s ?? 0) + 1);
        resetDocState();
      } else {
        await fetch("/api/auth/session");
        router.push("/member/athlete-id");
        router.refresh();
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (currentStep === null || !legalDocs) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const step = STEPS[currentStep];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="FlowForceRM" className="h-9 w-9 rounded-full object-contain" />
            <div>
              <p className="font-bold text-sm leading-none">FlowForceRM</p>
              <p className="text-xs text-muted-foreground mt-0.5">Account Setup</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Progress bar */}
      <div className="bg-muted/50 border-b">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => {
              if (i === 0 && !mustChangePassword) return null;
              const done = i < currentStep;
              const active = i === currentStep;
              const Icon = s.icon;
              return (
                <div key={s.id} className="flex items-center gap-2 flex-1 last:flex-none">
                  <div
                    className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 transition-colors ${
                      done ? "bg-emerald-500 text-white" :
                      active ? "bg-primary text-primary-foreground" :
                      "bg-muted text-muted-foreground"
                    }`}
                  >
                    {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-3.5 w-3.5" />}
                  </div>
                  <span className={`text-xs hidden sm:block ${active ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                    {s.label}
                  </span>
                  {i < STEPS.length - 1 && (
                    <div className={`h-px flex-1 mx-1 ${i < currentStep ? "bg-emerald-500" : "bg-border"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-2xl space-y-6">

          {/* ── Step 1: Password ── */}
          {step.id === "password" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold">Set your password</h1>
                <p className="text-muted-foreground mt-1">
                  Your account was created with a temporary password. Choose a new secure password to continue.
                </p>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>New Password</Label>
                  <div className="relative">
                    <Input
                      type={showNew ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Confirm Password</Label>
                  <div className="relative">
                    <Input
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat your new password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs text-destructive">Passwords do not match</p>
                  )}
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                className="w-full"
                disabled={loading || newPassword.length < 8 || newPassword !== confirmPassword}
                onClick={() => submit("password", { newPassword })}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Set Password & Continue
              </Button>
            </div>
          )}

          {/* ── Step 2: Waiver ── */}
          {step.id === "waiver" && (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-bold">Liability Waiver</h1>
                <p className="text-muted-foreground mt-1">
                  Please read the full document below. Scroll to the bottom to accept.
                </p>
              </div>
              <ScrollDocument text={legalDocs.waiverText} onScrolled={() => setScrolled(true)} />
              <label className={`flex items-start gap-3 cursor-pointer ${!scrolled ? "opacity-40 pointer-events-none" : ""}`}>
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-primary"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                />
                <span className="text-sm">
                  I have read, understood, and voluntarily agree to the Assumption of Risk, Waiver of Liability, Release, and Electronic Consent Agreement. I understand this is legally binding.
                </span>
              </label>
              {!scrolled && (
                <p className="text-xs text-muted-foreground">↓ Scroll through the document to enable agreement</p>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                className="w-full"
                disabled={loading || !agreed}
                onClick={() => submit("waiver")}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                I Agree & Accept
              </Button>
            </div>
          )}

          {/* ── Step 3: Privacy ── */}
          {step.id === "privacy" && (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-bold">Privacy & Confidentiality Agreement</h1>
                <p className="text-muted-foreground mt-1">
                  Please read the full document below. Scroll to the bottom to accept.
                </p>
              </div>
              <ScrollDocument text={legalDocs.privacyText} onScrolled={() => setScrolled(true)} />
              <label className={`flex items-start gap-3 cursor-pointer ${!scrolled ? "opacity-40 pointer-events-none" : ""}`}>
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-primary"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                />
                <span className="text-sm">
                  I have read and understood the FlowForceRM Privacy and Confidentiality Agreement and consent to the collection and use of my personal information as described, in accordance with the Philippine Data Privacy Act of 2012.
                </span>
              </label>
              {!scrolled && (
                <p className="text-xs text-muted-foreground">↓ Scroll through the document to enable agreement</p>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                className="w-full"
                disabled={loading || !agreed}
                onClick={() => submit("privacy")}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                I Agree & Accept
              </Button>
            </div>
          )}

          {/* ── Step 4: Welcome (informational) ── */}
          {step.id === "welcome" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold">Welcome to FlowForceRM! 🥋</h1>
                <p className="text-muted-foreground mt-1">
                  You're all set{(legalDocs.rulesPdfUrl || legalDocs.handbookPdfUrl) ? ". Before you jump in, here are resources available to you anytime in the app." : "."}
                </p>
              </div>

              {(legalDocs.rulesPdfUrl || legalDocs.handbookPdfUrl) && (
                <div className="space-y-4">
                  {/* Gym Rules card */}
                  {legalDocs.rulesPdfUrl && (
                    <div className="rounded-xl border bg-muted/30 p-5 flex gap-4 items-start">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <BookOpen className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">Gym Rules & Guidelines</p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                          Our gym rules cover training etiquette, hygiene standards, equipment use, and conduct expectations. We encourage you to read them so you know what to expect on the mat.
                        </p>
                        <a
                          href={legalDocs.rulesPdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block mt-2 text-xs font-medium text-primary hover:underline"
                        >
                          Read Gym Rules →
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Welcome Handbook card */}
                  {legalDocs.handbookPdfUrl && (
                    <div className="rounded-xl border bg-muted/30 p-5 flex gap-4 items-start">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">Welcome Handbook</p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                          The welcome handbook gives you an overview of our programs, class structure, belt progression, and what to bring on your first day. A great starting point for new members.
                        </p>
                        <a
                          href={legalDocs.handbookPdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block mt-2 text-xs font-medium text-primary hover:underline"
                        >
                          Read Welcome Handbook →
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {(legalDocs.rulesPdfUrl || legalDocs.handbookPdfUrl) && (
                <p className="text-xs text-muted-foreground">
                  You can also find these documents anytime under <span className="font-medium">My Profile → Documents</span>.
                </p>
              )}

              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                className="w-full"
                disabled={loading}
                onClick={() => submit("welcome")}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Enter the App
              </Button>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
