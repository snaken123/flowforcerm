"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import QRCode from "react-qr-code";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { X, ChevronLeft, ChevronRight, Download } from "lucide-react";

type Profile = {
  id: string;
  memberNumber: string | null;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
};

export function AthleteIdClient({ profiles, athleteIdAsHome }: { profiles: Profile[]; athleteIdAsHome: boolean }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [isDefault, setIsDefault] = useState(athleteIdAsHome);
  const touchStartX = useRef<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  async function toggleDefault() {
    const next = !isDefault;
    setIsDefault(next);
    await fetch("/api/member/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ athleteIdAsHome: next }),
    });
  }

  async function downloadCard() {
    if (!cardRef.current || downloading) return;
    setDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(cardRef.current, {
        useCORS: true,
        allowTaint: true,
        scale: 3,
        backgroundColor: "#ffffff",
      });
      const link = document.createElement("a");
      link.download = `${member.memberNumber ?? member.id.slice(0, 8)}-athlete-id.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setDownloading(false);
    }
  }

  const member = profiles[index];
  const qrValue = member.memberNumber ?? member.id;
  const fullName = `${member.firstName} ${member.lastName}`;

  const prev = () => setIndex((i) => (i - 1 + profiles.length) % profiles.length);
  const next = () => setIndex((i) => (i + 1) % profiles.length);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 40) delta > 0 ? next() : prev();
    touchStartX.current = null;
  };

  const multi = profiles.length > 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onTouchStart={multi ? onTouchStart : undefined}
      onTouchEnd={multi ? onTouchEnd : undefined}
    >
      {/* Close button */}
      <button
        onClick={() => router.push("/member/profile")}
        className="absolute top-5 right-5 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Prev arrow */}
      {multi && (
        <button
          onClick={prev}
          className="absolute left-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}

      {/* ID Card + download button */}
      <div className="flex flex-col items-center gap-3 mx-14">
      <div ref={cardRef} className="w-full max-w-[340px] rounded-3xl bg-white overflow-hidden shadow-2xl">
        {/* Top accent */}
        <div className="h-2 bg-primary w-full" />

        {/* Card body */}
        <div className="flex flex-col items-center px-8 pt-6 pb-6 gap-4">
          {/* Logo + gym name */}
          <div className="flex items-center gap-4 w-full">
            <img src="/logo.png" alt="FlowForceRM" className="h-20 w-20 object-contain shrink-0" />
            <div className="leading-tight">
              <p className="text-2xl font-extrabold uppercase tracking-widest text-gray-900">FlowForceRM</p>
              <p className="text-sm uppercase tracking-[0.2em] text-gray-400">Manage Less. Train More.</p>
            </div>
          </div>

          {/* Divider */}
          <div className="w-full h-px bg-gray-100" />

          {/* Photo */}
          <Avatar className="h-28 w-28 border-4 border-primary/20 shadow-md">
            <AvatarImage src={member.photoUrl ?? ""} className="object-cover" />
            <AvatarFallback className="text-3xl font-bold bg-primary/10 text-primary">
              {getInitials(fullName)}
            </AvatarFallback>
          </Avatar>

          {/* Name */}
          <div className="text-center">
            <p className="text-xl font-bold text-gray-900 leading-tight">{fullName}</p>
          </div>

          {/* Athlete ID */}
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-0.5">Athlete ID</p>
            <p className="text-2xl font-mono font-bold text-gray-800 tracking-wider">
              {member.memberNumber ?? member.id.slice(0, 8).toUpperCase()}
            </p>
          </div>

          {/* QR Code */}
          <div className="flex justify-center p-3">
            <QRCode value={qrValue} size={180} />
          </div>
        </div>

        {/* Bottom accent */}
        <div className="h-1.5 bg-primary/20 w-full" />
      </div>

      {/* Download button */}
      <button
        onClick={downloadCard}
        disabled={downloading}
        className="flex items-center gap-2 px-5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors disabled:opacity-50"
      >
        <Download className="h-4 w-4" />
        {downloading ? "Saving…" : "Download ID"}
      </button>

      {/* Home screen preference */}
      <label className="flex items-center gap-2 text-white/70 text-xs cursor-pointer select-none mt-1">
        <input
          type="checkbox"
          checked={isDefault}
          onChange={toggleDefault}
          className="h-3.5 w-3.5 accent-white cursor-pointer"
        />
        Show Athlete ID as my home screen after login
      </label>
      </div>

      {/* Next arrow */}
      {multi && (
        <button
          onClick={next}
          className="absolute right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      {/* Dot indicators */}
      {multi && (
        <div className="absolute bottom-6 flex gap-2">
          {profiles.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setIndex(i)}
              className={`h-2 rounded-full transition-all ${i === index ? "w-6 bg-white" : "w-2 bg-white/40"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
