"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { MEMBER_SOURCE_OPTIONS } from "@/lib/member-source";

interface Props {
  memberId: string;
}

// Blocking, centered modal — no skip/close button, no escape/outside-click dismissal.
// Rendered once per session on first dashboard load when a MEMBER's source is missing.
export function HowDidYouHearGate({ memberId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [source, setSource] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!source) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source }),
      });
      if (!res.ok) throw new Error();
      setOpen(false);
      router.refresh();
    } catch {
      setError("Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80" />
        <DialogPrimitive.Content
          className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-sm translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg sm:rounded-lg focus:outline-none"
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <div className="space-y-1.5">
            <DialogTitle>How did you hear about us?</DialogTitle>
            <DialogDescription>Let us know before continuing.</DialogDescription>
          </div>
          <div className="space-y-2">
            {MEMBER_SOURCE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSource(opt.value)}
                className={`w-full text-left rounded-md border px-3 py-2 text-sm transition-colors ${
                  source === opt.value ? "border-primary bg-primary/5 font-medium" : "hover:bg-muted/50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={submit} disabled={!source || saving} className="w-full">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Continue
          </Button>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </Dialog>
  );
}
