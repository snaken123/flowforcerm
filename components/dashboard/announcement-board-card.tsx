"use client";

import { useEffect, useState, useCallback } from "react";
import { Megaphone, Loader2, Pin, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { timeAgo } from "@/lib/utils";
import { toast } from "@/lib/use-toast";

type Announcement = {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
  createdBy: { name: string | null; email: string };
};

export function AnnouncementBoardCard({ canManage }: { canManage: boolean }) {
  const [announcements, setAnnouncements] = useState<Announcement[] | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/announcements")
      .then((r) => r.json())
      .then((d) => setAnnouncements(Array.isArray(d) ? d : []))
      .catch(() => setAnnouncements([]));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function submitAnnouncement() {
    setSaving(true);
    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), content: content.trim(), isPinned }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error ?? "Failed"); }
      toast({ title: "Announcement posted" });
      setShowAdd(false);
      setTitle("");
      setContent("");
      setIsPinned(false);
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
                    <div className="flex items-center gap-1.5 min-w-0">
                      {a.isPinned && <Pin className="h-3 w-3 text-amber-600 shrink-0" />}
                      <p className="font-medium text-sm truncate">{a.title}</p>
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
                  <p className="text-xs text-muted-foreground">
                    {a.createdBy?.name ?? a.createdBy?.email ?? "Unknown"} · {timeAgo(a.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAdd} onOpenChange={(o) => { if (!o) { setShowAdd(false); setTitle(""); setContent(""); setIsPinned(false); } }}>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button disabled={!title.trim() || !content.trim() || saving} onClick={submitAnnouncement}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Post Announcement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
