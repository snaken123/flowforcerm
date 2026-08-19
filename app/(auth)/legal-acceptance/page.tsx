"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { ChevronDown, Loader2, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SanitizedMarkdown } from "@/components/legal/sanitized-markdown";

type OutstandingDocument = {
  documentId: string;
  type: string;
  title: string;
  version: string;
  content: string;
};

const TYPE_LABELS: Record<string, string> = {
  TERMS_OF_SERVICE: "Terms of Service",
  PRIVACY_POLICY: "Privacy Policy",
  DATA_PROCESSING_AGREEMENT: "Data Processing Agreement",
  ACCEPTABLE_USE_POLICY: "Acceptable Use Policy",
};

function DocumentCard({
  doc,
  checked,
  onCheckedChange,
}: {
  doc: OutstandingDocument;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const [scrolled, setScrolled] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  function handleScroll() {
    const el = ref.current;
    if (!el || scrolled) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) setScrolled(true);
  }

  return (
    <div className="rounded-xl border p-5 space-y-4">
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {TYPE_LABELS[doc.type] ?? doc.type}
        </p>
        <h2 className="text-lg font-bold">{doc.title} <span className="text-sm font-normal text-muted-foreground">v{doc.version}</span></h2>
      </div>

      <div className="relative">
        <div
          ref={ref}
          onScroll={handleScroll}
          className="h-64 overflow-y-auto rounded-lg border bg-muted/30 p-4 text-sm leading-relaxed"
        >
          <SanitizedMarkdown content={doc.content} className="space-y-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-semibold [&_a]:text-primary [&_a]:underline" />
        </div>
        {!scrolled && (
          <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-background/80 to-transparent pointer-events-none rounded-b-lg flex items-end justify-center pb-1">
            <ChevronDown className="h-4 w-4 text-muted-foreground animate-bounce" />
          </div>
        )}
      </div>

      <label className={`flex items-start gap-3 cursor-pointer ${!scrolled ? "opacity-40 pointer-events-none" : ""}`}>
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 accent-primary"
          checked={checked}
          onChange={(e) => onCheckedChange(e.target.checked)}
        />
        <span className="text-sm">
          {doc.type === "PRIVACY_POLICY" || doc.type === "ACCEPTABLE_USE_POLICY"
            ? `I acknowledge the FlowForceRM ${TYPE_LABELS[doc.type] ?? doc.title}.`
            : `I agree to the FlowForceRM ${TYPE_LABELS[doc.type] ?? doc.title}.`}
        </span>
      </label>
      {!scrolled && (
        <p className="text-xs text-muted-foreground -mt-2">↓ Scroll through the document to enable this checkbox</p>
      )}
    </div>
  );
}

export default function LegalAcceptancePage() {
  const router = useRouter();
  const { update } = useSession();
  const [outstanding, setOutstanding] = useState<OutstandingDocument[] | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/legal-agreements/status")
      .then((r) => r.json())
      .then((data) => {
        if (!data.outstanding || data.outstanding.length === 0) {
          router.push("/dashboard");
          return;
        }
        setOutstanding(data.outstanding);
      })
      .catch(() => setError("Could not load agreements. Please refresh the page."));
  }, [router]);

  async function handleContinue() {
    if (!outstanding) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/legal-agreements/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentIds: outstanding.map((d) => d.documentId) }),
      });
      if (!res.ok) throw new Error("Something went wrong. Please try again.");
      // Force the JWT to recompute needsLegalAcceptance now, not on next natural
      // refresh -- a plain GET to /api/auth/session doesn't trigger the "update"
      // path in lib/auth.ts's jwt callback if the token is more than 60s old.
      await update();
      router.push("/dashboard");
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!outstanding) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const allChecked = outstanding.every((d) => checkedIds.has(d.documentId));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ScrollText className="h-6 w-6 text-primary" />
            <div>
              <p className="font-bold text-sm leading-none">FlowForceRM</p>
              <p className="text-xs text-muted-foreground mt-0.5">Before you continue</p>
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

      <main className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-2xl space-y-6">
          <div>
            <h1 className="text-2xl font-bold">FlowForceRM's Agreements Have Been Updated</h1>
            <p className="text-muted-foreground mt-1">
              Please review and accept the following before continuing. Each one requires its own separate agreement.
            </p>
          </div>

          {outstanding.map((doc) => (
            <DocumentCard
              key={doc.documentId}
              doc={doc}
              checked={checkedIds.has(doc.documentId)}
              onCheckedChange={(checked) =>
                setCheckedIds((prev) => {
                  const next = new Set(prev);
                  if (checked) next.add(doc.documentId);
                  else next.delete(doc.documentId);
                  return next;
                })
              }
            />
          ))}

          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button className="w-full" disabled={!allChecked || submitting} onClick={handleContinue}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Continue
          </Button>
        </div>
      </main>
    </div>
  );
}
