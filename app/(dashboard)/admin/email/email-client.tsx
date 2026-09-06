"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Mail, RefreshCw, Send, Inbox, Trash2, Loader2, Reply, AlertOctagon, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn, formatDateTime } from "@/lib/utils";
import { toast } from "@/lib/use-toast";

export function EmailClient({ integration }: { integration: any | null }) {
  const router = useRouter();
  const [threads, setThreads] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [threadMessages, setThreadMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [composing, setComposing] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [sending, setSending] = useState(false);
  const [replyMode, setReplyMode] = useState(false);
  const [activeLabel, setActiveLabel] = useState("INBOX");

  // Email filter settings
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [aliases, setAliases] = useState<{ email: string; name: string; isPrimary: boolean }[]>([]);
  const [selectedAddresses, setSelectedAddresses] = useState<string[]>([]);
  const [savingFilter, setSavingFilter] = useState(false);
  const [loadingAliases, setLoadingAliases] = useState(false);
  const [manualInput, setManualInput] = useState("");

  const fetchThreads = useCallback(async (label = "INBOX") => {
    if (!integration) return;
    setLoading(true);
    setSelected(null);
    setThreadMessages([]);
    try {
      const res = await fetch(`/api/email/threads?label=${label}`);
      const data = await res.json();
      if (data.error === "NO_INTEGRATION") return;
      setThreads(data.threads ?? []);
    } catch {
      toast({ variant: "destructive", title: "Failed to load emails" });
    } finally {
      setLoading(false);
    }
  }, [integration]);

  useEffect(() => {
    fetchThreads(activeLabel);
  }, [fetchThreads, activeLabel]);

  async function openThread(thread: any) {
    setSelected(thread);
    setLoadingThread(true);
    try {
      const res = await fetch(`/api/email/thread/${thread.id}`);
      const data = await res.json();
      setThreadMessages(data.messages ?? []);
      setThreads((prev) =>
        prev.map((t) => (t.id === thread.id ? { ...t, unread: false } : t))
      );
    } catch {
      toast({ variant: "destructive", title: "Failed to load thread" });
    } finally {
      setLoadingThread(false);
    }
  }

  async function sendEmail() {
    setSending(true);
    try {
      const lastMsg = replyMode ? threadMessages[threadMessages.length - 1] : null;
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: composeTo,
          subject: composeSubject,
          body: composeBody,
          ...(replyMode && selected ? { threadId: selected.id, inReplyTo: lastMsg?.id } : {}),
        }),
      });
      if (!res.ok) throw new Error("Send failed");
      toast({ title: "Email sent!" });
      setComposing(false);
      setReplyMode(false);
      setComposeTo(""); setComposeSubject(""); setComposeBody("");
      fetchThreads();
    } catch {
      toast({ variant: "destructive", title: "Failed to send email" });
    } finally {
      setSending(false);
    }
  }

  function startReply() {
    const lastMsg = threadMessages[threadMessages.length - 1];
    const fromMatch = lastMsg?.from?.match(/<(.+)>/) ?? [];
    setComposeTo(fromMatch[1] ?? lastMsg?.from ?? "");
    setComposeSubject(selected?.subject?.startsWith("Re:") ? selected.subject : `Re: ${selected?.subject}`);
    setComposeBody(`\n\n--- Original message ---\n${lastMsg?.body?.slice(0, 500) ?? ""}`);
    setReplyMode(true);
    setComposing(true);
  }

  async function openSettings() {
    setSettingsOpen(true);
    setLoadingAliases(true);
    try {
      const res = await fetch("/api/email/send-as");
      const data = await res.json();
      setAliases(data.aliases ?? []);
      // filterAddresses now comes back even when the Gmail call itself failed (see
      // api/email/send-as/route.ts), so this stays accurate independent of the error below.
      setSelectedAddresses(data.filterAddresses ?? []);
      if (data.error === "TOKEN_EXPIRED") {
        toast({
          variant: "destructive",
          title: "Google connection expired",
          description: "Reconnect your Gmail account to send email or fetch aliases.",
        });
      } else if (data.error) {
        toast({ variant: "destructive", title: "Could not load Gmail aliases" });
      }
    } catch {
      toast({ variant: "destructive", title: "Failed to load email aliases" });
    } finally {
      setLoadingAliases(false);
    }
  }

  function toggleAddress(email: string) {
    setSelectedAddresses((prev) =>
      prev.includes(email) ? prev.filter((a) => a !== email) : [...prev, email]
    );
  }

  function addManualAddress() {
    const email = manualInput.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    if (!selectedAddresses.includes(email)) {
      setSelectedAddresses((prev) => [...prev, email]);
    }
    setManualInput("");
  }

  async function saveFilter() {
    if (selectedAddresses.length === 0) return;
    setSavingFilter(true);
    try {
      const res = await fetch("/api/email/filter", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addresses: selectedAddresses }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Email filter saved" });
      setSettingsOpen(false);
      fetchThreads(activeLabel);
    } catch {
      toast({ variant: "destructive", title: "Failed to save filter" });
    } finally {
      setSavingFilter(false);
    }
  }

  // Not connected
  if (!integration) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-6 max-w-md mx-auto text-center">
        <div className="rounded-full bg-primary/10 p-6">
          <Mail className="h-12 w-12 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Connect Your Email</h1>
          <p className="text-muted-foreground mt-2">
            Connect Gmail to read and reply to member emails directly from FlowForceRM.
          </p>
        </div>
        <ConnectEmailButton />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Email</h1>
          <p className="text-sm text-muted-foreground">Connected: {integration.email}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchThreads(activeLabel)} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={openSettings}>
            <Settings className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button size="sm" onClick={() => { setReplyMode(false); setComposing(true); }}>
            <Send className="mr-2 h-4 w-4" />Compose
          </Button>
        </div>
      </div>

      {/* Folder tabs */}
      <div className="flex gap-1 border-b pb-0">
        {[
          { label: "Inbox", id: "INBOX", icon: Inbox },
          { label: "Sent", id: "SENT", icon: Send },
          { label: "Spam", id: "SPAM", icon: AlertOctagon },
          { label: "Trash", id: "TRASH", icon: Trash2 },
        ].map(({ label, id, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveLabel(id)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
              activeLabel === id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      <div className="flex gap-4 h-[calc(100vh-270px)]">
        {/* Thread list */}
        <div className="w-80 shrink-0 border rounded-lg overflow-y-auto bg-background">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : threads.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Inbox className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No emails</p>
            </div>
          ) : (
            threads.map((thread) => (
              <button
                key={thread.id}
                onClick={() => openThread(thread)}
                className={cn(
                  "w-full text-left border-b p-3 hover:bg-accent transition-colors",
                  selected?.id === thread.id && "bg-accent",
                  thread.unread && "bg-blue-50"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className={cn("text-sm truncate", thread.unread && "font-semibold")}>
                    {thread.subject || "(no subject)"}
                  </p>
                  {thread.unread && <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />}
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{thread.from}</p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{thread.snippet}</p>
              </button>
            ))
          )}
        </div>

        {/* Thread detail */}
        <div className="flex-1 border rounded-lg overflow-y-auto bg-background">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Mail className="h-10 w-10 opacity-20 mb-3" />
              <p>Select an email to read it</p>
            </div>
          ) : loadingThread ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="p-6 space-y-6">
              <div className="flex items-start justify-between">
                <h2 className="text-xl font-semibold">{selected.subject}</h2>
                <Button variant="outline" size="sm" onClick={startReply}>
                  <Reply className="mr-2 h-4 w-4" />Reply
                </Button>
              </div>
              {threadMessages.map((msg) => (
                <div key={msg.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{msg.from}</p>
                      {msg.to && <p className="text-xs text-muted-foreground">To: {msg.to}</p>}
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDateTime(new Date(msg.date))}</span>
                  </div>
                  <div className="border-t pt-3">
                    {msg.html ? (
                      <iframe
                        srcDoc={msg.html}
                        className="w-full border-0 rounded"
                        style={{ minHeight: 300 }}
                        onLoad={(e) => {
                          const iframe = e.currentTarget;
                          iframe.style.height = ((iframe.contentDocument?.body?.scrollHeight ?? 300) + 32) + "px";
                        }}
                        sandbox="allow-same-origin allow-popups"
                      />
                    ) : (
                      <div className="text-sm whitespace-pre-wrap leading-relaxed">
                        {msg.body || msg.snippet}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Email filter settings dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Email Filter Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select which addresses to show in the inbox. At least one must be selected.
            </p>

            {/* Manual address entry */}
            <div className="flex gap-2">
              <Input
                placeholder="Add address manually (e.g. alias@domain.com)"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addManualAddress()}
              />
              <Button type="button" variant="outline" onClick={addManualAddress} disabled={!manualInput.trim()}>
                Add
              </Button>
            </div>

            {/* Alias list from Google + manually added */}
            {loadingAliases ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-2">
                {/* Google send-as aliases */}
                {aliases.map((alias) => {
                  const checked = selectedAddresses.includes(alias.email);
                  const isLast = selectedAddresses.length === 1 && checked;
                  return (
                    <label
                      key={alias.email}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors",
                        checked && "border-primary bg-primary/5",
                        isLast && "cursor-not-allowed opacity-60"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => !isLast && toggleAddress(alias.email)}
                        disabled={isLast}
                        className="h-4 w-4 rounded border-gray-300 accent-primary"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{alias.email}</p>
                        {alias.name && <p className="text-xs text-muted-foreground">{alias.name}</p>}
                        {alias.isPrimary && <span className="text-[10px] text-primary font-medium">Primary</span>}
                      </div>
                    </label>
                  );
                })}
                {/* Manually added addresses not in the Google list */}
                {selectedAddresses
                  .filter((addr) => !aliases.some((a) => a.email === addr))
                  .map((addr) => {
                    const isLast = selectedAddresses.length === 1;
                    return (
                      <label
                        key={addr}
                        className={cn(
                          "flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors border-primary bg-primary/5",
                          isLast && "cursor-not-allowed opacity-60"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked
                          onChange={() => !isLast && toggleAddress(addr)}
                          disabled={isLast}
                          className="h-4 w-4 rounded border-gray-300 accent-primary"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{addr}</p>
                          <span className="text-[10px] text-muted-foreground">Added manually</span>
                        </div>
                      </label>
                    );
                  })}
                {aliases.length === 0 && selectedAddresses.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No addresses added yet. Type an address above and click Add.
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>Cancel</Button>
            <Button onClick={saveFilter} disabled={savingFilter || selectedAddresses.length === 0 || loadingAliases}>
              {savingFilter && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Filter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Compose dialog */}
      <Dialog open={composing} onOpenChange={(o) => { if (!o) { setComposing(false); setReplyMode(false); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{replyMode ? "Reply" : "New Email"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>To</Label>
              <Input value={composeTo} onChange={(e) => setComposeTo(e.target.value)} placeholder="recipient@example.com" />
            </div>
            <div className="space-y-1">
              <Label>Subject</Label>
              <Input value={composeSubject} onChange={(e) => setComposeSubject(e.target.value)} placeholder="Subject..." />
            </div>
            <div className="space-y-1">
              <Label>Message</Label>
              <textarea
                className="w-full min-h-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                placeholder="Write your message..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setComposing(false); setReplyMode(false); }}>Cancel</Button>
            <Button onClick={sendEmail} disabled={sending || !composeTo || !composeSubject || !composeBody}>
              {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Send className="mr-2 h-4 w-4" />Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ConnectEmailButton() {
  function connectGmail() {
    // The server builds the actual Google OAuth URL (api/email/connect/start) -- it
    // knows which gym/admin this is from the request itself and signs that into the
    // state it hands to Google, so there's nothing tenant- or account-specific to
    // construct here. Any admin can connect any Gmail account, gym or personal.
    window.location.href = "/api/email/connect/start";
  }

  return (
    <div className="flex gap-3">
      <Button onClick={connectGmail} className="gap-2">
        <Mail className="h-4 w-4" />
        Connect Gmail
      </Button>
    </div>
  );
}
