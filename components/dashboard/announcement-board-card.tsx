"use client";

import { useEffect, useState, useCallback } from "react";
import { Megaphone, Loader2, Pin, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { timeAgo, formatDateTime } from "@/lib/utils";
import { toast } from "@/lib/use-toast";

const AUDIENCE_OPTIONS = [
  { key: "ADMIN", label: "Admin" },
  { key: "STAFF", label: "Staff" },
  { key: "COACH", label: "Coaches" },
  { key: "MEMBER", label: "Members" },
] as const;

type AnnouncementStatus = "LIVE" | "SCHEDULED" | "EXPIRED";

type Announcement = {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  audience: string[];
  sendAt: string | null;
  expiresAt: string | null;
  sendEmail: boolean;
  sendSms: boolean;
  status: AnnouncementStatus;
  createdAt: string;
  createdBy: { name: string | null; email: string };
};

const STATUS_STYLE: Record<AnnouncementStatus, string> = {
  LIVE: "bg-emerald-100 text-emerald-700",
  SCHEDULED: "bg-blue-100 text-blue-700",
  EXPIRED: "bg-muted text-muted-foreground",
};

function toIsoOrNull(datetimeLocal: string): string | null {
  return datetimeLocal ? new Date(datetimeLocal).toISOString() : null;
}

export function AnnouncementBoardCard({ canManage }: { canManage: boolean }) {
  const [announcements, setAnnouncements] = useState<Announcement[] | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [audience, setAudience] = useState<string[]>(["ADMIN"]);
  const [sendAt, setSendAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [sendEmail, setSendEmail] = useState(false);
  const [sendSms, setSendSms] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/announcements")
      .then((r) => r.json())
      .then((d) => setAnnouncements(Array.isArray(d) ? d : []))
      .catch(() => setAnnouncements([]));
  }, []);

  useEffect(() => { load(); }, [load]);

  function resetForm() {
    setShowAdd(false);
    setTitle("");
    setContent("");
    setIsPinned(false);
    setAudience(["ADMIN"]);
    setSendAt("");
    setExpiresAt("");
    setSendEmail(false);
    setSendSms(false);
  }

  function toggleAudience(key: string) {
    setAudience((prev) => (prev.includes(key) ? prev.filter((a) => a !== key) : [...prev, key]));
  }

  async function submitAnnouncement() {
    setSaving(true);
    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          isPinned,
          audience,
          sendAt: toIsoOrNull(sendAt),
          expiresAt: toIsoOrNull(expiresAt),
          sendEmail,
          sendSms,
        }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error ?? "Failed"); }
      toast({ title: "Announcement posted" });
      resetForm();
      load();
    } catch (e: any) {
      toast({ variant: "destructive", title: typeof e?.message === "string" ? e.message : "Could not post announcement" });
    } finally {
      setSaving(false);
    }
  }

  async function deleteAnnouncement(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/announcements/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      load();
    } catch {
      toast({ variant: "destructive", title: "Could not delete announcement" });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Megaphone className="h-4 w-4" />Gym Announcements
          </CardTitle>
          {canManage && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowAdd(true)}>
              <Plus className="h-3 w-3 mr-1" />Add Announcement
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {announcements === null ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : announcements.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No gym announcements posted yet.</p>
          ) : (
            <ul className="space-y-3">
              {announcements.map((a) => (
                <li key={a.id} className={`rounded-md border p-3 space-y-1 ${a.isPinned ? "bg-amber-50/50 border-amber-200" : ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                      {a.isPinned && <Pin className="h-3 w-3 text-amber-600 shrink-0" />}
                      <p className="font-medium text-sm truncate">{a.title}</p>
                      {canManage && (
                        <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${STATUS_STYLE[a.status]}`}>
                          {a.status}
                        </span>
                      )}
                    </div>
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => deleteAnnouncement(a.id)}
                        disabled={deletingId === a.id}
                        className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                      >
                        {deletingId === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{a.content}</p>
                  {canManage && (
                    <div className="flex flex-wrap gap-1">
                      {a.audience.map((tag) => (
                        <span key={tag} className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {AUDIENCE_OPTIONS.find((o) => o.key === tag)?.label ?? tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {a.createdBy?.name ?? a.createdBy?.email ?? "Unknown"} · {timeAgo(a.createdAt)}
                    {canManage && a.sendAt && <> · Sends {formatDateTime(a.sendAt)}</>}
                    {canManage && a.expiresAt && <> · Expires {formatDateTime(a.expiresAt)}</>}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAdd} onOpenChange={(o) => { if (!o) resetForm(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Announcement</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Holiday Schedule" />
            </div>
            <div className="space-y-1">
              <Label>Content</Label>
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write your announcement..." rows={4} />
            </div>

            <div className="space-y-1.5">
              <Label>Who sees this</Label>
              <div className="flex flex-wrap gap-3">
                {AUDIENCE_OPTIONS.map((opt) => (
                  <label key={opt.key} className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={audience.includes(opt.key)}
                      onChange={() => toggleAudience(opt.key)}
                      className="h-4 w-4 accent-primary cursor-pointer"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Send At <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input type="datetime-local" value={sendAt} onChange={(e) => setSendAt(e.target.value)} className="text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Expires At <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="text-xs" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground -mt-1">Leave Send At blank to post immediately. Leave Expires At blank to never expire.</p>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="announcementPin"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="h-4 w-4 accent-primary cursor-pointer"
              />
              <label htmlFor="announcementPin" className="text-sm cursor-pointer select-none">Pin to top</label>
            </div>

            <div className="space-y-1.5 rounded-md border p-3">
              <Label className="text-xs">Also notify by</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
                  <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} className="h-4 w-4 accent-primary cursor-pointer" />
                  Email
                </label>
                <label className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
                  <input type="checkbox" checked={sendSms} onChange={(e) => setSendSms(e.target.checked)} className="h-4 w-4 accent-primary cursor-pointer" />
                  SMS
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => resetForm()}>Cancel</Button>
            <Button disabled={!title.trim() || !content.trim() || audience.length === 0 || saving} onClick={submitAnnouncement}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Post Announcement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
