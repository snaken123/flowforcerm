"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldOff, Loader2, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";

type SetupState = "idle" | "loading" | "setup" | "verifying" | "enabled" | "disabling";

export function SecurityClient() {
  const [state, setState] = useState<SetupState>("idle");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [disableError, setDisableError] = useState("");
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/2fa/setup")
      .then((r) => r.json())
      .then((d) => { setTotpEnabled(d.enabled ?? false); })
      .catch(() => {})
      .finally(() => setInitialLoading(false));
  }, []);

  async function startSetup() {
    setState("loading");
    try {
      const res = await fetch("/api/auth/2fa/setup");
      const data = await res.json();
      setQrDataUrl(data.qrDataUrl);
      setSecret(data.secret);
      setState("setup");
    } catch {
      setState("idle");
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setCodeError("");
    setState("verifying");
    try {
      const res = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) { setCodeError(data.error ?? "Invalid code."); setState("setup"); return; }
      setTotpEnabled(true);
      setState("enabled");
      setCode("");
    } catch {
      setCodeError("Network error. Try again.");
      setState("setup");
    }
  }

  async function handleDisable(e: React.FormEvent) {
    e.preventDefault();
    setDisableError("");
    setState("disabling");
    try {
      const res = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) { setDisableError(data.error ?? "Failed."); setState("idle"); return; }
      setTotpEnabled(false);
      setPassword("");
      setState("idle");
    } catch {
      setDisableError("Network error. Try again.");
      setState("idle");
    }
  }

  if (initialLoading) {
    return (
      <div className="max-w-lg mx-auto flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="h-6 w-6" />
          Security
        </h1>
        <p className="text-muted-foreground mt-1">Manage two-factor authentication for your account.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Two-Factor Authentication</CardTitle>
            <Badge variant={totpEnabled ? "success" : "secondary"}>
              {totpEnabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
          <CardDescription>
            {totpEnabled
              ? "Your account is protected with an authenticator app."
              : "Add an extra layer of security using an authenticator app like Google Authenticator or Authy."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Success state after enabling */}
          {state === "enabled" && (
            <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-lg p-3 text-sm mb-4">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Two-factor authentication has been enabled successfully.
            </div>
          )}

          {/* Not enabled — show setup button */}
          {!totpEnabled && state !== "setup" && state !== "verifying" && (
            <Button onClick={startSetup} disabled={state === "loading"} className="w-full">
              {state === "loading" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Set Up Authenticator App
            </Button>
          )}

          {/* Setup flow — QR code + code entry */}
          {(state === "setup" || state === "verifying") && (
            <div className="space-y-5">
              <div className="space-y-2">
                <p className="text-sm font-medium">1. Scan this QR code with your authenticator app</p>
                {qrDataUrl && (
                  <div className="flex justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrDataUrl} alt="TOTP QR Code" className="h-44 w-44 rounded-lg border" />
                  </div>
                )}
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer select-none">Can't scan? Enter manually</summary>
                  <code className="block mt-1 break-all bg-muted rounded px-2 py-1">{secret}</code>
                </details>
              </div>

              <form onSubmit={handleVerify} className="space-y-3">
                <p className="text-sm font-medium">2. Enter the 6-digit code from your app</p>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  inputMode="numeric"
                  maxLength={6}
                  className="text-center text-lg tracking-widest font-mono"
                  autoComplete="one-time-code"
                />
                {codeError && (
                  <div className="flex items-center gap-1.5 text-destructive text-sm">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {codeError}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setState("idle")}>Cancel</Button>
                  <Button type="submit" className="flex-1" disabled={code.length !== 6 || state === "verifying"}>
                    {state === "verifying" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Verify & Enable
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Enabled — show disable section */}
          {totpEnabled && state !== "setup" && state !== "verifying" && state !== "enabled" && (
            <form onSubmit={handleDisable} className="space-y-3">
              <p className="text-sm text-muted-foreground">
                To disable two-factor authentication, confirm your account password.
              </p>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowPassword((v) => !v)}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {disableError && (
                <div className="flex items-center gap-1.5 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {disableError}
                </div>
              )}
              <Button type="submit" variant="destructive" className="w-full gap-2"
                disabled={!password || state === "disabling"}>
                {state === "disabling"
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <ShieldOff className="h-4 w-4" />}
                Disable Two-Factor Authentication
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
