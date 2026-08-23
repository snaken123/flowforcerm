"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Shield, BookOpen, BookMarked, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

type LegalDocuments = {
  waiverText: string;
  privacyText: string;
  rulesPdfUrl: string | null;
  handbookPdfUrl: string | null;
};

function formatAgreedDate(date: string | Date | null | undefined) {
  if (!date) return null;
  return new Date(date).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
}

export function DocumentsSection({ waiverDate, privacyAcceptedAt }: { waiverDate?: string | Date | null; privacyAcceptedAt?: string | Date | null }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [docs, setDocs] = useState<LegalDocuments | null>(null);

  useEffect(() => {
    fetch("/api/legal-documents").then((r) => r.json()).then(setDocs).catch(() => {});
  }, []);

  const agreedDates: Record<string, string | null> = {
    waiver: formatAgreedDate(waiverDate),
    privacy: formatAgreedDate(privacyAcceptedAt),
  };

  if (!docs) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">My Documents</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const DOCS = [
    { id: "waiver", label: "Liability Waiver", icon: FileText, type: "text" as const, content: docs.waiverText },
    { id: "privacy", label: "Privacy & Confidentiality", icon: Shield, type: "text" as const, content: docs.privacyText },
    { id: "rules", label: "Gym Rules & Guidelines", icon: BookOpen, type: "pdf" as const, src: docs.rulesPdfUrl },
    { id: "handbook", label: "Welcome Handbook", icon: BookMarked, type: "pdf" as const, src: docs.handbookPdfUrl },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">My Documents</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 p-4 pt-0">
        {DOCS.map((doc) => {
          const Icon = doc.icon;
          const isOpen = openId === doc.id;
          const agreedOn = agreedDates[doc.id] ?? null;
          return (
            <div key={doc.id} className="rounded-md border overflow-hidden">
              <button
                onClick={() => setOpenId(isOpen ? null : doc.id)}
                className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <span className="text-sm font-medium">{doc.label}</span>
                    {agreedOn && (
                      <p className="text-xs text-emerald-600 font-medium mt-0.5">✓ Agreed on {agreedOn}</p>
                    )}
                  </div>
                </div>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              {isOpen && (
                <div className="border-t">
                  {doc.type === "text" ? (
                    <div className="h-80 overflow-y-auto p-4 text-xs leading-relaxed whitespace-pre-wrap font-mono text-foreground/80 bg-muted/20">
                      {doc.content}
                    </div>
                  ) : doc.src ? (
                    <iframe
                      src={doc.src}
                      className="w-full h-[500px]"
                      title={doc.label}
                    />
                  ) : (
                    <p className="p-4 text-xs text-muted-foreground">Not yet uploaded by the gym.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
