"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, AlertCircle, CheckCircle2, RotateCcw,
  Lock, X, Check, QrCode, Tablet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDate, getInitials } from "@/lib/utils";
import Link from "next/link";

// ─── helpers ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "success", FROZEN: "warning", INACTIVE: "secondary", CANCELLED: "destructive",
};

function isClassExpiredNow(endTime: string): boolean {
  const [h, m] = endTime.split(":").map(Number);
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes() > h * 60 + m;
}

function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return m === 0 ? `${hour} ${ampm}` : `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

// ─── Close lock ─────────────────────────────────────────────────────────────

function CloseLock({ onCancel, onClose }: { onCancel: () => void; onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80); }, []);

  async function confirm() {
    if (!password.trim()) { setError("Enter your password."); return; }
    setVerifying(true); setError("");
    try {
      const res = await fetch("/api/auth/verify-password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Incorrect password."); setVerifying(false); return; }
      onClose();
    } catch { setError("Network error. Try again."); setVerifying(false); }
  }

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Lock className="h-4 w-4 text-muted-foreground" />
          Enter your password to exit the kiosk
        </div>
        <Input ref={inputRef} type="password" placeholder="••••••••" value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && confirm()} autoComplete="current-password" />
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
          <Button className="flex-1" onClick={confirm} disabled={verifying}>
            {verifying && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Exit Kiosk
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Member card after scan ──────────────────────────────────────────────────

function MemberCard({ member, onNext, onCheckedIn }: {
  member: any; onNext: () => void; onCheckedIn: (id: string) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!submitted) return;
    const t = setTimeout(() => onNext(), 3000);
    return () => clearTimeout(t);
  }, [submitted]); // eslint-disable-line

  function toggle(scheduleId: string, classId: string) {
    setSelectedIds((prev) => {
      if (prev.includes(scheduleId)) return prev.filter((id) => id !== scheduleId);
      const withoutSame = prev.filter((id) => {
        const slot = member.todayClasses?.find((c: any) => c.scheduleId === id);
        return slot?.classId !== classId;
      });
      return [...withoutSame, scheduleId];
    });
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const classIds = selectedIds.map((sid) => {
        const slot = member.todayClasses?.find((c: any) => c.scheduleId === sid);
        return slot?.classId;
      }).filter(Boolean);
      const deviceToken = localStorage.getItem(DEVICE_TOKEN_KEY) ?? "";
      await fetch("/api/checkins/attend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(deviceToken ? { "X-Device-Token": deviceToken } : {}),
        },
        body: JSON.stringify({ memberId: member.id, classIds }),
      });
      setSubmitted(true);
      onCheckedIn(member.id);
    } finally { setSubmitting(false); }
  }

  const classes = member.todayClasses ?? [];

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left: member info */}
      <div className="w-72 shrink-0 border-r flex flex-col p-6 gap-5 overflow-y-auto">
        <div className="flex flex-col items-center text-center gap-3">
          <Avatar className="h-24 w-24">
            <AvatarImage src={member.photoUrl ?? ""} />
            <AvatarFallback className="text-3xl">{getInitials(`${member.firstName} ${member.lastName}`)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-bold text-xl">{member.firstName} {member.lastName}</p>
            {member.memberNumber && <p className="text-xs font-mono text-muted-foreground mt-0.5">#{member.memberNumber}</p>}
            <Badge variant={STATUS_COLORS[member.status] as any ?? "secondary"} className="mt-1.5">{member.status}</Badge>
          </div>
        </div>
        {member.checkIns?.[0] && (
          <p className="text-xs text-muted-foreground text-center">Last check-in: {formatDate(member.checkIns[0].checkedInAt)}</p>
        )}
        {member.subscriptions?.length > 0 && (
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
          <Button variant="outline" className="w-full" onClick={onNext}>
            Scan Next
          </Button>
          {submitted && (
            <Button className="w-full" asChild>
              <Link href={`/admin/members/${member.id}`} target="_blank">View Profile</Link>
            </Button>
          )}
        </div>
      </div>

      {/* Right: classes */}
      <div className="flex-1 flex flex-col overflow-hidden p-6 gap-4">
        <div className="flex items-center justify-between shrink-0">
          <p className="text-lg font-semibold">Today's Classes</p>
          {!submitted && selectedIds.length > 0 && (
            <Button onClick={handleSubmit} disabled={submitting} size="lg">
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Check In ({selectedIds.length})
            </Button>
          )}
          {!submitted && selectedIds.length === 0 && (
            <p className="text-sm text-muted-foreground">Select classes to check in</p>
          )}
        </div>
        {classes.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">No classes available today.</p>
          </div>
        ) : (
          <div className="flex-1 grid gap-3 content-start overflow-y-auto"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
            {classes.map((cls: any) => {
              const selected = selectedIds.includes(cls.scheduleId);
              const expired = isClassExpiredNow(cls.endTime);
              const disabled = submitted || expired;
              return (
                <button key={cls.scheduleId} type="button"
                  onClick={() => !disabled && toggle(cls.scheduleId, cls.classId)}
                  disabled={disabled}
                  title={expired ? "This class has already ended" : undefined}
                  className={`rounded-xl border-2 p-4 text-left transition-all ${
                    expired ? "border-border opacity-35 cursor-not-allowed"
                    : submitted ? (selected ? "border-emerald-400 bg-emerald-50 cursor-default" : "border-border opacity-40 cursor-default")
                    : selected ? "border-primary bg-primary/10 shadow-sm"
                    : "border-border hover:border-primary/40 hover:bg-muted/40"
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
                  <p className="text-sm text-muted-foreground mt-1.5">{formatTime(cls.startTime)} – {formatTime(cls.endTime)}</p>
                  {cls.location && <p className="text-xs text-muted-foreground mt-0.5 truncate">{cls.location}</p>}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Device activation ──────────────────────────────────────────────────────

const DEVICE_TOKEN_KEY = "kiosk_device_token";

function DeviceActivation({ onActivated }: { onActivated: () => void }) {
  const [token, setToken] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");

  async function handleActivate(e: React.FormEvent) {
    e.preventDefault();
    const t = token.trim();
    if (!t) { setError("Enter the device token."); return; }
    setVerifying(true); setError("");
    try {
      const res = await fetch("/api/checkins", {
        method: "GET",
        headers: { "X-Device-Token": t },
      });
      // If the token is unrecognised the server returns 403; any other response means the token
      // is accepted (or there are no registered devices yet, which also grants access).
      if (res.status === 403) {
        const data = await res.json().catch(() => ({}));
        if (data?.code === "invalid_device_token") {
          setError("Invalid token. Check with your administrator."); setVerifying(false); return;
        }
      }
      localStorage.setItem(DEVICE_TOKEN_KEY, t);
      onActivated();
    } catch {
      setError("Network error. Please try again."); setVerifying(false);
    }
  }

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background p-8 gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
          <Tablet className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold">Activate This Device</h1>
        <p className="text-muted-foreground text-sm max-w-sm">
          This kiosk must be registered before use. Enter the device token generated by your administrator.
        </p>
      </div>
      <form onSubmit={handleActivate} className="w-full max-w-sm space-y-4">
        <input
          className="w-full border rounded-lg px-4 py-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background"
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          autoFocus
          autoComplete="off"
          spellCheck={false}
        />
        {error && (
          <div className="flex items-start gap-2 text-destructive text-sm">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        <Button type="submit" className="w-full" disabled={verifying}>
          {verifying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Activate Device
        </Button>
      </form>
    </div>
  );
}

// ─── Main kiosk ─────────────────────────────────────────────────────────────

type ScanState = "ready" | "loading" | "found" | "error";

export function KioskClient() {
  const router = useRouter();
  const [scanState, setScanState] = useState<ScanState>("ready");
  const [deviceToken, setDeviceToken] = useState<string | null>(null);
  const [deviceChecked, setDeviceChecked] = useState(false);

  // Load device token from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(DEVICE_TOKEN_KEY);
    setDeviceToken(stored);
    setDeviceChecked(true);
  }, []);

  // Lock to landscape — try API first, fall back to CSS rotation
  const [isPortrait, setIsPortrait] = useState(false);
  useEffect(() => {
    const tryLock = async () => {
      try {
        await document.documentElement.requestFullscreen?.();
      } catch {}
      try {
        await (screen.orientation as any)?.lock?.("landscape");
        return; // API worked, no CSS needed
      } catch {}
      // API failed — use CSS rotation
      const check = () => setIsPortrait(window.innerHeight > window.innerWidth);
      check();
      window.addEventListener("resize", check);
      return () => window.removeEventListener("resize", check);
    };
    tryLock();
  }, []);
  const [member, setMember] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [showClose, setShowClose] = useState(false);

  // Track check-ins this session (localStorage per day)
  const checkedInRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const key = `checkin-${new Date().toDateString()}`;
    const stored = localStorage.getItem(key);
    checkedInRef.current = stored ? new Set(JSON.parse(stored)) : new Set();
  }, []);
  function markCheckedIn(id: string) {
    checkedInRef.current.add(id);
    const key = `checkin-${new Date().toDateString()}`;
    localStorage.setItem(key, JSON.stringify(Array.from(checkedInRef.current)));
  }

  // USB QR scanner hidden input
  const hiddenRef = useRef<HTMLInputElement>(null);
  const [inputVal, setInputVal] = useState("");

  useEffect(() => {
    if (scanState === "ready") setTimeout(() => hiddenRef.current?.focus(), 100);
  }, [scanState]);

  async function lookup(code: string) {
    const q = code.trim();
    if (!q) return;
    setScanState("loading"); setMember(null); setErrorMsg("");
    const token = localStorage.getItem(DEVICE_TOKEN_KEY) ?? "";
    try {
      const res = await fetch(`/api/members/lookup?q=${encodeURIComponent(q)}`, {
        headers: token ? { "X-Device-Token": token } : {},
      });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.error ?? "Athlete not found"); setScanState("error"); }
      else if (checkedInRef.current.has(data.id)) {
        setErrorMsg(`${data.firstName} has already checked in today.`); setScanState("error");
      } else { setMember(data); setScanState("found"); }
    } catch { setErrorMsg("Network error. Please try again."); setScanState("error"); }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && inputVal.trim()) { lookup(inputVal); setInputVal(""); }
  }

  function reset() {
    setScanState("ready"); setMember(null); setErrorMsg(""); setInputVal("");
  }

  const portraitStyle: React.CSSProperties = isPortrait ? {
    transform: "rotate(90deg)",
    transformOrigin: "left top",
    width: "100vh",
    height: "100vw",
    position: "fixed",
    top: "100%",
    left: 0,
    overflow: "hidden",
  } : {};

  // Wait for localStorage check; then show activation if no token stored
  if (!deviceChecked) return null;
  if (!deviceToken) {
    return <DeviceActivation onActivated={() => {
      setDeviceToken(localStorage.getItem(DEVICE_TOKEN_KEY));
    }} />;
  }

  return (
    <div style={portraitStyle} className="fixed inset-0 flex flex-col bg-background" onClick={() => hiddenRef.current?.focus()}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <QrCode className="h-5 w-5" /> Check-In Kiosk
        </div>
        <button onDoubleClick={() => setShowClose(true)} className="w-8 h-8 opacity-0" aria-hidden />
      </div>

      {/* Content */}
      {showClose ? (
        <CloseLock onCancel={() => setShowClose(false)} onClose={() => router.push("/dashboard")} />
      ) : (
        <>
          {/* Hidden USB input — always active */}
          <input ref={hiddenRef} value={inputVal} onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={onKeyDown} className="opacity-0 h-0 absolute pointer-events-none"
            tabIndex={-1} autoComplete="off" aria-hidden="true" inputMode="none" />

          {scanState === "ready" && <ReadyScreen onLookup={lookup} />}

          {scanState === "loading" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-14 w-14 animate-spin text-muted-foreground" />
              <p className="text-lg text-muted-foreground">Looking up athlete…</p>
            </div>
          )}

          {scanState === "error" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
              <div className="w-full max-w-sm space-y-4">
                <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{errorMsg}</p>
                </div>
                <Button variant="outline" className="w-full" onClick={reset}>
                  <RotateCcw className="h-4 w-4 mr-2" /> Try Again
                </Button>
              </div>
            </div>
          )}

          {scanState === "found" && member && (
            <MemberCard member={member} onNext={reset} onCheckedIn={markCheckedIn} />
          )}
        </>
      )}
    </div>
  );
}

// ─── Ready screen ────────────────────────────────────────────────────────────

const NUMPAD = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["⌫", "0", "GO"],
];

function ReadyScreen({ onLookup }: { onLookup: (code: string) => void }) {
  const [manual, setManual] = useState("");

  function handleKey(key: string) {
    if (key === "⌫") {
      setManual((v) => v.slice(0, -1));
    } else if (key === "GO") {
      if (!manual.trim()) return;
      const code = `NS-${manual.padStart(5, "0")}`;
      onLookup(code);
      setManual("");
    } else {
      if (manual.length >= 5) return;
      setManual((v) => v + key);
    }
  }

  return (
    <div className="flex-1 flex">
      {/* Left branding panel */}
      <div className="w-64 shrink-0 bg-gray-950 flex flex-col items-center justify-center gap-4 px-8">
        <img src="/NS LOGO.png" alt="FlowForceRM" className="h-24 w-24 object-contain" />
        <div className="text-center">
          <p className="text-white font-bold text-xl leading-tight">FlowForceRM</p>
          <p className="text-white font-bold text-xl leading-tight">Manage Less. Train More.</p>
          <p className="text-white/40 text-xs tracking-widest uppercase mt-2">Members Check-In</p>
        </div>
      </div>

      {/* Center content — fixed layout, no reflow */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 overflow-hidden">
        {/* QR scanner status */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-16 w-16 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center">
            <QrCode className="h-8 w-8 text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-semibold">Scanner Ready</p>
            <p className="text-muted-foreground text-sm">Point your QR scanner at an athlete's ID.</p>
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 w-full max-w-xs">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">or enter athlete number</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Display — fixed height, no reflow */}
        <div className="w-full max-w-xs shrink-0">
          <div className="flex items-center border-2 rounded-lg px-4 bg-muted/30 select-none pointer-events-none h-14">
            <span className="text-muted-foreground font-mono text-lg mr-1 shrink-0">NS-</span>
            <span className="font-mono text-2xl tracking-widest flex-1 min-w-0 overflow-hidden">
              {manual
                ? manual.split("").map((d, i) => <span key={i}>{d}</span>)
                : <span className="text-muted-foreground/30">_____</span>
              }
            </span>
            <span className={`w-0.5 h-6 bg-primary rounded shrink-0 ${manual ? "animate-pulse" : "opacity-0"}`} />
          </div>
        </div>

        {/* Numpad — fixed sizes, no reflow */}
        <div className="grid grid-cols-3 gap-2 w-full max-w-xs shrink-0">
          {NUMPAD.flat().map((key) => {
            const isGo = key === "GO";
            const isBack = key === "⌫";
            const disabled = isGo && !manual.trim();
            return (
              <button
                key={key}
                type="button"
                onPointerDown={(e) => { e.preventDefault(); handleKey(key); }}
                disabled={disabled}
                className={`h-14 rounded-xl text-xl font-semibold select-none transition-all active:scale-95
                  ${isGo
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
                    : isBack
                    ? "bg-muted hover:bg-muted/70 text-muted-foreground"
                    : "bg-card border border-border hover:bg-muted/60 shadow-sm"
                  }`}
              >
                {key}
              </button>
            );
          })}
        </div>

        {/* Placeholder for future facial recognition */}
        {/* FACE_RECOGNITION_PLACEHOLDER */}
      </div>

      {/* Right spacer mirrors left to keep center content centered */}
      <div className="w-64 shrink-0" />
    </div>
  );
}
