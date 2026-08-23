"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Download, Trash2, Loader2, CheckCircle2, AlertCircle, ShieldCheck,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";

const REQUEST_TYPES = [
  { value: "DELETION", label: "Delete my account and data" },
  { value: "CORRECTION", label: "Correct inaccurate information" },
  { value: "OBJECTION", label: "Object to a specific use of my data" },
  { value: "DATA_PORTABILITY", label: "Transfer my data elsewhere" },
  { value: "OTHER", label: "Something else" },
] as const;

export default function PrivacyPage() {
  const [exporting, setExporting] = useState(false);
  const [requestType, setRequestType] = useState<string>("DELETION");
  const [deletionReason, setDeletionReason] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch("/api/member/privacy/export");
      if (!res.ok) { setError("Export failed. Please try again."); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `my-data-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  async function handlePrivacyRequest() {
    setSubmitting(true); setError("");
    try {
      const res = await fetch("/api/privacy-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: requestType, details: deletionReason || undefined }),
      });
      if (!res.ok) { setError("Request failed. Please try again."); return; }
      setSubmitted(true);
    } catch {
      setError("Request failed. Please try again.");
    } finally {
      setSubmitting(false); setShowConfirm(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="h-6 w-6" />
          Privacy & Data
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your personal data under the Philippine Data Privacy Act (RA 10173).
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-destructive bg-destructive/10 rounded-lg p-3 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Export */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export My Data
          </CardTitle>
          <CardDescription>
            Download a copy of all personal data we hold about you, including your profile,
            memberships, payment history, check-ins, and rank records.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleExport} disabled={exporting} variant="outline" className="w-full gap-2">
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {exporting ? "Preparing export…" : "Download My Data"}
          </Button>
        </CardContent>
      </Card>

      {/* Privacy request */}
      <Card className="border-destructive/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-destructive">
            <Trash2 className="h-4 w-4" />
            Submit a Privacy Request
          </CardTitle>
          <CardDescription>
            Request deletion, correction, or other action on your personal data.
            The gym's staff will review your request and contact you to confirm.
            Active memberships must be settled before a deletion request can proceed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {submitted ? (
            <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-lg p-3 text-sm">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Your request has been received. The gym's staff will follow up with you.
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <Label>What would you like to request?</Label>
                <Select value={requestType} onValueChange={setRequestType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REQUEST_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                placeholder="Optional: add any details about your request"
                value={deletionReason}
                onChange={(e) => setDeletionReason(e.target.value)}
                rows={3}
                maxLength={500}
              />
              <Button
                variant="destructive"
                className="w-full gap-2"
                onClick={() => setShowConfirm(true)}
              >
                <Trash2 className="h-4 w-4" />
                Submit Request
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Privacy Request</DialogTitle>
            <DialogDescription>
              This will notify the gym's staff to review your request.
              {requestType === "DELETION" && " Deletion cannot be undone once processed."} Are you sure?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handlePrivacyRequest}
              disabled={submitting}
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Yes, Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
