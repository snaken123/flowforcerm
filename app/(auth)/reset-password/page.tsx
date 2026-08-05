"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

function ResetForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong."); return; }
      setDone(true);
      setTimeout(() => router.push("/login"), 3000);
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <p className="text-sm text-destructive">Invalid or missing reset link. Please request a new one.</p>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <CheckCircle2 className="h-10 w-10 text-emerald-400" />
        <p className="text-white font-medium">Password updated!</p>
        <p className="text-[#888] text-sm">Redirecting you to login…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password" className="text-[#ccc]">New Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="bg-[#1a1a1a] border-white/20 text-white placeholder:text-[#555] focus-visible:ring-white/30"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm" className="text-[#ccc]">Confirm Password</Label>
        <Input
          id="confirm"
          type="password"
          placeholder="••••••••"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="bg-[#1a1a1a] border-white/20 text-white placeholder:text-[#555] focus-visible:ring-white/30"
        />
      </div>
      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Set New Password
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d0d0d] p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <img src="/NS LOGO.png" alt="FlowForceRM" className="h-16 w-16 object-cover rounded-full" />
          </div>
          <h1 className="text-3xl font-bold uppercase tracking-widest text-white">FlowForceRM</h1>
          <p className="text-[#666] uppercase tracking-[0.2em] text-xs">Manage Less. Train More.</p>
        </div>
        <Card className="bg-[#111] border-white/10 text-white">
          <CardHeader>
            <CardTitle className="text-white">Set New Password</CardTitle>
            <CardDescription className="text-[#666]">Choose a new password for your account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Suspense fallback={<div className="h-40" />}>
              <ResetForm />
            </Suspense>
            <p className="text-center text-sm text-[#555]">
              <Link href="/login" className="hover:text-white transition-colors">← Back to login</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
