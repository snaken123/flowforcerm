"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import * as faceapi from "face-api.js";
import { Loader2, Wifi, WifiOff, Users, Clock } from "lucide-react";

const MODELS_URL = "/models";
const MATCH_THRESHOLD = 0.55;
const COOLDOWN_MS = 30 * 60 * 1000;
const SUCCESS_DISPLAY_MS = 4000;
const SCAN_INTERVAL_MS = 800;

interface KioskMember {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
  memberNumber?: string | null;
  faceDescriptor: number[];
}

type KioskState =
  | { phase: "loading" }
  | { phase: "scanning"; faceDetected: boolean }
  | { phase: "success"; member: KioskMember; alreadyIn: boolean }
  | { phase: "inactive"; member: KioskMember }
  | { phase: "error"; message: string };

export function FaceKiosk() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const matcherRef = useRef<faceapi.FaceMatcher | null>(null);
  const membersMapRef = useRef<Map<string, KioskMember>>(new Map());
  const lastCheckinRef = useRef<Map<string, number>>(new Map());
  const scanTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [state, setState] = useState<KioskState>({ phase: "loading" });
  const [time, setTime] = useState(new Date());
  const [todayCount, setTodayCount] = useState(0);

  // Clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const loadMembers = useCallback(async (): Promise<faceapi.LabeledFaceDescriptors[]> => {
    const res = await fetch("/api/members/face-descriptors");
    if (!res.ok) throw new Error("Failed to load member data");
    const members: KioskMember[] = await res.json();

    const map = new Map<string, KioskMember>();
    const labeled: faceapi.LabeledFaceDescriptors[] = [];

    for (const m of members) {
      if (m.faceDescriptor?.length === 128) {
        map.set(m.id, m);
        labeled.push(
          new faceapi.LabeledFaceDescriptors(m.id, [new Float32Array(m.faceDescriptor)])
        );
      }
    }

    membersMapRef.current = map;
    return labeled;
  }, []);

  const fetchTodayCount = useCallback(async () => {
    try {
      const res = await fetch("/api/checkins?limit=500");
      const data = await res.json();
      const today = new Date().toDateString();
      setTodayCount(data.filter((c: any) => new Date(c.checkedInAt).toDateString() === today).length);
    } catch {}
  }, []);

  const startScanning = useCallback(() => {
    if (scanTimerRef.current) clearInterval(scanTimerRef.current);

    const scan = async () => {
      if (!videoRef.current || !matcherRef.current) return;
      const video = videoRef.current;
      if (video.readyState < 2) return;

      try {
        const detection = await faceapi
          .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
          .withFaceLandmarks(true)
          .withFaceDescriptor();

        if (!detection) {
          setState({ phase: "scanning", faceDetected: false });
          drawOverlay(false);
          return;
        }

        drawOverlay(true, video);
        setState({ phase: "scanning", faceDetected: true });

        const match = matcherRef.current.findBestMatch(detection.descriptor);

        if (match.label === "unknown" || match.distance > MATCH_THRESHOLD) return;

        const member = membersMapRef.current.get(match.label);
        if (!member) return;

        // Cooldown check
        const lastTime = lastCheckinRef.current.get(member.id) ?? 0;
        if (Date.now() - lastTime < COOLDOWN_MS) return;

        // Stop scanning during check-in
        clearInterval(scanTimerRef.current!);

        // Call kiosk check-in API
        const res = await fetch("/api/checkins/kiosk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberId: member.id }),
        });

        const data = await res.json();

        if (res.status === 409) {
          // Already checked in recently — still greet them
          lastCheckinRef.current.set(member.id, Date.now());
          setState({ phase: "success", member, alreadyIn: true });
        } else if (res.ok) {
          lastCheckinRef.current.set(member.id, Date.now());
          setTodayCount((n) => n + 1);
          setState({ phase: "success", member, alreadyIn: false });
        } else if (res.status === 400 && data.member) {
          setState({ phase: "inactive", member: data.member });
        }

        // Return to scanning after display time
        setTimeout(() => {
          setState({ phase: "scanning", faceDetected: false });
          startScanning();
        }, SUCCESS_DISPLAY_MS);
      } catch {}
    };

    scanTimerRef.current = setInterval(scan, SCAN_INTERVAL_MS);
  }, []); // eslint-disable-line

  const drawOverlay = (detected: boolean, video?: HTMLVideoElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (detected && video) {
      // Draw a centered target reticle
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const size = Math.min(canvas.width, canvas.height) * 0.35;
      const cornerLen = size * 0.2;

      ctx.strokeStyle = "#22c55e";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";

      const corners = [
        [cx - size / 2, cy - size / 2, 1, 1],
        [cx + size / 2, cy - size / 2, -1, 1],
        [cx + size / 2, cy + size / 2, -1, -1],
        [cx - size / 2, cy + size / 2, 1, -1],
      ];

      for (const [x, y, dx, dy] of corners) {
        ctx.beginPath();
        ctx.moveTo(x, y + dy * cornerLen);
        ctx.lineTo(x, y);
        ctx.lineTo(x + dx * cornerLen, y);
        ctx.stroke();
      }
    }
  };

  // Init
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODELS_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL),
        ]);

        const labeled = await loadMembers();
        if (cancelled) return;

        if (labeled.length > 0) {
          matcherRef.current = new faceapi.FaceMatcher(labeled, MATCH_THRESHOLD);
        } else {
          matcherRef.current = null;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        });

        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();

          const v = videoRef.current;
          if (canvasRef.current) {
            canvasRef.current.width = v.videoWidth || 1280;
            canvasRef.current.height = v.videoHeight || 720;
          }
        }

        await fetchTodayCount();
        setState({ phase: "scanning", faceDetected: false });
        startScanning();
      } catch (e: any) {
        if (!cancelled) setState({ phase: "error", message: e.message ?? "Initialization failed" });
      }
    };

    init();
    return () => {
      cancelled = true;
      if (scanTimerRef.current) clearInterval(scanTimerRef.current);
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      }
    };
  }, []); // eslint-disable-line

  const enrolled = membersMapRef.current.size;

  return (
    <div className="relative w-full h-full bg-black text-white overflow-hidden select-none">
      {/* Video feed */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover opacity-70"
        muted
        playsInline
      />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover pointer-events-none" />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-8 py-4 bg-gradient-to-b from-black/70 to-transparent">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Members Check-In</h1>
          <p className="text-sm text-white/60">Look at the camera to check in</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-mono font-bold">
            {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
          <div className="text-sm text-white/60">
            {time.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
          </div>
        </div>
      </div>

      {/* Bottom stats bar */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-8 py-4 bg-gradient-to-t from-black/70 to-transparent">
        <div className="flex items-center gap-2 text-sm text-white/60">
          <Users className="w-4 h-4" />
          <span>{enrolled} members enrolled</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-white/60">
          <Clock className="w-4 h-4" />
          <span>{todayCount} check-ins today</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-white/60">
          <Wifi className="w-4 h-4" />
          <span>Kiosk Active</span>
        </div>
      </div>

      {/* Loading overlay */}
      {state.phase === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-blue-400" />
          <p className="text-lg font-medium">Initializing face recognition…</p>
          <p className="text-sm text-white/50">Loading AI models and member data</p>
        </div>
      )}

      {/* Error overlay */}
      {state.phase === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-4">
          <WifiOff className="w-12 h-12 text-red-400" />
          <p className="text-lg font-medium text-red-400">Kiosk Error</p>
          <p className="text-sm text-white/60 max-w-sm text-center">{state.message}</p>
        </div>
      )}

      {/* Scanning indicator */}
      {state.phase === "scanning" && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2">
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm ${
              state.faceDetected
                ? "bg-green-500/30 border border-green-500/50 text-green-300"
                : "bg-white/10 border border-white/20 text-white/50"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full animate-pulse ${
                state.faceDetected ? "bg-green-400" : "bg-white/40"
              }`}
            />
            {state.faceDetected ? "Face detected — identifying…" : "Scanning for faces…"}
          </div>
        </div>
      )}

      {/* Success overlay */}
      {state.phase === "success" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 gap-6 animate-in fade-in duration-300">
          {state.member.photoUrl ? (
            <img
              src={state.member.photoUrl}
              alt=""
              className="w-32 h-32 rounded-full object-cover border-4 border-green-400 shadow-2xl"
            />
          ) : (
            <div className="w-32 h-32 rounded-full bg-green-500/20 border-4 border-green-400 flex items-center justify-center text-5xl font-bold text-green-300">
              {state.member.firstName[0]}
              {state.member.lastName[0]}
            </div>
          )}
          <div className="text-center">
            <p className="text-green-400 text-lg font-medium">
              {state.alreadyIn ? "Already checked in" : "Welcome back!"}
            </p>
            <p className="text-4xl font-bold mt-1">
              {state.member.firstName} {state.member.lastName}
            </p>
            {state.member.memberNumber && (
              <p className="text-white/50 text-sm mt-1">#{state.member.memberNumber}</p>
            )}
          </div>
          <div className="flex items-center gap-2 px-6 py-3 bg-green-500/20 border border-green-500/40 rounded-full">
            <span className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
            <span className="text-green-300 font-medium">
              {state.alreadyIn ? "Attendance already recorded" : "Attendance logged successfully"}
            </span>
          </div>
        </div>
      )}

      {/* Inactive member overlay */}
      {state.phase === "inactive" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 gap-4">
          <div className="w-24 h-24 rounded-full bg-red-500/20 border-4 border-red-400 flex items-center justify-center text-4xl">
            ⚠️
          </div>
          <p className="text-3xl font-bold">
            {state.member.firstName} {state.member.lastName}
          </p>
          <p className="text-red-400 text-lg">Membership Inactive</p>
          <p className="text-white/50 text-sm">Please see a staff member</p>
        </div>
      )}
    </div>
  );
}
