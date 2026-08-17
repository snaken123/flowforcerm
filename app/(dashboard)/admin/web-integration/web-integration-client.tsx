"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Copy, Check, CalendarDays, Tag, Settings2, ChevronDown, ChevronRight, GripVertical, ArrowUpDown, UserPlus, Pencil } from "lucide-react";
import { toast } from "@/lib/use-toast";

type Package = { id: string; name: string; sessions: number | null; validDays: number; memberPrice: number | null };
type Service = { id: string; name: string; color: string | null; packages: Package[] };

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <Button size="sm" variant="outline" onClick={copy} className="shrink-0">
      {copied ? <Check className="h-3.5 w-3.5 mr-1.5 text-green-600" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

function IntegrationCard({
  icon, title, description, directUrl, embedCode, settingsSlot,
}: {
  icon: React.ReactNode; title: string; description: string;
  directUrl: string; embedCode: string; settingsSlot?: React.ReactNode;
}) {
  const [tab, setTab] = useState<"link" | "embed">("link");
  return (
    <Card>
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">{icon}{title}</CardTitle>
          {settingsSlot}
        </div>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
        <div className="flex gap-0 mt-4 border-b">
          {(["link", "embed"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}>
              {t === "link" ? "Direct Link" : "Embed Code"}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-3">
        {tab === "link" ? (
          <>
            <div className="flex items-center gap-2">
              <Input value={directUrl} readOnly className="font-mono text-sm bg-muted" />
              <CopyButton text={directUrl} />
            </div>
            <a href={directUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center text-sm text-blue-600 hover:underline">
              Preview in new tab →
            </a>
          </>
        ) : (
          <>
            <pre className="bg-muted rounded-md p-4 text-xs font-mono overflow-x-auto whitespace-pre">{embedCode}</pre>
            <CopyButton text={embedCode} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ServiceRow({
  service, draftPkgIds, onTogglePkg,
}: {
  service: Service;
  draftPkgIds: Set<string>;
  onTogglePkg: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const pkgIds = service.packages.map((p) => p.id);
  const checkedCount = pkgIds.filter((id) => draftPkgIds.has(id)).length;
  const allChecked = checkedCount === pkgIds.length;
  const someChecked = checkedCount > 0 && !allChecked;

  function toggleAll() {
    if (allChecked) pkgIds.forEach((id) => onTogglePkg(id));
    else pkgIds.filter((id) => !draftPkgIds.has(id)).forEach((id) => onTogglePkg(id));
  }

  return (
    <div>
      <div className="flex items-center gap-2 py-2 px-1">
        <input
          type="checkbox"
          checked={allChecked}
          ref={(el) => { if (el) el.indeterminate = someChecked; }}
          onChange={toggleAll}
          className="h-4 w-4 rounded border-gray-300 accent-primary shrink-0"
        />
        <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 flex-1 text-left">
          <span className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
            style={{ backgroundColor: service.color ?? "#6b7280" }} />
          <span className="text-sm font-semibold">{service.name}</span>
          <span className="text-xs text-muted-foreground ml-auto">
            {checkedCount}/{pkgIds.length}
          </span>
          {open
            ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
        </button>
      </div>
      {open && (
        <div className="ml-6 border-l pl-3 mb-1 space-y-0.5">
          {service.packages.map((pkg) => (
            <label key={pkg.id}
              className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer">
              <input
                type="checkbox"
                checked={draftPkgIds.has(pkg.id)}
                onChange={() => onTogglePkg(pkg.id)}
                className="h-4 w-4 rounded border-gray-300 accent-primary shrink-0"
              />
              <div className="flex-1 min-w-0">
                <span className="text-sm">{pkg.name}</span>
                <span className="text-xs text-muted-foreground ml-2">
                  {pkg.sessions != null ? `${pkg.sessions} session${pkg.sessions !== 1 ? "s" : ""}` : "Unlimited"}
                  {" · "}{pkg.validDays}d
                </span>
              </div>
              <span className="text-xs font-medium text-muted-foreground shrink-0">
                {pkg.memberPrice === null ? "—" : pkg.memberPrice === 0 ? "FREE" : `₱${pkg.memberPrice.toLocaleString()}`}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// Drag-to-reorder list
function ReorderList({
  items,
  onReorder,
}: {
  items: Service[];
  onReorder: (items: Service[]) => void;
}) {
  const dragIndex = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  function onDragStart(i: number) {
    dragIndex.current = i;
  }

  function onDragEnter(i: number) {
    setDragOver(i);
    if (dragIndex.current === null || dragIndex.current === i) return;
    const next = [...items];
    const [moved] = next.splice(dragIndex.current, 1);
    next.splice(i, 0, moved);
    dragIndex.current = i;
    onReorder(next);
  }

  function onDragEnd() {
    dragIndex.current = null;
    setDragOver(null);
  }

  return (
    <div className="space-y-1.5">
      {items.map((s, i) => (
        <div
          key={s.id}
          draggable
          onDragStart={() => onDragStart(i)}
          onDragEnter={() => onDragEnter(i)}
          onDragEnd={onDragEnd}
          onDragOver={(e) => e.preventDefault()}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border bg-card select-none transition-colors ${
            dragOver === i ? "border-primary/50 bg-primary/5" : "border-border"
          }`}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing shrink-0" />
          <span
            className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
            style={{ backgroundColor: s.color ?? "#6b7280" }}
          />
          <span className="text-sm font-medium flex-1">{s.name}</span>
          <span className="text-xs text-muted-foreground">{s.packages.length} pkg{s.packages.length !== 1 ? "s" : ""}</span>
        </div>
      ))}
    </div>
  );
}

const DEFAULT_WELCOME = "Join FlowForceRM for a FREE trial class! Try Yoga, Judo, or Brazilian Jiujitsu — no experience needed. Sign up below and we'll send you a link to reserve your spot.";

function RegistrationCard({ baseUrl }: { baseUrl: string }) {
  const [welcomeMsg, setWelcomeMsg] = useState(DEFAULT_WELCOME);
  const [editMsg, setEditMsg] = useState("");
  const [showEdit, setShowEdit] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings/registration")
      .then((r) => r.json())
      .then((d) => setWelcomeMsg(d.message ?? DEFAULT_WELCOME));
  }, []);

  function openEdit() { setEditMsg(welcomeMsg); setShowEdit(true); }

  async function saveMessage() {
    setSaving(true);
    try {
      await fetch("/api/admin/settings/registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: editMsg }),
      });
      setWelcomeMsg(editMsg);
      setShowEdit(false);
      toast({ title: "Welcome message saved" });
    } catch {
      toast({ variant: "destructive", title: "Failed to save" });
    } finally {
      setSaving(false);
    }
  }

  const directUrl = `${baseUrl}/register/widget`;
  const embedCode = `<!-- FlowForceRM Free Trial Registration Button -->
<script>
(function() {
  var btn = document.createElement('button');
  btn.innerText = 'Register for Free Trial';
  btn.style.cssText = 'background:#111;color:#fff;padding:14px 28px;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;';
  btn.onclick = function() {
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
    var iframe = document.createElement('iframe');
    iframe.src = '${directUrl}';
    iframe.style.cssText = 'width:100%;max-width:480px;height:580px;border:none;border-radius:16px;';
    var close = document.createElement('button');
    close.innerText = '✕';
    close.style.cssText = 'position:absolute;top:16px;right:16px;background:rgba(255,255,255,0.15);color:#fff;border:none;width:36px;height:36px;border-radius:50%;font-size:18px;cursor:pointer;';
    close.onclick = function() { document.body.removeChild(overlay); };
    overlay.appendChild(iframe);
    overlay.appendChild(close);
    document.body.appendChild(overlay);
  };
  document.currentScript.parentNode.insertBefore(btn, document.currentScript);
})();
</script>`;

  return (
    <>
      <IntegrationCard
        icon={<UserPlus className="h-4 w-4" />}
        title="Free Trial Registration"
        description="Add a registration button to your website so new visitors can sign up for a free class."
        directUrl={directUrl}
        embedCode={embedCode}
        settingsSlot={
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={openEdit} title="Edit welcome message">
            <Pencil className="h-4 w-4" />
          </Button>
        }
      />

      {/* Welcome message editor */}
      <Dialog open={showEdit} onOpenChange={(o) => !o && setShowEdit(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Welcome Message</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">
            This message appears at the top of the registration form on your website.
          </p>
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea value={editMsg} onChange={(e) => setEditMsg(e.target.value)}
              rows={4} className="resize-none text-sm" />
            <p className="text-xs text-muted-foreground">{editMsg.length} characters</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button onClick={saveMessage} disabled={saving || !editMsg.trim()}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function WebIntegrationClient({ services, baseUrl }: { services: Service[]; baseUrl: string }) {
  const servicesWithPkgs = useMemo(() => services.filter((s) => s.packages.length > 0), [services]);
  const allPkgIds = useMemo(() => services.flatMap((s) => s.packages.map((p) => p.id)), [services]);

  const defaultOrder = useMemo(
    () => [...servicesWithPkgs].sort((a, b) => b.packages.length - a.packages.length),
    [servicesWithPkgs]
  );

  // Restore visibility from localStorage, falling back to all selected
  const [selectedPkgIds, setSelectedPkgIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set(allPkgIds);
    try {
      const saved = localStorage.getItem("pricelist_packages");
      if (saved) {
        const ids = JSON.parse(saved) as string[];
        // Only keep ids that still exist
        const valid = ids.filter((id) => allPkgIds.includes(id));
        if (valid.length > 0) return new Set(valid);
      }
    } catch {}
    return new Set(allPkgIds);
  });

  // Restore card order from localStorage, falling back to default
  const [cardOrder, setCardOrder] = useState<Service[]>(() => {
    if (typeof window === "undefined") return defaultOrder;
    try {
      const saved = localStorage.getItem("pricelist_order");
      if (saved) {
        const ids = JSON.parse(saved) as string[];
        const byId = Object.fromEntries(servicesWithPkgs.map((s) => [s.id, s]));
        const restored = ids.map((id) => byId[id]).filter(Boolean) as Service[];
        // Append any new services not in saved order
        const missing = servicesWithPkgs.filter((s) => !ids.includes(s.id));
        if (restored.length > 0) return [...restored, ...missing];
      }
    } catch {}
    return defaultOrder;
  });

  const [showPriceSettings, setShowPriceSettings] = useState(false);
  const [draftPkgIds, setDraftPkgIds] = useState<Set<string>>(new Set());
  const [showReorder, setShowReorder] = useState(false);
  const [draftOrder, setDraftOrder] = useState<Service[]>([]);

  // Hydrate from DB on mount (overrides localStorage if DB has a value)
  useEffect(() => {
    fetch("/api/admin/settings/pricelist")
      .then((r) => r.json())
      .then((data) => {
        if (data.packages) {
          try {
            const ids = JSON.parse(data.packages) as string[];
            const valid = ids.filter((id) => allPkgIds.includes(id));
            if (valid.length > 0) setSelectedPkgIds(new Set(valid));
          } catch {}
        }
        if (data.order) {
          try {
            const ids = JSON.parse(data.order) as string[];
            const byId = Object.fromEntries(servicesWithPkgs.map((s) => [s.id, s]));
            const restored = ids.map((id) => byId[id]).filter(Boolean) as Service[];
            const missing = servicesWithPkgs.filter((s) => !ids.includes(s.id));
            if (restored.length > 0) setCardOrder([...restored, ...missing]);
          } catch {}
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openSettings() {
    setDraftPkgIds(new Set(selectedPkgIds));
    setShowPriceSettings(true);
  }

  function togglePkg(id: string) {
    setDraftPkgIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function applySettings() {
    setSelectedPkgIds(new Set(draftPkgIds));
    const value = JSON.stringify([...draftPkgIds]);
    try { localStorage.setItem("pricelist_packages", value); } catch {}
    fetch("/api/admin/settings/pricelist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packages: value }),
    }).catch(() => {});
    setShowPriceSettings(false);
  }

  function openReorder() {
    setDraftOrder([...cardOrder]);
    setShowReorder(true);
  }

  function applyOrder() {
    setCardOrder([...draftOrder]);
    const value = JSON.stringify(draftOrder.map((s) => s.id));
    try { localStorage.setItem("pricelist_order", value); } catch {}
    fetch("/api/admin/settings/pricelist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: value }),
    }).catch(() => {});
    setShowReorder(false);
  }

  const pricelistUrl = useMemo(() => {
    const allSelected = selectedPkgIds.size === allPkgIds.length;
    const isDefaultOrder = cardOrder.every((s, i) => s.id === defaultOrder[i]?.id);

    const params = new URLSearchParams();
    if (!allSelected) params.set("packages", [...selectedPkgIds].join(","));
    if (!isDefaultOrder) params.set("order", cardOrder.map((s) => s.id).join(","));
    const qs = params.toString();
    return `${baseUrl}/embed/pricelist${qs ? "?" + qs : ""}`;
  }, [selectedPkgIds, allPkgIds.length, cardOrder, defaultOrder]);

  const pricelistEmbed = `<iframe\n  src="${pricelistUrl}"\n  width="100%"\n  height="800"\n  style="border:none;border-radius:8px;"\n  title="FlowForceRM — Membership Pricing"\n></iframe>`;

  const scheduleUrl = `${baseUrl}/embed/schedule`;
  const scheduleEmbed = `<iframe\n  src="${scheduleUrl}"\n  width="100%"\n  height="600"\n  style="border:none;border-radius:8px;"\n  title="FlowForceRM — Class Schedule"\n></iframe>`;

  const hiddenCount = allPkgIds.length - selectedPkgIds.size;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Web Integration</h1>
        <p className="text-sm text-muted-foreground mt-1">Embed or link your content on your website.</p>
      </div>

      <IntegrationCard
        icon={<CalendarDays className="h-4 w-4" />}
        title="Class Schedule"
        description="Share your weekly class schedule or embed it directly on your website."
        directUrl={scheduleUrl}
        embedCode={scheduleEmbed}
      />

      <RegistrationCard baseUrl={baseUrl} />

      <IntegrationCard
        icon={<Tag className="h-4 w-4" />}
        title="Membership Pricing"
        description="Share a live pricing page or embed it on your website. Updates automatically when you change your packages."
        directUrl={pricelistUrl}
        embedCode={pricelistEmbed}
        settingsSlot={
          <div className="flex items-center gap-1">
            {/* Reorder icon */}
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={openReorder} title="Arrange card order">
              <ArrowUpDown className="h-4 w-4" />
              <span className="sr-only">Arrange card order</span>
            </Button>
            {/* Visibility icon */}
            <div className="relative">
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={openSettings} title="Configure visible rates">
                <Settings2 className="h-4 w-4" />
                <span className="sr-only">Configure visible rates</span>
              </Button>
              {hiddenCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center font-bold pointer-events-none">
                  {hiddenCount}
                </span>
              )}
            </div>
          </div>
        }
      />

      {/* Visibility settings modal */}
      <Dialog open={showPriceSettings} onOpenChange={(o) => !o && setShowPriceSettings(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Visible Rates</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">
            Check the packages you want to show publicly. Uncheck to hide.
          </p>
          <div className="max-h-80 overflow-y-auto divide-y divide-border -mx-1 px-1">
            {servicesWithPkgs.map((s) => (
              <ServiceRow key={s.id} service={s} draftPkgIds={draftPkgIds} onTogglePkg={togglePkg} />
            ))}
          </div>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setShowPriceSettings(false)}>Cancel</Button>
            <Button onClick={applySettings} disabled={draftPkgIds.size === 0}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reorder modal */}
      <Dialog open={showReorder} onOpenChange={(o) => !o && setShowReorder(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Arrange Cards</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">
            Drag to reorder how the pricing cards appear on the page.
          </p>
          <div className="max-h-80 overflow-y-auto py-1">
            <ReorderList items={draftOrder} onReorder={setDraftOrder} />
          </div>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setShowReorder(false)}>Cancel</Button>
            <Button onClick={applyOrder}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
