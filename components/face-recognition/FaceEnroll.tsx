"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import * as faceapi from "face-api.js";
import { Camera, CheckCircle, RefreshCw, Trash2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const MODELS_URL = "/models";

interface FaceEnrollProps {
  memberId: string;
  memberName: string;
  hasExisting: boolean;
  onSaved?: () => void;
}

type Status = "idle" | "loading-models" | "ready" | "detecting" | "captured" | "saving" | "saved" | "error";

export function FaceEnroll({ memberId, memberName, hasExisting, onSaved }: FaceEnrollProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [capturedDescriptor, setCapturedDescriptor] = useState<Float32Array | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const startCamera = useCallback(async () => {
    setError("");
    setStatus("loading-models");
    setCapturedDescriptor(null);

    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODELS_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL),
      ]);

      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setStatus("ready");
      runDetectionLoop();
    } catch (e: any) {
      setError(e.message ?? "Camera error");
      setStatus("error");
    }
  }, []); // eslint-disable-line

  const runDetectionLoop = useCallback(() => {
    const detect = async () => {
      if (!videoRef.current || !canvasRef.current) return;
      const video = videoRef.current;
      if (video.readyState < 2) {
        animFrameRef.current = requestAnimationFrame(detect);
        return;
      }

      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks(true);

      const canvas = canvasRef.current;
      const dims = { width: video.videoWidth, height: video.videoHeight };
      faceapi.matchDimensions(canvas, dims);

      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (detection) {
        const resized = faceapi.resizeResults(detection, dims);
        faceapi.draw.drawDetections(canvas, resized);
        faceapi.draw.drawFaceLandmarks(canvas, resized);
        setFaceDetected(true);
      } else {
        setFaceDetected(false);
      }

      animFrameRef.current = requestAnimationFrame(detect);
    };

    animFrameRef.current = requestAnimationFrame(detect);
  }, []);

  const capture = useCallback(async () => {
    if (!videoRef.current) return;
    setStatus("detecting");

    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks(true)
        .withFaceDescriptor();

      if (!detection) {
        setError("No face detected. Please look directly at the camera.");
        setStatus("ready");
        return;
      }

      // Draw snapshot to capture canvas
      const captureCanvas = captureCanvasRef.current!;
      captureCanvas.width = videoRef.current.videoWidth;
      captureCanvas.height = videoRef.current.videoHeight;
      captureCanvas.getContext("2d")!.drawImage(videoRef.current, 0, 0);

      setCapturedDescriptor(detection.descriptor);
      cancelAnimationFrame(animFrameRef.current);
      stopCamera();
      setStatus("captured");
      setError("");
    } catch (e: any) {
      setError(e.message ?? "Detection failed");
      setStatus("ready");
    }
  }, [stopCamera]);

  const save = useCallback(async () => {
    if (!capturedDescriptor) return;
    setStatus("saving");

    try {
      const res = await fetch(`/api/members/${memberId}/face`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descriptor: Array.from(capturedDescriptor) }),
      });

      if (!res.ok) throw new Error(await res.text());
      setStatus("saved");
      onSaved?.();
    } catch (e: any) {
      setError(e.message ?? "Save failed");
      setStatus("captured");
    }
  }, [capturedDescriptor, memberId, onSaved]);

  const deleteFace = useCallback(async () => {
    if (!confirm(`Remove face data for ${memberName}?`)) return;
    await fetch(`/api/members/${memberId}/face`, { method: "DELETE" });
    setCapturedDescriptor(null);
    setStatus("idle");
    onSaved?.();
  }, [memberId, memberName, onSaved]);

  const retake = useCallback(() => {
    setCapturedDescriptor(null);
    setStatus("idle");
    startCamera();
  }, [startCamera]);

  return (
    <div className="space-y-4">
      {/* Camera / capture view */}
      <div className="relative w-full max-w-md mx-auto aspect-video bg-black rounded-xl overflow-hidden">
        {(status === "idle" || status === "error") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3">
            <Camera className="w-12 h-12 opacity-50" />
            <p className="text-sm opacity-70">Camera off</p>
          </div>
        )}

        <video
          ref={videoRef}
          className={`w-full h-full object-cover ${status === "captured" ? "hidden" : ""}`}
          muted
          playsInline
        />
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full ${status === "captured" ? "hidden" : ""}`}
        />
        <canvas
          ref={captureCanvasRef}
          className={`w-full h-full object-cover ${status !== "captured" ? "hidden" : ""}`}
        />

        {status === "loading-models" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white gap-2">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-sm">Loading face models…</p>
          </div>
        )}

        {(status === "ready" || status === "detecting") && (
          <div
            className={`absolute top-3 left-3 px-2 py-1 rounded text-xs font-medium ${
              faceDetected ? "bg-green-500 text-white" : "bg-yellow-500 text-black"
            }`}
          >
            {faceDetected ? "Face detected" : "No face"}
          </div>
        )}

        {status === "saved" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-green-500/90 text-white gap-2">
            <CheckCircle className="w-12 h-12" />
            <p className="font-semibold">Face saved!</p>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 justify-center">
        {(status === "idle" || status === "error") && (
          <Button onClick={startCamera}>
            <Camera className="w-4 h-4 mr-2" />
            Start Camera
          </Button>
        )}

        {(status === "ready" || status === "detecting") && (
          <Button onClick={capture} disabled={status === "detecting" || !faceDetected}>
            {status === "detecting" ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Camera className="w-4 h-4 mr-2" />
            )}
            Capture Face
          </Button>
        )}

        {status === "captured" && (
          <>
            <Button onClick={save}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Save Face Data
            </Button>
            <Button variant="outline" onClick={retake}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Retake
            </Button>
          </>
        )}

        {status === "saving" && (
          <Button disabled>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Saving…
          </Button>
        )}

        {status === "saved" && (
          <Button variant="outline" onClick={retake}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Re-enroll
          </Button>
        )}

        {hasExisting && status !== "saving" && status !== "saved" && (
          <Button variant="destructive" size="sm" onClick={deleteFace}>
            <Trash2 className="w-4 h-4 mr-2" />
            Remove Face Data
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Face data is stored as a mathematical descriptor — no photo is saved.
      </p>
    </div>
  );
}
