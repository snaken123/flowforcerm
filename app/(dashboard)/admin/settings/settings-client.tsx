"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  KeyRound, Monitor, ShoppingBag, Eye, EyeOff,
  Tablet, Plus, Trash2, Copy, Check, AlertCircle, Palette, Loader2, ImageUp,
  FileText, Shield, BookOpen, Scroll, Upload,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { PhotoCropDialog } from "@/components/photo-crop-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type AccountInfo = { email: string; updatedAt: string } | null;

type Branding = {
  gymName: string;
  slogan: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  emailFromName: string | null;
  smsSenderName: string | null;
  timezone: string;
};

// Falls back to a fixed list on older engines without Intl.supportedValuesOf.
function listTimeZones(): string[] {
  try {
    const zones = (Intl as any).supportedValuesOf?.("timeZone");
    if (Array.isArray(zones) && zones.length > 0) return zones;
  } catch {
    // fall through to the static list
  }
  return [
    "Asia/Manila", "UTC", "America/New_York", "America/Chicago", "America/Denver",
    "America/Los_Angeles", "America/Sao_Paulo", "Europe/London", "Europe/Paris",
    "Europe/Berlin", "Asia/Dubai", "Asia/Kolkata", "Asia/Singapore", "Asia/Hong_Kong",
    "Asia/Tokyo", "Asia/Seoul", "Asia/Shanghai", "Australia/Sydney", "Pacific/Auckland",
  ];
}

function BrandingSection() {
  const [branding, setBranding] = useState<Branding>({
    gymName: "",
    slogan: "",
    logoUrl: null,
    primaryColor: "#2563eb",
    accentColor: "#f1f5f9",
    emailFromName: "",
    smsSenderName: "",
    timezone: "Asia/Manila",
  });
  const [timeZones] = useState<string[]>(listTimeZones);
  const [loaded, setLoaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/branding")
      .then((r) => r.json())
      .then((data) => {
        if (data.branding) {
          setBranding({
            gymName: data.branding.gymName ?? "",
            slogan: data.branding.slogan ?? "",
            logoUrl: data.branding.logoUrl,
            primaryColor: data.branding.primaryColor ?? "#2563eb",
            accentColor: data.branding.accentColor ?? "#f1f5f9",
            emailFromName: data.branding.emailFromName ?? "",
            smsSenderName: data.branding.smsSenderName ?? "",
            timezone: data.branding.timezone ?? "Asia/Manila",
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setCropSrc(URL.createObjectURL(file));
    e.target.value = "";
  }

  async function handleCropConfirm(blob: Blob) {
    setCropSrc(null);
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", new File([blob], "logo.png", { type: "image/png" }));
      const res = await fetch("/api/admin/branding/logo", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Upload failed."); return; }
      setBranding((b) => ({ ...b, logoUrl: data.url }));
    } catch {
      setError("Network error during upload.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    if (!branding.gymName.trim()) { setError("Gym name is required."); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/branding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(branding),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to save."); return; }
      setSuccess(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Palette className="h-4 w-4" />
          Branding
        </CardTitle>
        <CardDescription>Your gym's name, logo, and brand colors across the app.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full border overflow-hidden flex items-center justify-center bg-muted shrink-0">
              {branding.logoUrl ? (
                <img src={branding.logoUrl} alt="Logo" className="h-full w-full object-contain" />
              ) : (
                <ImageUp className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div>
              <Label htmlFor="logo-upload" className="cursor-pointer">
                <span className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-muted transition-colors">
                  {uploading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {uploading ? "Uploading…" : "Upload Logo"}
                </span>
              </Label>
              <input
                id="logo-upload"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={handleLogoChange}
                disabled={uploading}
              />
              <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WEBP, or SVG.</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Gym Name</Label>
            <Input
              value={branding.gymName}
              onChange={(e) => setBranding((b) => ({ ...b, gymName: e.target.value }))}
              placeholder="Iron Fist BJJ"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Slogan</Label>
            <Input
              value={branding.slogan ?? ""}
              onChange={(e) => setBranding((b) => ({ ...b, slogan: e.target.value }))}
              placeholder="Manage Less. Train More."
              maxLength={120}
            />
            <p className="text-xs text-muted-foreground">Shown under your gym name in the sidebar. Leave blank to use the default.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Primary Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={branding.primaryColor ?? "#2563eb"}
                  onChange={(e) => setBranding((b) => ({ ...b, primaryColor: e.target.value }))}
                  className="h-9 w-10 rounded border cursor-pointer bg-transparent"
                />
                <Input
                  value={branding.primaryColor ?? ""}
                  onChange={(e) => setBranding((b) => ({ ...b, primaryColor: e.target.value }))}
                  placeholder="#2563eb"
                  className="font-mono text-sm"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Accent Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={branding.accentColor ?? "#f1f5f9"}
                  onChange={(e) => setBranding((b) => ({ ...b, accentColor: e.target.value }))}
                  className="h-9 w-10 rounded border cursor-pointer bg-transparent"
                />
                <Input
                  value={branding.accentColor ?? ""}
                  onChange={(e) => setBranding((b) => ({ ...b, accentColor: e.target.value }))}
                  placeholder="#f1f5f9"
                  className="font-mono text-sm"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Email Sender Name</Label>
              <Input
                value={branding.emailFromName ?? ""}
                onChange={(e) => setBranding((b) => ({ ...b, emailFromName: e.target.value }))}
                placeholder="Iron Fist BJJ"
              />
            </div>
            <div className="space-y-1.5">
              <Label>SMS Sender Name</Label>
              <Input
                value={branding.smsSenderName ?? ""}
                onChange={(e) => setBranding((b) => ({ ...b, smsSenderName: e.target.value }))}
                placeholder="IronFist"
                maxLength={20}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Timezone</Label>
            <Select
              value={branding.timezone}
              onValueChange={(v) => setBranding((b) => ({ ...b, timezone: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeZones.map((tz) => (
                  <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Used for schedules, reports, and check-in windows.</p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-emerald-600">Branding saved.</p>}

          <Button type="submit" disabled={saving || uploading}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {saving ? "Saving…" : "Save Branding"}
          </Button>
        </form>
      </CardContent>

      {cropSrc && (
        <PhotoCropDialog
          open={!!cropSrc}
          src={cropSrc}
          format="image/png"
          title="Crop Logo"
          onConfirm={handleCropConfirm}
          onCancel={() => setCropSrc(null)}
        />
      )}
    </Card>
  );
}

type LegalDocuments = {
  waiverText: string;
  privacyText: string;
  rulesPdfUrl: string;
  handbookPdfUrl: string;
};

function LegalDocumentsSection() {
  const [docs, setDocs] = useState<LegalDocuments | null>(null);
  const [waiverText, setWaiverText] = useState("");
  const [privacyText, setPrivacyText] = useState("");
  const [savingText, setSavingText] = useState(false);
  const [textSaved, setTextSaved] = useState(false);
  const [textError, setTextError] = useState("");
  const [uploadingKind, setUploadingKind] = useState<"rules" | "handbook" | null>(null);
  const [uploadError, setUploadError] = useState("");

  useEffect(() => {
    fetch("/api/legal-documents")
      .then((r) => r.json())
      .then((data: LegalDocuments) => {
        setDocs(data);
        setWaiverText(data.waiverText);
        setPrivacyText(data.privacyText);
      })
      .catch(() => {});
  }, []);

  async function saveText() {
    setSavingText(true);
    setTextError("");
    setTextSaved(false);
    try {
      const res = await fetch("/api/admin/settings/legal-documents", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ waiverText, privacyText }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setTextError(d.error ?? "Failed to save."); return; }
      setTextSaved(true);
    } catch {
      setTextError("Network error. Please try again.");
    } finally {
      setSavingText(false);
    }
  }

  async function replacePdf(kind: "rules" | "handbook", file: File) {
    setUploadingKind(kind);
    setUploadError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", kind);
      const res = await fetch("/api/admin/settings/legal-documents/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setUploadError(data.error ?? "Upload failed."); return; }
      setDocs((d) => d && ({ ...d, [kind === "rules" ? "rulesPdfUrl" : "handbookPdfUrl"]: data.url }));
    } catch {
      setUploadError("Network error during upload.");
    } finally {
      setUploadingKind(null);
    }
  }

  if (!docs) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Scroll className="h-4 w-4" />
          Legal Documents
        </CardTitle>
        <CardDescription>Edit the waiver and privacy text members agree to, and replace the rules/handbook PDFs.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" />Liability Waiver</Label>
          <Textarea
            value={waiverText}
            onChange={(e) => setWaiverText(e.target.value)}
            className="min-h-[200px] font-mono text-xs"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" />Privacy & Confidentiality</Label>
          <Textarea
            value={privacyText}
            onChange={(e) => setPrivacyText(e.target.value)}
            className="min-h-[200px] font-mono text-xs"
          />
        </div>
        {textError && <p className="text-sm text-destructive">{textError}</p>}
        {textSaved && <p className="text-sm text-emerald-600">Saved.</p>}
        <Button onClick={saveText} disabled={savingText || !waiverText.trim() || !privacyText.trim()}>
          {savingText && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {savingText ? "Saving…" : "Save Text"}
        </Button>

        <div className="border-t pt-5 grid gap-4 sm:grid-cols-2">
          {([
            { kind: "rules" as const, label: "Gym Rules & Guidelines", url: docs.rulesPdfUrl, icon: BookOpen },
            { kind: "handbook" as const, label: "Welcome Handbook", url: docs.handbookPdfUrl, icon: BookOpen },
          ]).map(({ kind, label, url, icon: Icon }) => (
            <div key={kind} className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Icon className="h-3.5 w-3.5" />{label}</Label>
              <div className="flex items-center gap-2">
                <a href={url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline truncate">
                  View current PDF
                </a>
              </div>
              <Label htmlFor={`pdf-upload-${kind}`} className="cursor-pointer">
                <span className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-muted transition-colors">
                  {uploadingKind === kind ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  {uploadingKind === kind ? "Uploading…" : "Replace PDF"}
                </span>
              </Label>
              <input
                id={`pdf-upload-${kind}`}
                type="file"
                accept="application/pdf"
                className="hidden"
                disabled={uploadingKind !== null}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) replacePdf(kind, file);
                  e.target.value = "";
                }}
              />
            </div>
          ))}
        </div>
        {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}
      </CardContent>
    </Card>
  );
}

function PasswordForm({ account, label, icon: Icon, email }: {
  account: "kiosk" | "store";
  label: string;
  icon: React.ElementType;
  email?: string;
}) {
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    if (newPassword !== confirm) { setError("Passwords do not match."); return; }
    if (newPassword.length < 6) { setError("Password must be at least 6 characters."); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/system-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account, newPassword, adminPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to update password."); return; }
      setSuccess(true);
      setNewPassword("");
      setConfirm("");
      setAdminPassword("");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {label}
        </CardTitle>
        {email && (
          <CardDescription className="font-mono text-xs">{email}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>New Password</Label>
            <div className="relative">
              <Input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                required
              />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowNew((v) => !v)}>
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Confirm New Password</Label>
            <Input
              type={showNew ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat new password"
              required
            />
          </div>

          <div className="space-y-1.5 pt-1 border-t">
            <Label>Your Admin Password <span className="text-muted-foreground text-xs font-normal">(to confirm)</span></Label>
            <div className="relative">
              <Input
                type={showAdmin ? "text" : "password"}
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Your admin password"
                required
              />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowAdmin((v) => !v)}>
                {showAdmin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-green-600 font-medium">Password updated successfully.</p>}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Updating..." : `Update ${label} Password`}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── Kiosk Devices ───────────────────────────────────────────────────────────

type KioskDevice = { id: string; label: string; createdAt: string };

function KioskDevicesSection() {
  const [devices, setDevices] = useState<KioskDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/kiosk-devices");
      if (res.ok) setDevices(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");
    if (!newLabel.trim()) { setAddError("Device label is required."); return; }
    setAdding(true);
    try {
      const res = await fetch("/api/admin/kiosk-devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newLabel.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setAddError(data.error ?? "Failed to create device."); return; }
      setNewToken(data.token);
      setNewLabel("");
      load();
    } catch {
      setAddError("Network error. Please try again.");
    } finally {
      setAdding(false);
    }
  }

  async function handleRevoke(id: string) {
    setRevoking(id);
    try {
      await fetch("/api/admin/kiosk-devices", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setDevices((prev) => prev.filter((d) => d.id !== id));
    } finally {
      setRevoking(null);
    }
  }

  function copyToken() {
    if (!newToken) return;
    navigator.clipboard.writeText(newToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Kiosk Devices</h2>
        <Button size="sm" variant="outline" onClick={() => setShowAdd(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Register Device
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-sm text-muted-foreground p-4">Loading…</p>
          ) : devices.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Tablet className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No devices registered.</p>
              <p className="text-xs text-muted-foreground/70">
                Register a device to restrict kiosk access to approved hardware only.
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {devices.map((d) => (
                <li key={d.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Tablet className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{d.label}</p>
                      <p className="text-xs text-muted-foreground">
                        Registered {new Date(d.createdAt).toLocaleDateString("en-PH", { dateStyle: "medium" })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">Active</Badge>
                    <Button
                      size="sm" variant="ghost"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                      disabled={revoking === d.id}
                      onClick={() => handleRevoke(d.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Add device dialog */}
      <Dialog open={showAdd} onOpenChange={(open) => { if (!open) { setShowAdd(false); setNewLabel(""); setAddError(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Register Kiosk Device</DialogTitle>
          </DialogHeader>
          {newToken ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-4 flex gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800 dark:text-amber-200">
                  <p className="font-semibold mb-1">Copy this token now.</p>
                  <p>It will not be shown again. Enter it on the kiosk device when prompted.</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Device Token</Label>
                <div className="flex gap-2">
                  <Input value={newToken} readOnly className="font-mono text-xs" />
                  <Button type="button" variant="outline" size="icon" onClick={copyToken}>
                    {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => { setShowAdd(false); setNewToken(null); }}>Done</Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Device Label</Label>
                <Input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="e.g. Front Desk iPad"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">A name to identify this physical device.</p>
              </div>
              {addError && <p className="text-sm text-destructive">{addError}</p>}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
                <Button type="submit" disabled={adding}>
                  {adding ? "Generating…" : "Generate Token"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Root ────────────────────────────────────────────────────────────────────

export function SettingsClient({ showSpecializedRoles }: { showSpecializedRoles: boolean }) {
  const [accounts, setAccounts] = useState<{ kiosk: AccountInfo; store: AccountInfo }>({ kiosk: null, store: null });

  useEffect(() => {
    if (!showSpecializedRoles) return;
    fetch("/api/admin/system-accounts")
      .then((r) => r.json())
      .then(setAccounts)
      .catch(() => {});
  }, [showSpecializedRoles]);

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <KeyRound className="h-6 w-6" />
          Settings
        </h1>
        <p className="text-muted-foreground mt-1">Manage system account credentials and devices.</p>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Branding</h2>
        <BrandingSection />
      </div>

      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Legal Documents</h2>
        <LegalDocumentsSection />
      </div>

      {showSpecializedRoles && (
        <>
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">System Accounts</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <PasswordForm
                account="kiosk"
                label="Kiosk"
                icon={Monitor}
                email={accounts.kiosk?.email ?? undefined}
              />
              <PasswordForm
                account="store"
                label="Store"
                icon={ShoppingBag}
                email={accounts.store?.email ?? undefined}
              />
            </div>
          </div>

          <KioskDevicesSection />
        </>
      )}
    </div>
  );
}
