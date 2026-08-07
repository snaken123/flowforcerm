"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, ArrowRight } from "lucide-react";

export function ContactForm() {
  const [name, setName] = useState("");
  const [gymName, setGymName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot — real visitors leave this blank
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, gymName, email, phone: phone || undefined, message, website }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Something went wrong — please try again.");
        return;
      }
      setSent(true);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="text-center py-8">
        <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-4" />
        <p className="text-lg font-semibold mb-2">Thanks — we'll be in touch.</p>
        <p className="text-[#666]">We usually reply within a day.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2 text-left">
      <input
        type="text"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        className="hidden"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />
      <div className="space-y-1.5">
        <label className="text-xs text-[#888] uppercase tracking-wide">Your Name</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Jane Dela Cruz"
          className="w-full bg-[#1a1a1a] border border-white/20 rounded-md px-3 py-2.5 text-sm text-white placeholder:text-[#555]"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs text-[#888] uppercase tracking-wide">Gym Name</label>
        <input
          required
          value={gymName}
          onChange={(e) => setGymName(e.target.value)}
          placeholder="Iron Fist BJJ"
          className="w-full bg-[#1a1a1a] border border-white/20 rounded-md px-3 py-2.5 text-sm text-white placeholder:text-[#555]"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs text-[#888] uppercase tracking-wide">Email</label>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jane@ironfist.com"
          className="w-full bg-[#1a1a1a] border border-white/20 rounded-md px-3 py-2.5 text-sm text-white placeholder:text-[#555]"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs text-[#888] uppercase tracking-wide">Phone (optional)</label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+63 9XX XXX XXXX"
          className="w-full bg-[#1a1a1a] border border-white/20 rounded-md px-3 py-2.5 text-sm text-white placeholder:text-[#555]"
        />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <label className="text-xs text-[#888] uppercase tracking-wide">Tell us about your gym</label>
        <textarea
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="How many members, what disciplines you teach, what you're looking for…"
          rows={4}
          className="w-full bg-[#1a1a1a] border border-white/20 rounded-md px-3 py-2.5 text-sm text-white placeholder:text-[#555] resize-none"
        />
      </div>

      {error && (
        <div className="sm:col-span-2 rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="sm:col-span-2 flex justify-center pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-md bg-white text-black hover:bg-[#e0e0e0] transition-colors px-8 py-3 text-base font-semibold tracking-wide disabled:opacity-50"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitting ? "Sending…" : "Get Started"}
          {!submitting && <ArrowRight className="h-4 w-4" />}
        </button>
      </div>
    </form>
  );
}
