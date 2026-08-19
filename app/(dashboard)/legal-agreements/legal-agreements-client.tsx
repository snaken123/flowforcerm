"use client";

import { useState } from "react";
import { ScrollText, ChevronDown, ChevronUp, Send, CheckCircle2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate } from "@/lib/utils";
import { SanitizedMarkdown } from "@/components/legal/sanitized-markdown";
import { SubprocessorsList, type SubprocessorInfo } from "@/components/legal/subprocessors-list";

const PRIVACY_REQUEST_TYPES = [
  { value: "ACCESS", label: "What data does FlowForceRM hold about me?" },
  { value: "CORRECTION", label: "Correct inaccurate information" },
  { value: "DELETION", label: "Delete my account and data" },
  { value: "OBJECTION", label: "Object to a specific use of my data" },
  { value: "DATA_PORTABILITY", label: "Transfer my data elsewhere" },
  { value: "OTHER", label: "Something else" },
] as const;

function PrivacyRequestForm() {
  const [type, setType] = useState<string>("ACCESS");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/privacy-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, details: details || undefined }),
      });
      if (!res.ok) throw new Error("Request failed. Please try again.");
      setSubmitted(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-lg border p-5 flex items-center gap-2 text-sm text-green-700 bg-green-50">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        Your request has been received. Your gym's admin will review it.
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-5 space-y-3">
      <div>
        <h2 className="font-semibold text-sm">Submit a Privacy Request</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          About your own account data on FlowForceRM. Reviewed by your gym's admin.
        </p>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Request type</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {PRIVACY_REQUEST_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <Textarea
        placeholder="Optional: add any details about your request"
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        rows={3}
        maxLength={500}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button size="sm" onClick={submit} disabled={submitting} className="gap-2">
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Submit Request
      </Button>
    </div>
  );
}

type Row = {
  id: string;
  type: string;
  version: string;
  scope: "ORGANIZATION" | "INDIVIDUAL";
  acceptedAt: string;
  acceptedByMe: boolean;
  acceptedByName: string;
  title: string;
  content: string | null;
};

const TYPE_LABELS: Record<string, string> = {
  TERMS_OF_SERVICE: "Terms of Service",
  PRIVACY_POLICY: "Privacy Policy",
  DATA_PROCESSING_AGREEMENT: "Data Processing Agreement",
  ACCEPTABLE_USE_POLICY: "Acceptable Use Policy",
};

export function LegalAgreementsClient({ rows, subprocessors }: { rows: Row[]; subprocessors: SubprocessorInfo[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <ScrollText className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Legal & Agreements</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        FlowForceRM's own platform-level agreements you or your organization have accepted. This is separate from your
        gym's own waiver and rules, which are under your profile's Documents section.
      </p>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No agreements accepted yet.
        </div>
      ) : (
        <div className="rounded-lg border divide-y">
          {rows.map((row) => {
            const expanded = expandedId === row.id;
            return (
              <div key={row.id}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{row.title}</span>
                      <span className="text-xs text-muted-foreground">v{row.version}</span>
                      <Badge variant="secondary" className="text-[10px]">{TYPE_LABELS[row.type] ?? row.type}</Badge>
                      {row.scope === "ORGANIZATION" && (
                        <Badge variant="outline" className="text-[10px]">Organization-wide</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {row.acceptedByMe ? "Accepted" : `Accepted by ${row.acceptedByName}`} on {formatDate(row.acceptedAt)}
                    </p>
                  </div>
                  {row.content && (
                    <button
                      onClick={() => setExpandedId(expanded ? null : row.id)}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 shrink-0"
                    >
                      {expanded ? "Hide" : "View"} {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                  )}
                </div>
                {expanded && row.content && (
                  <div className="px-4 pb-4">
                    <div className="max-h-72 overflow-y-auto rounded-md border bg-muted/30 p-4 text-sm">
                      <SanitizedMarkdown
                        content={row.content}
                        className="space-y-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-semibold"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <SubprocessorsList subprocessors={subprocessors} />
      <PrivacyRequestForm />
    </div>
  );
}
