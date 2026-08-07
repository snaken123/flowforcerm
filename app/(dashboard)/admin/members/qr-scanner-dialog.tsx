"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2, ScanLine, AlertCircle, CheckCircle2, QrCode, RotateCcw,
  Usb, Lock, X, Check, UserSearch, ScanFace,
} from "lucide-react";
import { formatDate, getInitials } from "@/lib/utils";
import { useTenantTimezone } from "@/components/tenant-timezone-provider";
import Link from "next/link";
import Image from "next/image";

const MODELS_URL = "/models";
const FACE_MATCH_THRESHOLD = 0.7;
const FACE_SCAN_INTERVAL_MS = 800;

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "success",
  FROZEN: "warning",
  INACTIVE: "secondary",
  CANCELLED: "destructive",
};

interface QRScannerDialogProps {
  open: boolean;
  onClose: () => void;
}

type ScanState = "ready" | "loading" | "found" | "error";
type ScanMode = "face" | "usb";

export function QRScannerDialog({ open, onClose }: QRScannerDialogProps) {
  const { data: session } = useSession();
  const isAdminOrStaff = ["ADMIN", "STAFF"].includes((session?.user as any)?.role ?? "");
  const [mode, setMode] = useState<ScanMode>("usb");
  const [scanState, setScanState] = useState<ScanState>("ready");
  const [member, setMember] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Close lock
  const [showClosePrompt, setShowClosePrompt] = useState(false);
  const [closePassword, setClosePassword] = useState("");
  const [closeError, setCloseError] = useState("");
  const [closingVerify, setClosingVerify] = useState(false);
  const closeInputRef = useRef<HTMLInputElement>(null);

  // USB scanner state
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputVal, setInputVal] = useState("");

  // Face recognition state
  // Track members who have already checked in today (persisted to localStorage)
  const checkedInTodayRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const key = `checkin-${new Date().toDateString()}`;
    const stored = localStorage.getItem(key);
    checkedInTodayRef.current = stored ? new Set(JSON.parse(stored)) : new Set();
  }, []);
  function markCheckedIn(memberId: string) {
    checkedInTodayRef.current.add(memberId);
    const key = `checkin-${new Date().toDateString()}`;
    localStorage.setItem(key, JSON.stringify(Array.from(checkedInTodayRef.current)));
  }

  const faceVideoRef = useRef<HTMLVideoElement>(null);
  const faceStreamRef = useRef<MediaStream | null>(null);
  const faceMatcherRef = useRef<any>(null);
  const faceMembersRef = useRef<Map<string, any>>(new Map());
  const faceScanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const faceLastMatchRef = useRef<string>("");
  const faceCooldownRef = useRef(false);
  const faceUnrecognizedTimerRef = useRef<NodeJS.Timeout | null>(null);
  const faceApiRef = useRef<any>(null);
  const [faceStatus, setFaceStatus] = useState<"loading" | "ready" | "face-detected" | "no-enrolled" | "error" | "already-checked-in" | "unrecognized">("loading");
  const [faceDebug, setFaceDebug] = useState("");

  // Reset when dialog opens/closes + enter/exit fullscreen
  useEffect(() => {
    if (open) {
      setScanState("ready");
      setMember(null);
      setErrorMsg("");
      setInputVal("");
      setMode("usb");
      faceLastMatchRef.current = "";
      faceCooldownRef.current = false;

    } else {
      stopFace();
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    }
  }, [open]); // eslint-disable-line

  // Keep hidden input focused so USB QR scanner works in both face and usb modes
  useEffect(() => {
    if (open && scanState === "ready") {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, mode, scanState]);

  async function lookup(code: string) {
    const q = code.trim();
    if (!q) return;
    setScanState("loading");
    setMember(null);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/members/lookup?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Athlete not found");
        setScanState("error");
      } else {
        if (checkedInTodayRef.current.has(data.id)) {
          setErrorMsg(`${data.firstName} has already checked in today.`);
          setScanState("error");
        } else {
          setMember(data);
          setScanState("found");
        }
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
      setScanState("error");
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && inputVal.trim()) {
      lookup(inputVal);
      setInputVal("");
    }
  }

  function requestClose() {
    setShowClosePrompt(true);
    setClosePassword("");
    setCloseError("");
    setTimeout(() => closeInputRef.current?.focus(), 100);
  }

  async function confirmClose() {
    if (!closePassword.trim()) { setCloseError("Enter your password."); return; }
    setClosingVerify(true);
    setCloseError("");
    try {
      const res = await fetch("/api/auth/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: closePassword }),
      });
      const data = await res.json();
      if (!res.ok) { setCloseError(data.error ?? "Incorrect password."); setClosingVerify(false); return; }
      stopFace();
      setShowClosePrompt(false);
      onClose();
    } catch {
      setCloseError("Network error. Try again.");
    } finally {
      setClosingVerify(false);
    }
  }

  function handleReset() {
    setScanState("ready");
    setMember(null);
    setErrorMsg("");
    setInputVal("");
    faceLastMatchRef.current = "";
    faceCooldownRef.current = false;
    if (faceUnrecognizedTimerRef.current) { clearTimeout(faceUnrecognizedTimerRef.current); faceUnrecognizedTimerRef.current = null; }
    if (mode === "usb") {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    // Face mode: startFace() is triggered by the useEffect below when scanState → "ready"
  }

  // ── Face recognition ─────────────────────────────────────────
  const stopFace = useCallback(() => {
    if (faceScanIntervalRef.current) {
      clearInterval(faceScanIntervalRef.current);
      faceScanIntervalRef.current = null;
    }
    if (faceUnrecognizedTimerRef.current) {
      clearTimeout(faceUnrecognizedTimerRef.current);
      faceUnrecognizedTimerRef.current = null;
    }
    faceStreamRef.current?.getTracks().forEach((t) => t.stop());
    faceStreamRef.current = null;
  }, []);

  const startFaceScanLoop = useCallback(() => {
    if (faceScanIntervalRef.current) clearInterval(faceScanIntervalRef.current);
    faceLastMatchRef.current = "";
    faceCooldownRef.current = false;

    faceScanIntervalRef.current = setInterval(async () => {
      if (!faceVideoRef.current || !faceMatcherRef.current) return;
      if (faceCooldownRef.current) return;

      const video = faceVideoRef.current;
      if (video.readyState < 2) return;

      try {
        const faceapi = faceApiRef.current;
        if (!faceapi) return;
        const detection = await faceapi
          .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.3 }))
          .withFaceLandmarks(true)
          .withFaceDescriptor();

        if (!detection) {
          setFaceStatus("ready");
          return;
        }

        const match = faceMatcherRef.current.findBestMatch(detection.descriptor);
        setFaceDebug(`dist:${match.distance.toFixed(3)}`);

        if (match.label === "unknown" || match.distance > FACE_MATCH_THRESHOLD) {
          setFaceStatus("face-detected");
          // Start a one-shot timer the first time we see an unrecognized face
          if (!faceUnrecognizedTimerRef.current) {
            faceUnrecognizedTimerRef.current = setTimeout(() => {
              faceUnrecognizedTimerRef.current = null;
              if (faceCooldownRef.current) return;
              faceCooldownRef.current = true;
              if (faceScanIntervalRef.current) clearInterval(faceScanIntervalRef.current);
              setFaceStatus("unrecognized");
            }, 3000);
          }
          return;
        }

        // Recognized — cancel any pending unrecognized timer
        if (faceUnrecognizedTimerRef.current) {
          clearTimeout(faceUnrecognizedTimerRef.current);
          faceUnrecognizedTimerRef.current = null;
        }
        setFaceStatus("face-detected");

        if (checkedInTodayRef.current.has(match.label)) {
          faceLastMatchRef.current = match.label;
          faceCooldownRef.current = true;
          if (faceScanIntervalRef.current) clearInterval(faceScanIntervalRef.current);
          setFaceStatus("already-checked-in");
          return;
        }

        faceCooldownRef.current = true;
        faceLastMatchRef.current = match.label;

        // Stop scanning and look up member — cooldown stays true until handleReset
        if (faceScanIntervalRef.current) clearInterval(faceScanIntervalRef.current);
        const memberData = faceMembersRef.current.get(match.label);
        if (memberData?.memberNumber) {
          await lookup(memberData.memberNumber);
        } else {
          setErrorMsg("Face recognised but no member ID found. Please use QR scanner.");
          setScanState("error");
        }
      } catch (e: any) { setFaceDebug(`err: ${e?.message ?? e}`); }
    }, FACE_SCAN_INTERVAL_MS);
  }, []); // eslint-disable-line

  const startFace = useCallback(async () => {
    setFaceStatus("loading");
    try {
      const faceapi = await import("face-api.js");
      faceApiRef.current = faceapi;
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODELS_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL),
      ]);

      const res = await fetch("/api/members/face-descriptors");
      if (!res.ok) throw new Error("Could not load member data");
      const members: any[] = await res.json();

      const map = new Map<string, any>();
      const labeled: any[] = [];
      for (const m of members) {
        if (m.faceDescriptor?.length === 128) {
          map.set(m.id, m);
          labeled.push(
            new faceapi.LabeledFaceDescriptors(m.id, [new Float32Array(m.faceDescriptor)])
          );
        }
      }
      faceMembersRef.current = map;

      if (labeled.length === 0) {
        setFaceStatus("no-enrolled");
        return;
      }
      setFaceDebug(`loaded ${labeled.length} face(s)`);
      faceMatcherRef.current = new faceapi.FaceMatcher(labeled, FACE_MATCH_THRESHOLD);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      faceStreamRef.current = stream;
      if (faceVideoRef.current) {
        faceVideoRef.current.srcObject = stream;
        await faceVideoRef.current.play();
      }

      setFaceStatus("ready");
      startFaceScanLoop();
    } catch (e: any) {
      const msg = e?.message ?? "";
      setFaceStatus("error");
      setErrorMsg(
        msg.includes("Permission") || msg.includes("permission")
          ? "Camera permission denied. Use QR scanner instead."
          : msg || "Could not start face recognition."
      );
    }
  }, [startFaceScanLoop]);

  // Single effect: start face when open+face+ready, stop otherwise
  useEffect(() => {
    if (open && mode === "face" && scanState === "ready") {
      startFace();
    } else {
      stopFace();
    }
    return () => stopFace();
  }, [open, mode, scanState]); // eslint-disable-line

  useEffect(() => () => stopFace(), [stopFace]);

  function switchMode(m: ScanMode) {
    stopFace();
    setMode(m);
    setScanState("ready");
    setMember(null);
    setErrorMsg("");
    setInputVal("");
    faceLastMatchRef.current = "";
    faceCooldownRef.current = false;
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) requestClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80" />
        <DialogPrimitive.Content className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-background focus:outline-none">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <QrCode className="h-5 w-5" />
            Check-In Scanner
          </DialogTitle>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Usb className="h-4 w-4" />QR Scanner
            </div>
            <Button variant="outline" size="sm" onClick={requestClose}>
              <X className="h-4 w-4 mr-1" />Close
            </Button>
          </div>
        </div>

        {/* Password prompt to close */}
        {showClosePrompt && (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="w-full max-w-sm space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Lock className="h-4 w-4 text-muted-foreground" />
                Enter your password to close the scanner
              </div>
              <Input
                ref={closeInputRef}
                type="password"
                placeholder="••••••••"
                value={closePassword}
                onChange={(e) => setClosePassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && confirmClose()}
                autoComplete="current-password"
              />
              {closeError && <p className="text-xs text-destructive">{closeError}</p>}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowClosePrompt(false)}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={confirmClose} disabled={closingVerify}>
                  {closingVerify ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <X className="h-4 w-4 mr-1" />}
                  Close Scanner
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className={showClosePrompt ? "hidden" : "flex-1 flex overflow-hidden"}>

          {/* ── Face mode ── */}
          {mode === "face" && scanState === "ready" && (
            <div className="flex-1 flex bg-gray-950">
              {/* Left: branding panel */}
              <div className="w-64 shrink-0 flex flex-col items-center justify-center gap-4 px-8">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="FlowForceRM" width={96} height={96} className="rounded-full object-contain shadow-lg" />
                <div className="text-center">
                  <p className="text-white font-bold text-xl leading-tight">FlowForceRM</p>
                  <p className="text-white font-bold text-xl leading-tight">Manage Less. Train More.</p>
                  <p className="text-white/40 text-xs tracking-widest uppercase mt-2">Members Check-In</p>
                </div>
              </div>

              {/* Center: camera + status */}
              <div className="flex-1 flex flex-col items-center justify-center gap-5">
                <div className="relative w-full max-w-lg aspect-video rounded-2xl overflow-hidden bg-black ring-2 ring-white/10 shadow-2xl">
                  <video ref={faceVideoRef} className="w-full h-full object-cover" muted playsInline />

                  {faceStatus === "loading" && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-3 text-white">
                      <Loader2 className="h-10 w-10 animate-spin text-blue-400" />
                      <p className="text-sm font-medium">Starting face recognition…</p>
                    </div>
                  )}
                  {faceStatus === "no-enrolled" && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-3 text-white text-center px-6">
                      <UserSearch className="h-12 w-12 text-yellow-400" />
                      <p className="text-base font-medium">No face data enrolled</p>
                      <p className="text-xs text-white/60">Enroll members from their profile pages first.</p>
                    </div>
                  )}
                  {faceStatus === "error" && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-3 text-white text-center px-6">
                      <AlertCircle className="h-12 w-12 text-red-400" />
                      <p className="text-sm text-red-300">{errorMsg || "Camera unavailable"}</p>
                    </div>
                  )}
                </div>

                {(faceStatus === "ready" || faceStatus === "face-detected") && (
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border ${
                    faceStatus === "face-detected"
                      ? "bg-green-500/20 border-green-500/40 text-green-300"
                      : "bg-white/5 border-white/10 text-white/50"
                  }`}>
                    <span className={`w-2 h-2 rounded-full animate-pulse ${faceStatus === "face-detected" ? "bg-green-400" : "bg-white/30"}`} />
                    {faceStatus === "face-detected" ? "Face detected — identifying…" : "Look at the camera to check in"}
                  </div>
                )}
                {faceDebug && <p className="text-xs text-white/40 font-mono">{faceDebug}</p>}

                {faceStatus === "unrecognized" && (
                  <div className="text-center space-y-3">
                    <div className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-medium bg-orange-500/20 border border-orange-500/40 text-orange-300">
                      <AlertCircle className="h-5 w-5 shrink-0" />
                      Face not recognised — please scan your QR code
                    </div>
                    <div className="flex gap-2 justify-center">
                      <Button size="sm" variant="secondary" onClick={() => { setFaceStatus("ready"); faceCooldownRef.current = false; startFaceScanLoop(); }}>
                        Try Again
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => switchMode("usb")}>
                        <Usb className="h-4 w-4 mr-1" />Use QR Scanner
                      </Button>
                    </div>
                  </div>
                )}

                {faceStatus === "already-checked-in" && (
                  <div className="text-center space-y-3">
                    <div className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-medium bg-yellow-500/20 border border-yellow-500/40 text-yellow-300">
                      <CheckCircle2 className="h-5 w-5 shrink-0" />
                      You have already checked in today
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => { setFaceStatus("ready"); faceCooldownRef.current = false; faceLastMatchRef.current = ""; startFaceScanLoop(); }}>
                      Done
                    </Button>
                  </div>
                )}

                {(faceStatus === "no-enrolled" || faceStatus === "error") && (
                  <Button variant="secondary" size="sm" onClick={() => switchMode("usb")}>
                    <Usb className="h-4 w-4 mr-2" />Use QR Scanner Instead
                  </Button>
                )}
              </div>

              {/* Right spacer mirrors left panel to keep camera centered */}
              <div className="w-64 shrink-0" />

              {/* Hidden input so USB QR scanner works even in face mode */}
              <Input ref={inputRef} value={inputVal} onChange={(e) => setInputVal(e.target.value)} onKeyDown={onKeyDown}
                className="opacity-0 h-0 p-0 border-0 absolute pointer-events-none" tabIndex={-1} autoComplete="off" aria-hidden="true" />
            </div>
          )}

          {/* ── USB mode — centered on bg ── */}
          {mode === "usb" && scanState === "ready" && (
            <>
              <Input ref={inputRef} value={inputVal} onChange={(e) => setInputVal(e.target.value)} onKeyDown={onKeyDown}
                className="opacity-0 h-0 p-0 border-0 absolute pointer-events-none" tabIndex={-1} autoComplete="off" aria-hidden="true" />
              <div className="flex-1 flex flex-col items-center justify-center gap-8">
                {/* QR scanner area */}
                <div className="flex flex-col items-center gap-4 cursor-pointer" onClick={() => inputRef.current?.focus()}>
                  <div className="relative">
                    <Usb className="h-20 w-20 text-primary/50" />
                    <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 border-2 border-background" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-2xl font-semibold">Scanner ready</p>
                    <p className="text-muted-foreground">Point your USB QR scanner at an athlete's QR code.</p>
                  </div>
                  {inputVal && <p className="text-sm font-mono text-primary animate-pulse">Reading…</p>}
                </div>

                {/* Divider */}
                <div className="flex items-center gap-4 w-full max-w-sm">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-sm text-muted-foreground">or enter manually</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {/* Manual entry */}
                <ManualEntry onLookup={lookup} />
              </div>
            </>
          )}

          {/* ── Loading ── */}
          {scanState === "loading" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-14 w-14 animate-spin text-muted-foreground" />
              <p className="text-lg text-muted-foreground">Looking up athlete…</p>
            </div>
          )}

          {/* ── Error ── */}
          {scanState === "error" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
              <div className="w-full max-w-sm space-y-4">
                <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{errorMsg || "Something went wrong. Please try again."}</p>
                </div>
                <Button variant="outline" className="w-full" onClick={handleReset}>
                  <RotateCcw className="h-4 w-4 mr-2" />Try Again
                </Button>
              </div>
            </div>
          )}

          {/* ── Found — two-column full-screen layout ── */}
          {scanState === "found" && member && (
            <MemberCard member={member} onScanAgain={handleReset} onCheckedIn={markCheckedIn} isAdminOrStaff={isAdminOrStaff} />
          )}

        </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </Dialog>
  );
}

function ManualEntry({ onLookup }: { onLookup: (code: string) => void }) {
  const [value, setValue] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    // Auto-prepend NS- if the user just typed the number
    const code = /^NS-/i.test(trimmed) ? trimmed : `NS-${trimmed.padStart(5, "0")}`;
    onLookup(code);
    setValue("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 w-full max-w-sm">
      <div className="relative flex-1">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-mono pointer-events-none">NS-</span>
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
          placeholder="00001"
          className="font-mono pl-10"
          autoComplete="off"
          maxLength={5}
        />
      </div>
      <Button type="submit" disabled={!value.trim()}>
        Go
      </Button>
    </form>
  );
}

function isClassExpiredNow(endTime: string, timeZone: string): boolean {
  const [h, m] = endTime.split(":").map(Number);
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
  const nowH = Number(parts.find((p) => p.type === "hour")?.value ?? "0") % 24;
  const nowM = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return nowH * 60 + nowM > h * 60 + m;
}

function MemberCard({ member, onScanAgain, onCheckedIn, isAdminOrStaff }: { member: any; onScanAgain: () => void; onCheckedIn: (id: string) => void; isAdminOrStaff: boolean }) {
  const timeZone = useTenantTimezone();
  const [selectedScheduleIds, setSelectedScheduleIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Auto-advance 3 seconds after successful check-in
  useEffect(() => {
    if (!submitted) return;
    const t = setTimeout(() => onScanAgain(), 3000);
    return () => clearTimeout(t);
  }, [submitted]); // eslint-disable-line

  function toggleSlot(scheduleId: string, classId: string) {
    setSelectedScheduleIds((prev) => {
      if (prev.includes(scheduleId)) return prev.filter((id) => id !== scheduleId);
      const withoutSameClass = prev.filter((id) => {
        const slot = member.todayClasses?.find((c: any) => c.scheduleId === id);
        return slot?.classId !== classId;
      });
      return [...withoutSameClass, scheduleId];
    });
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const classIds = selectedScheduleIds.map((sid) => {
        const slot = member.todayClasses?.find((c: any) => c.scheduleId === sid);
        return slot?.classId;
      }).filter(Boolean);
      await fetch("/api/checkins/attend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: member.id, classIds }),
      });
      setSubmitted(true);
      onCheckedIn(member.id);
    } finally {
      setSubmitting(false);
    }
  }

  function formatTime(t: string) {
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const hour = h % 12 || 12;
    return m === 0 ? `${hour} ${ampm}` : `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
  }

  const classes = member.todayClasses ?? [];

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* ── Left panel: member info ── */}
      <div className="w-72 shrink-0 border-r flex flex-col p-6 gap-5 overflow-y-auto">
        {/* Photo + name */}
        <div className="flex flex-col items-center text-center gap-3">
          <Avatar className="h-24 w-24">
            <AvatarImage src={member.photoUrl ?? ""} />
            <AvatarFallback className="text-3xl">{getInitials(`${member.firstName} ${member.lastName}`)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-bold text-xl">{member.firstName} {member.lastName}</p>
            {member.memberNumber && (
              <p className="text-xs font-mono text-muted-foreground mt-0.5">#{member.memberNumber}</p>
            )}
            <Badge variant={STATUS_COLORS[member.status] as any ?? "secondary"} className="mt-1.5">
              {member.status}
            </Badge>
          </div>
        </div>

        {/* Last check-in */}
        {member.checkIns?.[0] && (
          <p className="text-xs text-muted-foreground text-center">
            Last check-in: {formatDate(member.checkIns[0].checkedInAt)}
          </p>
        )}

        {/* Memberships */}
        {member.subscriptions.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Memberships</p>
            {member.subscriptions.map((sub: any) => {
              const sessionsLeft = sub.sessionsTotal !== null ? sub.sessionsTotal - sub.sessionsUsed : null;
              const isFrozen = sub.status === "PAUSED";
              return (
                <div key={sub.id} className="flex items-center gap-2 text-sm">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: sub.service.color }} />
                  <span className="font-medium">{sub.service.name}</span>
                  <span className="text-muted-foreground text-xs ml-auto">
                    {sessionsLeft !== null ? `${sessionsLeft} left` : isFrozen ? "Frozen" : "Unlimited"}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-auto flex flex-col gap-2">
          {submitted && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
              <div>
                <p className="font-semibold text-sm text-emerald-800">Checked in!</p>
                <p className="text-xs text-emerald-700">Sessions deducted where applicable.</p>
              </div>
            </div>
          )}
          <Button variant="outline" className="w-full" onClick={onScanAgain}>
            <ScanLine className="h-4 w-4 mr-2" />Scan Next
          </Button>
          {submitted && (
            <Button className="w-full" asChild>
              <Link href={`/admin/members/${member.id}`}>View Profile</Link>
            </Button>
          )}
        </div>
      </div>

      {/* ── Right panel: classes ── */}
      <div className="flex-1 flex flex-col overflow-hidden p-6 gap-4">
        <div className="flex items-center justify-between shrink-0">
          <p className="text-lg font-semibold">Today's Classes</p>
          {!submitted && selectedScheduleIds.length > 0 && (
            <Button onClick={handleSubmit} disabled={submitting} size="lg">
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Check In ({selectedScheduleIds.length})
            </Button>
          )}
          {!submitted && selectedScheduleIds.length === 0 && (
            <p className="text-sm text-muted-foreground">Select classes to check in</p>
          )}
        </div>

        {classes.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-2">
              <p className="text-muted-foreground">No classes available today for this member's memberships.</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 grid gap-3 content-start overflow-y-auto" style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          }}>
            {classes.map((cls: any) => {
              const selected = selectedScheduleIds.includes(cls.scheduleId);
              const expired = !isAdminOrStaff && isClassExpiredNow(cls.endTime, timeZone);
              const isDisabled = submitted || expired;
              return (
                <button
                  key={cls.scheduleId}
                  type="button"
                  onClick={() => !isDisabled && toggleSlot(cls.scheduleId, cls.classId)}
                  disabled={isDisabled}
                  title={expired ? "This class has already ended" : undefined}
                  className={`rounded-xl border-2 p-4 text-left transition-all ${
                    expired
                      ? "border-border opacity-35 cursor-not-allowed"
                      : submitted
                      ? selected ? "border-emerald-400 bg-emerald-50 cursor-default" : "border-border opacity-40 cursor-default"
                      : selected ? "border-primary bg-primary/10 shadow-sm" : "border-border hover:border-primary/40 hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: cls.color ?? "#3B82F6" }} />
                      <span className="font-semibold truncate">{cls.name}</span>
                    </div>
                    {selected && !expired && <Check className={`h-4 w-4 shrink-0 ${submitted ? "text-emerald-500" : "text-primary"}`} />}
                    {expired && <span className="text-[10px] text-muted-foreground shrink-0">Ended</span>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1.5">
                    {formatTime(cls.startTime)} – {formatTime(cls.endTime)}
                  </p>
                  {cls.location && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{cls.location}</p>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
