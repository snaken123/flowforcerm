"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle, Clock, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { Suspense } from "react";

type Slot = {
  scheduleId: string;
  classSessionId: string;
  className: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string | null;
  coach: string | null;
};

type KidsSlot = Slot & { serviceId: string; freePackageId: string | null };

type SportGroup = {
  serviceId: string;
  serviceName: string;
  serviceColor: string;
  freePackageId: string | null;
  slots: Slot[];
};

// Wed=3, Fri=5
const KIDS_GROUP_A_DAYS = [3, 5];
// Tue=2, Thu=4, Sat=6
const KIDS_GROUP_B_DAYS = [2, 4, 6];

const GROUP_A_LABEL = "Wed & Fri";
const GROUP_B_LABEL = "Tue, Thu & Sat";

function slotDayOfWeek(dateStr: string): number {
  return new Date(dateStr + "T12:00:00").getDay();
}

function fmt12(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hr = h % 12 || 12;
  return `${hr}:${String(m).padStart(2, "0")} ${ampm}`;
}

function fmtDate(d: string) {
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric" });
}

function SlotButton({ slot, isSelected, onClick }: { slot: Slot; isSelected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-xl border px-4 py-2.5 text-sm transition-all",
        isSelected
          ? "border-zinc-900 bg-zinc-900 text-white"
          : "border-zinc-200 hover:border-zinc-400 bg-white text-zinc-800"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-medium">{fmtDate(slot.date)}</span>
        <span className={cn("text-xs", isSelected ? "text-zinc-300" : "text-zinc-500")}>
          {fmt12(slot.startTime)} – {fmt12(slot.endTime)}
        </span>
      </div>
      {(slot.className || slot.coach || slot.location) && (
        <div className={cn("text-xs mt-0.5 flex gap-2", isSelected ? "text-zinc-400" : "text-zinc-400")}>
          {slot.className && <span>{slot.className}</span>}
          {slot.coach && <span>· {slot.coach}</span>}
          {slot.location && <span>· {slot.location}</span>}
        </div>
      )}
    </button>
  );
}

function SelectContent() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const confirmationRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  async function downloadConfirmation() {
    if (!confirmationRef.current) return;
    setDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(confirmationRef.current, {
        backgroundColor: "#ffffff",
        scale: 3,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement("a");
      link.download = "flowforcerm-booking-confirmation.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setDownloading(false);
    }
  }

  const [tokenState, setTokenState] = useState<"loading" | "valid" | "invalid" | "expired" | "used">("loading");
  const [firstName, setFirstName] = useState("");
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);

  // Adult sports (yoga, adult judo/bjj)
  const [sports, setSports] = useState<SportGroup[]>([]);
  // Kids sports (kids judo/bjj)
  const [kidsSports, setKidsSports] = useState<SportGroup[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);

  const [isKid, setIsKid] = useState(false);

  // Adult selections: serviceId → slot
  const [selections, setSelections] = useState<Record<string, Slot>>({});
  // Kids group selections
  const [kidsGroupA, setKidsGroupA] = useState<KidsSlot | null>(null);
  const [kidsGroupB, setKidsGroupB] = useState<KidsSlot | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<"select" | "done" | "error">("select");
  const [timeLeft, setTimeLeft] = useState("");

  // Verify token
  useEffect(() => {
    if (!token) { setTokenState("invalid"); return; }
    fetch(`/api/register/verify?token=${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.valid) { setTokenState(d.reason === "expired" ? "expired" : d.reason === "used" ? "used" : "invalid"); return; }
        setTokenState("valid");
        setFirstName(d.firstName);
        setExpiresAt(new Date(d.expiresAt));
      });
  }, [token]);

  // Countdown
  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => {
      const diff = expiresAt.getTime() - Date.now();
      if (diff <= 0) { setTimeLeft("Expired"); clearInterval(interval); return; }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${m}:${String(s).padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  // Fetch adult classes once
  useEffect(() => {
    if (tokenState !== "valid") return;
    setLoadingClasses(true);
    fetch("/api/register/classes")
      .then((r) => r.json())
      .then((d) => setSports(d))
      .finally(() => setLoadingClasses(false));
  }, [tokenState]);

  // Fetch kids classes when kids mode toggled on
  useEffect(() => {
    if (!isKid || kidsSports.length > 0) return;
    fetch("/api/register/classes?kids=true")
      .then((r) => r.json())
      .then((d) => setKidsSports(d));
  }, [isKid]);

  // When kids mode changes, clear kids selections
  useEffect(() => {
    setKidsGroupA(null);
    setKidsGroupB(null);
  }, [isKid]);

  // Derive display sports:
  // - adult mode: all adult sports
  // - kids mode: adult sports minus judo/bjj (keep yoga), plus kids judo/bjj handled separately
  const JUDO_BJJ_KEYWORDS = ["judo", "jiujitsu", "jiu jitsu", "jiu-jitsu"];
  const adultSportsForDisplay = isKid
    ? sports.filter((s) => !JUDO_BJJ_KEYWORDS.some((k) => s.serviceName.toLowerCase().includes(k)))
    : sports;

  // All kids slots flattened (for group A/B splitting)
  const allKidsSlots: KidsSlot[] = kidsSports.flatMap((ks) =>
    ks.slots.map((slot) => ({ ...slot, serviceId: ks.serviceId, freePackageId: ks.freePackageId }))
  );
  allKidsSlots.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

  const kidsGroupASlots = allKidsSlots.filter((s) => KIDS_GROUP_A_DAYS.includes(slotDayOfWeek(s.date)));
  const kidsGroupBSlots = allKidsSlots.filter((s) => KIDS_GROUP_B_DAYS.includes(slotDayOfWeek(s.date)));

  // Kids service meta for display
  const kidsServiceName = kidsSports[0]?.serviceName ?? "Kids Judo & Jiujitsu";
  const kidsServiceColor = kidsSports[0]?.serviceColor ?? "#6366f1";

  function toggleAdultSlot(serviceId: string, slot: Slot) {
    setSelections((prev) => {
      const next = { ...prev };
      if (next[serviceId]?.scheduleId === slot.scheduleId && next[serviceId]?.date === slot.date) {
        delete next[serviceId];
      } else {
        next[serviceId] = slot;
      }
      return next;
    });
  }

  function toggleKidsSlot(group: "A" | "B", slot: KidsSlot) {
    const setter = group === "A" ? setKidsGroupA : setKidsGroupB;
    const current = group === "A" ? kidsGroupA : kidsGroupB;
    setter(current?.scheduleId === slot.scheduleId && current?.date === slot.date ? null : slot);
  }

  // Build submission payload
  function buildSubmissionSelections() {
    const result: { serviceId: string; scheduleId: string; classSessionId: string; date: string; freePackageId?: string }[] = [];
    for (const [serviceId, slot] of Object.entries(selections)) {
      const sport = sports.find((s) => s.serviceId === serviceId);
      result.push({ serviceId, scheduleId: slot.scheduleId, classSessionId: slot.classSessionId, date: slot.date, freePackageId: sport?.freePackageId ?? undefined });
    }
    if (isKid) {
      if (kidsGroupA) result.push({ serviceId: kidsGroupA.serviceId, scheduleId: kidsGroupA.scheduleId, classSessionId: kidsGroupA.classSessionId, date: kidsGroupA.date, freePackageId: kidsGroupA.freePackageId ?? undefined });
      if (kidsGroupB) result.push({ serviceId: kidsGroupB.serviceId, scheduleId: kidsGroupB.scheduleId, classSessionId: kidsGroupB.classSessionId, date: kidsGroupB.date, freePackageId: kidsGroupB.freePackageId ?? undefined });
    }
    return result;
  }

  const totalSelected = Object.keys(selections).length + (isKid ? (kidsGroupA ? 1 : 0) + (kidsGroupB ? 1 : 0) : 0);
  const canSubmit = totalSelected > 0 && (!isKid || (kidsGroupA !== null && kidsGroupB !== null));

  // When isKid: require both groups selected (or no kids classes chosen at all if no slots exist)
  const kidsHasSlots = kidsGroupASlots.length > 0 || kidsGroupBSlots.length > 0;
  const kidsComplete = !isKid || !kidsHasSlots || (kidsGroupA !== null && kidsGroupB !== null);

  async function handleSubmit() {
    const payload = buildSubmissionSelections();
    if (!payload.length) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/register/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, selections: payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStep("done");
    } catch {
      setStep("error");
    } finally {
      setSubmitting(false);
    }
  }

  // Collect all selected slots for the done screen
  function allSelections() {
    const result: { label: string; color: string; slot: Slot }[] = [];
    for (const [serviceId, slot] of Object.entries(selections)) {
      const sport = sports.find((s) => s.serviceId === serviceId);
      result.push({ label: sport?.serviceName ?? "", color: sport?.serviceColor ?? "#6b7280", slot });
    }
    if (isKid) {
      if (kidsGroupA) result.push({ label: kidsServiceName + " (Group A)", color: kidsServiceColor, slot: kidsGroupA });
      if (kidsGroupB) result.push({ label: kidsServiceName + " (Group B)", color: kidsServiceColor, slot: kidsGroupB });
    }
    return result;
  }

  // ── States ───────────────────────────────────────────────────────────────────

  if (tokenState === "loading") {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
        <p className="text-zinc-400 text-sm">Verifying your link…</p>
      </div>
    );
  }

  if (tokenState === "expired") {
    return (
      <Card>
        <AlertCircle className="h-10 w-10 text-amber-500 mx-auto mb-4" />
        <h2 className="font-bold text-xl text-center mb-2">Link Expired</h2>
        <p className="text-sm text-zinc-500 text-center leading-relaxed">
          This registration link has expired (links are valid for 1 hour).<br/>
          Please go back to our website and sign up again.
        </p>
      </Card>
    );
  }

  if (tokenState === "used") {
    return (
      <Card>
        <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-4" />
        <h2 className="font-bold text-xl text-center mb-2">Already Registered</h2>
        <p className="text-sm text-zinc-500 text-center">
          You've already completed your free trial registration.<br/>
          Check your email for your booking confirmation.
        </p>
      </Card>
    );
  }

  if (tokenState === "invalid") {
    return (
      <Card>
        <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-4" />
        <h2 className="font-bold text-xl text-center mb-2">Invalid Link</h2>
        <p className="text-sm text-zinc-500 text-center">
          This link is not valid. Please go back to our website and sign up again.
        </p>
      </Card>
    );
  }

  if (step === "done") {
    const all = allSelections();
    return (
      <div className="w-full max-w-sm">
        <div ref={confirmationRef} className="bg-white rounded-2xl shadow-sm border border-zinc-100 px-6 py-8">
          <img src="/logo.png" alt="FlowForceRM" className="h-10 w-10 rounded-full object-contain mx-auto mb-4" />
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h2 className="font-bold text-2xl text-center mb-2">You're booked, {firstName}! 🥋</h2>
          <p className="text-sm text-zinc-500 text-center leading-relaxed mb-4">
            A confirmation has been sent to your email with all the details.
          </p>
          <div className="bg-zinc-50 rounded-xl p-4 space-y-2">
            {all.map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="font-medium">{item.label}</span>
                <span className="text-zinc-500 ml-auto">{fmtDate(item.slot.date)} · {fmt12(item.slot.startTime)}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-400 text-center mt-4">Please arrive 15 minutes early. See you on the mats!</p>
          <p className="text-xs text-zinc-500 text-center mt-3 leading-relaxed">
            You may now visit the gym on your selected dates. Simply show this confirmation to our front desk when you arrive.
          </p>
        </div>
        <Button
          variant="outline"
          className="w-full mt-4"
          onClick={downloadConfirmation}
          disabled={downloading}
        >
          {downloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
          Save Confirmation
        </Button>
      </div>
    );
  }

  if (step === "error") {
    return (
      <Card>
        <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-4" />
        <h2 className="font-bold text-xl text-center mb-2">Something went wrong</h2>
        <p className="text-sm text-zinc-500 text-center">Please contact our front desk at members@flowforcerm.com</p>
      </Card>
    );
  }

  // ── Main selection UI ────────────────────────────────────────────────────────

  return (
    <div className="w-full max-w-xl">
      {/* Header */}
      <div className="bg-zinc-950 rounded-2xl px-8 py-5 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="FlowForceRM" className="h-9 w-9 rounded-full object-contain" />
          <div>
            <p className="text-white font-bold text-sm tracking-wide">FlowForceRM</p>
            <p className="text-zinc-400 text-xs">Hi {firstName}! Choose your free class{totalSelected > 1 ? "es" : ""}.</p>
          </div>
        </div>
        {timeLeft && (
          <div className={cn("flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-full",
            timeLeft === "Expired" ? "bg-red-900/60 text-red-300" : "bg-zinc-800 text-zinc-300")}>
            <Clock className="h-3 w-3" /> {timeLeft}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Age checkbox */}
        <div className="px-6 py-4 border-b bg-amber-50">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isKid}
              onChange={(e) => setIsKid(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 accent-zinc-900 cursor-pointer"
            />
            <span className="text-sm font-medium text-zinc-800">
              Athlete is <strong>13 years old and younger</strong>
            </span>
          </label>
        </div>

        {/* Instructions */}
        <div className="px-6 py-3 border-b bg-zinc-50">
          {isKid ? (
            <p className="text-sm text-zinc-600">
              Select <strong>1 session from each group</strong> (2 sessions total) within the next 14 days.
              {adultSportsForDisplay.length > 0 && " You may also register for other available sports."}
            </p>
          ) : (
            <p className="text-sm text-zinc-600">
              Select <strong>1 class per sport</strong> within the next 14 days. You can register for multiple sports.
            </p>
          )}
        </div>

        {loadingClasses ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          </div>
        ) : (
          <div className="divide-y">
            {/* Adult sports (yoga stays in kids mode; adult judo/bjj hidden) */}
            {adultSportsForDisplay.map((sport) => (
              <div key={sport.serviceId} className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: sport.serviceColor }} />
                  <h3 className="font-bold text-sm uppercase tracking-wide text-zinc-800">{sport.serviceName}</h3>
                  {selections[sport.serviceId] && (
                    <span className="ml-auto text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full">Selected</span>
                  )}
                </div>
                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {sport.slots.map((slot) => (
                    <SlotButton
                      key={`${slot.scheduleId}-${slot.date}`}
                      slot={slot}
                      isSelected={selections[sport.serviceId]?.scheduleId === slot.scheduleId && selections[sport.serviceId]?.date === slot.date}
                      onClick={() => toggleAdultSlot(sport.serviceId, slot)}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Kids judo/bjj groups (only in kids mode) */}
            {isKid && (
              <div className="p-5 space-y-5">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: kidsServiceColor }} />
                  <h3 className="font-bold text-sm uppercase tracking-wide text-zinc-800">{kidsServiceName}</h3>
                </div>

                {kidsSports.length === 0 ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
                  </div>
                ) : allKidsSlots.length === 0 ? (
                  <p className="text-sm text-zinc-500">No kids classes available in the next 14 days. Please contact us directly.</p>
                ) : (
                  <>
                    {/* Group A */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold uppercase tracking-wide text-zinc-500">Group A — {GROUP_A_LABEL}</span>
                        {kidsGroupA && <span className="ml-auto text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full">Selected</span>}
                      </div>
                      {kidsGroupASlots.length === 0 ? (
                        <p className="text-xs text-zinc-400">No slots available for {GROUP_A_LABEL}.</p>
                      ) : (
                        <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                          {kidsGroupASlots.map((slot) => (
                            <SlotButton
                              key={`${slot.scheduleId}-${slot.date}`}
                              slot={slot}
                              isSelected={kidsGroupA?.scheduleId === slot.scheduleId && kidsGroupA?.date === slot.date}
                              onClick={() => toggleKidsSlot("A", slot)}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Group B */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold uppercase tracking-wide text-zinc-500">Group B — {GROUP_B_LABEL}</span>
                        {kidsGroupB && <span className="ml-auto text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full">Selected</span>}
                      </div>
                      {kidsGroupBSlots.length === 0 ? (
                        <p className="text-xs text-zinc-400">No slots available for {GROUP_B_LABEL}.</p>
                      ) : (
                        <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                          {kidsGroupBSlots.map((slot) => (
                            <SlotButton
                              key={`${slot.scheduleId}-${slot.date}`}
                              slot={slot}
                              isSelected={kidsGroupB?.scheduleId === slot.scheduleId && kidsGroupB?.date === slot.date}
                              onClick={() => toggleKidsSlot("B", slot)}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {isKid && kidsHasSlots && (!kidsGroupA || !kidsGroupB) && (
                      <p className="text-xs text-amber-600 font-medium">Please select 1 session from each group to continue.</p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Empty state when no adult sports and not kids mode */}
            {!isKid && adultSportsForDisplay.length === 0 && (
              <div className="text-center py-12 text-zinc-500 text-sm">
                No free trial classes available in the next 14 days. Please contact us directly.
              </div>
            )}
          </div>
        )}

        <div className="px-6 py-4 border-t bg-zinc-50">
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || !kidsComplete || submitting}
            className="w-full bg-zinc-950 hover:bg-zinc-800 text-white font-semibold"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {submitting ? "Booking…" : `Confirm My Free Class${totalSelected > 1 ? "es" : ""}`}
          </Button>
          {(!canSubmit || !kidsComplete) && !submitting && (
            <p className="text-xs text-zinc-400 text-center mt-2">
              {isKid && kidsHasSlots && (!kidsGroupA || !kidsGroupB)
                ? "Select 1 session from each group to continue"
                : "Select at least one class to continue"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
      <div className="flex justify-center mb-2">
        <img src="/logo.png" alt="FlowForceRM" className="h-10 w-10 rounded-full object-contain" />
      </div>
      {children}
    </div>
  );
}

export default function SelectPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center gap-2 text-zinc-400">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading…
      </div>
    }>
      <SelectContent />
    </Suspense>
  );
}
