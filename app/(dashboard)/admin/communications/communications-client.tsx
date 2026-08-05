"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Users, CheckCircle, X, Search, RotateCcw, ChevronDown, ChevronUp, Mail, MessageSquare, Check, Bell, BellOff, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/lib/use-toast";
import { formatDate, timeAgo } from "@/lib/utils";

type Member = { id: string; firstName: string; lastName: string; user: { email: string | null } | null };
type Service = { id: string; name: string; color: string };
type Broadcast = { id: string; subject: string; body: string; audience: string; recipientCount: number; sentAt: string };

const AUDIENCE_LABEL: Record<string, string> = {
  all: "All Members", active: "Active Members", inactive: "Inactive Members", specific: "Specific Members",
};

// ─── Notification Settings Panel ────────────────────────────────────────────

const DEFAULT_WARN_SUBJECT = "Your {{service_name}} membership expires in {{warn_days}} day(s)";
const DEFAULT_WARN_BODY = `Hi {{member_name}},

This is a reminder that your {{service_name}} membership at NorthSouth Fight Sports will expire on {{expiry_date}} — that's {{warn_days}} day(s) from now.

{{sessions_remaining}}

To renew, please visit the gym or contact us.

See you on the mats!
NorthSouth Fight Sports`;

const DEFAULT_EXPIRED_SUBJECT = "Your {{service_name}} membership has expired";
const DEFAULT_EXPIRED_BODY = `Hi {{member_name}},

This is a reminder that {{expiry_reason}} for your {{service_name}} membership at NorthSouth Fight Sports.

We'd love to have you continue training with us! Please visit the gym or reach out to renew.

See you soon!
NorthSouth Fight Sports`;

const WARN_VARIABLES = [
  { key: "{{member_name}}", desc: "Athlete's full name" },
  { key: "{{service_name}}", desc: "Membership / service name" },
  { key: "{{expiry_date}}", desc: "Date the membership expires" },
  { key: "{{warn_days}}", desc: "Days before expiry (from settings)" },
  { key: "{{sessions_remaining}}", desc: "Sessions left (session-based only; blank otherwise)" },
];

const EXPIRED_VARIABLES = [
  { key: "{{member_name}}", desc: "Athlete's full name" },
  { key: "{{service_name}}", desc: "Membership / service name" },
  { key: "{{expiry_date}}", desc: "Date the membership expired" },
  { key: "{{sessions_total}}", desc: "Total sessions on the package" },
  { key: "{{expiry_reason}}", desc: "Auto-generated reason (date expired or sessions used)" },
];

type TemplateType = "warn" | "expired";

function NotificationSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [warnEnabled, setWarnEnabled] = useState(false);
  const [warnDays, setWarnDays] = useState("7");
  const [expiredEnabled, setExpiredEnabled] = useState(false);

  // Template editor state
  const [editingTemplate, setEditingTemplate] = useState<TemplateType | null>(null);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [warnSubject, setWarnSubject] = useState("");
  const [warnBody, setWarnBody] = useState("");
  const [expiredSubject, setExpiredSubject] = useState("");
  const [expiredBody, setExpiredBody] = useState("");
  // Draft state while dialog is open
  const [draftSubject, setDraftSubject] = useState("");
  const [draftBody, setDraftBody] = useState("");

  useEffect(() => {
    fetch("/api/admin/notification-settings")
      .then((r) => r.json())
      .then((d) => {
        setWarnEnabled(d.expiryWarningEnabled);
        setWarnDays(String(d.expiryWarningDays));
        setExpiredEnabled(d.expiredNotificationEnabled);
        setWarnSubject(d.expiryWarningSubject || DEFAULT_WARN_SUBJECT);
        setWarnBody(d.expiryWarningBody || DEFAULT_WARN_BODY);
        setExpiredSubject(d.expiredNotificationSubject || DEFAULT_EXPIRED_SUBJECT);
        setExpiredBody(d.expiredNotificationBody || DEFAULT_EXPIRED_BODY);
        setLoading(false);
      });
  }, []);

  function openTemplateEditor(type: TemplateType) {
    if (type === "warn") {
      setDraftSubject(warnSubject || DEFAULT_WARN_SUBJECT);
      setDraftBody(warnBody || DEFAULT_WARN_BODY);
    } else {
      setDraftSubject(expiredSubject || DEFAULT_EXPIRED_SUBJECT);
      setDraftBody(expiredBody || DEFAULT_EXPIRED_BODY);
    }
    setEditingTemplate(type);
  }

  function insertVariable(variable: string) {
    setDraftBody((prev) => prev + variable);
  }

  async function saveTemplate() {
    if (!editingTemplate) return;
    setSavingTemplate(true);
    try {
      const body = editingTemplate === "warn"
        ? { expiryWarningSubject: draftSubject, expiryWarningBody: draftBody }
        : { expiredNotificationSubject: draftSubject, expiredNotificationBody: draftBody };
      const res = await fetch("/api/admin/notification-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      if (editingTemplate === "warn") {
        setWarnSubject(draftSubject);
        setWarnBody(draftBody);
      } else {
        setExpiredSubject(draftSubject);
        setExpiredBody(draftBody);
      }
      toast({ title: "Template saved" });
      setEditingTemplate(null);
    } catch {
      toast({ variant: "destructive", title: "Could not save template. Please try again." });
    } finally {
      setSavingTemplate(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/notification-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiryWarningEnabled: warnEnabled, expiryWarningDays: warnDays, expiredNotificationEnabled: expiredEnabled }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Settings saved" });
    } catch {
      toast({ variant: "destructive", title: "Settings could not be saved. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  const isWarn = editingTemplate === "warn";
  const variables = isWarn ? WARN_VARIABLES : EXPIRED_VARIABLES;
  const defaultSubject = isWarn ? DEFAULT_WARN_SUBJECT : DEFAULT_EXPIRED_SUBJECT;
  const defaultBody = isWarn ? DEFAULT_WARN_BODY : DEFAULT_EXPIRED_BODY;

  if (loading) return <div className="animate-pulse h-64 rounded-lg bg-muted" />;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Automated Notifications</h2>
        <p className="text-sm text-muted-foreground">Automatically email athletes about their membership status.</p>
      </div>

      {/* Expiry Warning */}
      <Card>
        <CardContent className="pt-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${warnEnabled ? "bg-amber-100" : "bg-muted"}`}>
                <Bell className={`h-4 w-4 ${warnEnabled ? "text-amber-600" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="font-medium text-sm">Expiry Warning</p>
                <p className="text-xs text-muted-foreground">Notify athletes before their membership expires</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                title="Edit email template"
                onClick={() => openTemplateEditor("warn")}
                className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setWarnEnabled((v) => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${warnEnabled ? "bg-primary" : "bg-input"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${warnEnabled ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
          </div>

          {warnEnabled && (
            <div className="ml-12 space-y-2">
              <p className="text-xs text-muted-foreground">Send warning email this many days before expiry:</p>
              <div className="flex items-center gap-2">
                <Input
                  type="number" min="1" max="90" value={warnDays}
                  onChange={(e) => setWarnDays(e.target.value)}
                  className="w-20 h-8 text-sm"
                />
                <span className="text-sm text-muted-foreground">days before expiry</span>
              </div>
              <p className="text-xs text-muted-foreground">
                For session-based memberships, the email will also include how many sessions remain.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expired Notification */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${expiredEnabled ? "bg-red-100" : "bg-muted"}`}>
                <BellOff className={`h-4 w-4 ${expiredEnabled ? "text-red-600" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="font-medium text-sm">Expired / Last Session</p>
                <p className="text-xs text-muted-foreground">Notify athletes when their membership ends or last session is used</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                title="Edit email template"
                onClick={() => openTemplateEditor("expired")}
                className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setExpiredEnabled((v) => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${expiredEnabled ? "bg-primary" : "bg-input"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${expiredEnabled ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} size="sm">
          {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
          {saving ? "Saving…" : "Save Settings"}
        </Button>
      </div>

      {/* Template Editor Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={(o) => { if (!o) setEditingTemplate(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Edit Template — {isWarn ? "Expiry Warning" : "Expired / Last Session"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Available variables */}
            <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Available variables</p>
              <div className="space-y-1">
                {variables.map((v) => (
                  <div key={v.key} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => insertVariable(v.key)}
                      className="font-mono text-xs bg-background border rounded px-1.5 py-0.5 hover:bg-primary hover:text-primary-foreground transition-colors shrink-0"
                    >
                      {v.key}
                    </button>
                    <span className="text-xs text-muted-foreground">{v.desc}</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">Click a variable to insert it at the end of the body, or type it manually anywhere.</p>
            </div>

            {/* Subject */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Subject</Label>
              <Input
                value={draftSubject}
                onChange={(e) => setDraftSubject(e.target.value)}
                placeholder={defaultSubject}
              />
            </div>

            {/* Body */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Body</Label>
                <button
                  type="button"
                  onClick={() => { setDraftSubject(defaultSubject); setDraftBody(defaultBody); }}
                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                >
                  Reset to default
                </button>
              </div>
              <Textarea
                value={draftBody}
                onChange={(e) => setDraftBody(e.target.value)}
                rows={12}
                className="font-mono text-sm resize-y"
                placeholder={defaultBody}
              />
              <p className="text-[11px] text-muted-foreground">Plain text. Line breaks are preserved.</p>
            </div>

            {/* Default template reference */}
            <details className="rounded-lg border">
              <summary className="px-3 py-2 text-xs font-medium cursor-pointer select-none text-muted-foreground hover:text-foreground">
                View default template (reference)
              </summary>
              <div className="px-3 pb-3 pt-1 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Subject:</p>
                <pre className="text-xs bg-muted rounded p-2 whitespace-pre-wrap">{defaultSubject}</pre>
                <p className="text-xs font-medium text-muted-foreground">Body:</p>
                <pre className="text-xs bg-muted rounded p-2 whitespace-pre-wrap">{defaultBody}</pre>
              </div>
            </details>
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setEditingTemplate(null)}>Cancel</Button>
            <Button onClick={saveTemplate} disabled={savingTemplate || !draftSubject.trim() || !draftBody.trim()}>
              {savingTemplate && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main client ─────────────────────────────────────────────────────────────

export function CommunicationsClient({ members, services }: { members: Member[]; services: Service[] }) {
  const [channel, setChannel] = useState<"email" | "sms">("email");
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [sportDropdownOpen, setSportDropdownOpen] = useState(false);
  const sportDropdownRef = useRef<HTMLDivElement>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("all");
  const [selectedMembers, setSelectedMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);
  const [history, setHistory] = useState<Broadcast[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/email/broadcast").then((r) => r.json()).then(setHistory).catch(() => {});
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (sportDropdownRef.current && !sportDropdownRef.current.contains(e.target as Node)) {
        setSportDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggleService(id: string) {
    setServiceIds((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
  }

  const filteredMembers = members.filter((m) => {
    const q = search.toLowerCase();
    return !selectedMembers.find((s) => s.id === m.id) && (
      m.firstName.toLowerCase().includes(q) ||
      m.lastName.toLowerCase().includes(q) ||
      (m.user?.email ?? "").toLowerCase().includes(q)
    );
  });

  function addMember(m: Member) {
    setSelectedMembers((prev) => [...prev, m]);
    setSearch("");
    searchRef.current?.focus();
  }

  function removeMember(id: string) {
    setSelectedMembers((prev) => prev.filter((m) => m.id !== id));
  }

  function loadBroadcast(b: Broadcast) {
    setChannel("email");
    setSubject(b.subject);
    setBody(b.body);
    setAudience(b.audience === "specific" ? "all" : b.audience);
    setSelectedMembers([]);
    setResult(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
    toast({ title: "Message loaded", description: "Edit and send again when ready." });
  }

  async function handleSend() {
    if (channel === "email" && (!subject.trim() || !body.trim())) {
      toast({ variant: "destructive", title: "Subject and message are required" });
      return;
    }
    if (channel === "sms" && !body.trim()) {
      toast({ variant: "destructive", title: "Message is required" });
      return;
    }
    if (audience === "specific" && selectedMembers.length === 0) {
      toast({ variant: "destructive", title: "Select at least one member" });
      return;
    }

    setSending(true);
    setResult(null);
    try {
      const endpoint = channel === "email" ? "/api/email/broadcast" : "/api/sms/broadcast";
      const payload = channel === "email"
        ? { subject, body, audience, memberIds: audience === "specific" ? selectedMembers.map((m) => m.id) : undefined, serviceIds: serviceIds.length > 0 ? serviceIds : undefined }
        : { message: body, audience, memberIds: audience === "specific" ? selectedMembers.map((m) => m.id) : undefined, serviceIds: serviceIds.length > 0 ? serviceIds : undefined };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send");
      setResult(data);
      toast({ title: `Sent to ${data.sent} member${data.sent !== 1 ? "s" : ""}` });
      if (data.sent > 0) {
        setSubject("");
        setBody("");
        setSelectedMembers([]);
        if (channel === "email") {
          fetch("/api/email/broadcast").then((r) => r.json()).then(setHistory).catch(() => {});
        }
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to send", description: err.message });
    } finally {
      setSending(false);
    }
  }

  const smsCharsLeft = 160 - body.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Communications</h1>
        <p className="text-muted-foreground">Send announcements and campaign emails or SMS to your members.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
      <div className="space-y-6">

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New Broadcast</CardTitle>
          <CardDescription>Compose and send a message to your selected audience.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Channel toggle */}
          <div className="space-y-1.5">
            <Label>Channel</Label>
            <div className="flex gap-2">
              <button
                onClick={() => { setChannel("email"); setResult(null); }}
                className={`flex-1 flex items-center justify-center gap-2 rounded-md border py-2 text-sm font-medium transition-colors ${channel === "email" ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}
              >
                <Mail className="h-4 w-4" /> Email
              </button>
              <button
                onClick={() => { setChannel("sms"); setSubject(""); setResult(null); }}
                className={`flex-1 flex items-center justify-center gap-2 rounded-md border py-2 text-sm font-medium transition-colors ${channel === "sms" ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}
              >
                <MessageSquare className="h-4 w-4" /> SMS
              </button>
            </div>
          </div>

          {/* Audience */}
          <div className="space-y-1.5">
            <Label>Audience</Label>
            <Select value={audience} onValueChange={(v) => { setAudience(v); setSelectedMembers([]); }}>
              <SelectTrigger>
                <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Members</SelectItem>
                <SelectItem value="active">Active Members Only</SelectItem>
                <SelectItem value="inactive">Inactive Members Only</SelectItem>
                <SelectItem value="specific">Specific Member(s)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sport filter */}
          <div className="space-y-1.5" ref={sportDropdownRef}>
            <Label>Sport / Membership</Label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setSportDropdownOpen((o) => !o)}
                className="w-full flex items-center justify-between rounded-md border px-3 py-2 text-sm bg-background hover:bg-accent transition-colors"
              >
                <span className="flex flex-wrap gap-1 flex-1 min-w-0">
                  {serviceIds.length === 0
                    ? <span className="text-muted-foreground">All Sports</span>
                    : serviceIds.map((id) => {
                        const s = services.find((s) => s.id === id);
                        return s ? (
                          <span key={id} className="inline-flex items-center gap-1 bg-muted rounded px-1.5 py-0.5 text-xs font-medium">
                            <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                            {s.name}
                          </span>
                        ) : null;
                      })}
                </span>
                <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 ml-2 transition-transform ${sportDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {sportDropdownOpen && (
                <div className="absolute z-10 mt-1 w-full rounded-md border bg-background shadow-lg">
                  <div className="p-1">
                    <button
                      type="button"
                      onClick={() => setServiceIds([])}
                      className="w-full flex items-center gap-2 rounded px-3 py-2 text-sm hover:bg-accent"
                    >
                      <div className={`h-4 w-4 rounded border flex items-center justify-center ${serviceIds.length === 0 ? "bg-primary border-primary" : "border-input"}`}>
                        {serviceIds.length === 0 && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      All Sports
                    </button>
                    {services.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleService(s.id)}
                        className="w-full flex items-center gap-2 rounded px-3 py-2 text-sm hover:bg-accent"
                      >
                        <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${serviceIds.includes(s.id) ? "bg-primary border-primary" : "border-input"}`}>
                          {serviceIds.includes(s.id) && <Check className="h-3 w-3 text-primary-foreground" />}
                        </div>
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {serviceIds.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Only members with an active subscription in the selected sport{serviceIds.length > 1 ? "s" : ""} will receive this message.
              </p>
            )}
          </div>

          {/* Member picker */}
          {audience === "specific" && (
            <div className="space-y-2">
              <Label>Select Members</Label>
              {selectedMembers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-2 rounded-md border bg-muted/30 min-h-[40px]">
                  {selectedMembers.map((m) => (
                    <Badge key={m.id} variant="secondary" className="gap-1 pr-1">
                      {m.firstName} {m.lastName}
                      <button onClick={() => removeMember(m.id)} className="hover:text-destructive ml-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input ref={searchRef} className="pl-9" placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              {search.length > 0 && (
                <div className="border rounded-md shadow-sm bg-background max-h-48 overflow-y-auto">
                  {filteredMembers.length === 0
                    ? <p className="text-sm text-muted-foreground px-3 py-2">No members found</p>
                    : filteredMembers.slice(0, 10).map((m) => (
                      <button key={m.id} onClick={() => addMember(m)} className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center justify-between gap-2">
                        <span className="font-medium">{m.firstName} {m.lastName}</span>
                        <span className="text-xs text-muted-foreground truncate">{m.user?.email}</span>
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Subject (email only) */}
          {channel === "email" && (
            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Input placeholder="e.g. Schedule update for July" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
          )}

          {/* Message */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Message</Label>
              {channel === "sms" && (
                <span className={`text-xs ${smsCharsLeft < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                  {smsCharsLeft < 0 ? `${Math.abs(smsCharsLeft)} over limit` : `${smsCharsLeft} chars left`}
                </span>
              )}
            </div>
            <Textarea
              placeholder={channel === "sms" ? "Write your SMS message (max 160 characters)..." : "Write your announcement here..."}
              className="min-h-[160px] resize-y"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            {channel === "sms" && (
              <p className="text-xs text-muted-foreground">Messages over 160 characters will be split into 2 SMS and charged double.</p>
            )}
          </div>

          {result && (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>Successfully sent to <strong>{result.sent}</strong> member{result.sent !== 1 ? "s" : ""}.{result.failed > 0 && ` ${result.failed} failed.`}</span>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={handleSend} disabled={sending || !body.trim() || (channel === "email" && !subject.trim()) || (channel === "sms" && smsCharsLeft < -80)}>
              {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              {sending ? "Sending..." : `Send ${channel === "sms" ? "SMS" : "Email"}`}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Past email broadcasts */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Past Email Broadcasts</CardTitle>
            <CardDescription>Click a message to expand it, or resend it.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {history.map((b) => (
                <div key={b.id} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-3 cursor-pointer" onClick={() => setExpandedId(expandedId === b.id ? null : b.id)}>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{b.subject}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {timeAgo(b.sentAt)} · {formatDate(b.sentAt)} · {AUDIENCE_LABEL[b.audience] ?? b.audience} · {b.recipientCount} sent
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={(e) => { e.stopPropagation(); loadBroadcast(b); }}>
                        <RotateCcw className="h-3 w-3" />Resend
                      </Button>
                      {expandedId === b.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </div>
                  {expandedId === b.id && (
                    <div className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap rounded-md bg-muted/40 p-3 border">{b.body}</div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      </div>{/* end left column */}

      {/* Right column — automated notifications */}
      <div className="lg:sticky lg:top-6">
        <NotificationSettings />
      </div>

      </div>{/* end grid */}
    </div>
  );
}
