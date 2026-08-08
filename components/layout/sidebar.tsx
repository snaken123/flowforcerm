"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Users, UserCog, Dumbbell, CreditCard,
  LayoutDashboard, Mail, BarChart2, Calendar, LogOut, Menu, X, GraduationCap, IdCard, Settings, ChevronDown, Globe, ClipboardList, Megaphone, ShoppingBag, ShieldCheck, Lock, ListChecks
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "next-auth/react";
import { useState, useEffect, lazy, Suspense } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const QRScannerDialog = lazy(() =>
  import("@/app/(dashboard)/admin/members/qr-scanner-dialog").then(m => ({ default: m.QRScannerDialog }))
);
import { getInitials } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: string[];
  exact?: boolean; // skip prefix-matching for active-highlight (needed when another sibling's href starts with this one's)
  requiresCoach?: boolean; // only ADMIN or a COACH-tagged STAFF may see this item, even if role alone would qualify
};

type NavEntry =
  | { type: "link"; item: NavItem }
  | { type: "group"; key: string; label: string; icon: React.ElementType; items: NavItem[]; hiddenForCoachOnly?: boolean };

// One ordered list (instead of separate "main" + "collapsible" arrays rendered in two
// passes) so a group can sit in its natural position relative to surrounding links --
// e.g. Schedule between Members and Reports -- rather than always trailing after every
// flat link regardless of where it conceptually belongs.
const navEntries: NavEntry[] = [
  { type: "link", item: { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["ADMIN", "STAFF", "MEMBER"] } },
  { type: "link", item: { label: "Members", href: "/admin/members", icon: Users, roles: ["ADMIN", "STAFF", "STORE"] } },
  {
    type: "group", key: "schedule", label: "Schedule", icon: Calendar,
    items: [
      { label: "Class Schedule", href: "/admin/schedule", icon: Calendar, roles: ["ADMIN", "STAFF"], exact: true },
      { label: "Training Plan", href: "/admin/schedule/training-plan", icon: ListChecks, roles: ["ADMIN", "STAFF"] },
    ],
  },
  { type: "link", item: { label: "To Do", href: "/admin/records-todo", icon: ListChecks, roles: ["ADMIN", "STAFF"] } },
  { type: "link", item: { label: "Reports", href: "/admin/reports", icon: BarChart2, roles: ["ADMIN"] } },
  { type: "link", item: { label: "Store", href: "/admin/store", icon: ShoppingBag, roles: ["ADMIN", "STAFF", "STORE"] } },
  // Member-only
  { type: "link", item: { label: "Athlete ID", href: "/member/athlete-id", icon: IdCard, roles: ["MEMBER"] } },
  { type: "link", item: { label: "My Profile", href: "/member/profile", icon: Users, roles: ["MEMBER"] } },
  {
    type: "group", key: "member-schedule", label: "My Schedule", icon: Calendar,
    items: [
      { label: "Available Classes", href: "/member/schedule", icon: Calendar, roles: ["MEMBER"], exact: true },
      { label: "Training Plan", href: "/member/schedule/training-plan", icon: ListChecks, roles: ["MEMBER"] },
    ],
  },
  { type: "link", item: { label: "My Billing", href: "/member/billing", icon: CreditCard, roles: ["MEMBER"] } },
  { type: "link", item: { label: "Security", href: "/member/security", icon: Lock, roles: ["MEMBER"] } },
  { type: "link", item: { label: "Privacy & Data", href: "/member/privacy", icon: ShieldCheck, roles: ["MEMBER"] } },
  {
    type: "group", key: "comms", label: "Communications", icon: Mail, hiddenForCoachOnly: true,
    items: [
      { label: "Broadcast", href: "/admin/communications", icon: Megaphone, roles: ["ADMIN"] },
      { label: "Email", href: "/admin/email", icon: Mail, roles: ["ADMIN"] },
    ],
  },
  {
    type: "group", key: "settings", label: "Settings", icon: Settings, hiddenForCoachOnly: true,
    items: [
      { label: "Employees", href: "/admin/employees", icon: UserCog, roles: ["ADMIN"] },
      { label: "Memberships", href: "/admin/services", icon: Dumbbell, roles: ["ADMIN"] },
      { label: "Classes", href: "/admin/classes", icon: GraduationCap, roles: ["ADMIN"] },
      { label: "Web Integration", href: "/admin/web-integration", icon: Globe, roles: ["ADMIN"] },
      { label: "Customize", href: "/admin/settings", icon: Settings, roles: ["ADMIN"] },
      { label: "Activity Logs", href: "/admin/logs", icon: ClipboardList, roles: ["ADMIN", "STAFF"] },
    ],
  },
];

export function Sidebar({ brandName, logoUrl, slogan }: { brandName?: string | null; logoUrl?: string | null; slogan?: string | null }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [freeTrialCount, setFreeTrialCount] = useState(0);
  const [storePendingCount, setStorePendingCount] = useState(0);
  const [recordsPendingCount, setRecordsPendingCount] = useState(0);
  const [pendingReceiptsCount, setPendingReceiptsCount] = useState(0);
  const role = (session?.user as any)?.role ?? "MEMBER";
  const employeeTypes: string[] = (session?.user as any)?.employeeTypes ?? [];
  const isCoachOnly = employeeTypes.length > 0 && !employeeTypes.includes("ADMIN") && !employeeTypes.includes("STAFF");
  const isCoach = employeeTypes.includes("COACH");
  const isAdminOrCoach = role === "ADMIN" || (role === "STAFF" && isCoach);
  const isStoreRole = role === "STORE";

  // These badges are re-fetched on every route change (not just once on mount) since the
  // sidebar stays mounted across client-side navigations — without `pathname` as a
  // dependency, a badge would only ever reflect whatever was true when the page first
  // loaded, going stale the moment the user does something elsewhere in the app.
  useEffect(() => {
    if (!["ADMIN", "STAFF", "STORE"].includes(role)) return;
    if (["ADMIN", "STAFF"].includes(role)) {
      fetch("/api/admin/free-trial-leads")
        .then((r) => r.json())
        .then((d) => setFreeTrialCount(d.count ?? 0))
        .catch(() => {});
    }
    fetch("/api/admin/store-pending")
      .then((r) => r.json())
      .then((d) => setStorePendingCount(d.count ?? 0))
      .catch(() => {});
  }, [role, pathname]);

  useEffect(() => {
    if (!isAdminOrCoach) return;
    fetch("/api/admin/records-pending-count")
      .then((r) => r.json())
      .then((d) => setRecordsPendingCount(d.count ?? 0))
      .catch(() => {});
  }, [isAdminOrCoach, pathname]);

  useEffect(() => {
    if (!["ADMIN", "STAFF"].includes(role)) return;
    fetch("/api/admin/pending-receipts-count")
      .then((r) => r.json())
      .then((d) => setPendingReceiptsCount(d.count ?? 0))
      .catch(() => {});
  }, [role, pathname]);

  const badgeCounts: Record<string, number> = {
    "/admin/members": freeTrialCount,
    "/admin/store": storePendingCount,
    "/admin/records-todo": recordsPendingCount + pendingReceiptsCount,
  };

  const isEntryActive = (item: NavItem) => (item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/"));

  // isCoachOnly (pure coaches, no ADMIN/STAFF employeeType tag) keep Dashboard, To Do,
  // both Schedule groups, and any item flagged requiresCoach, but never see Comms/Settings.
  const coachAllowedHrefs = [
    "/dashboard",
    "/admin/records-todo",
    ...navEntries.filter((e): e is Extract<NavEntry, { type: "link" }> => e.type === "link" && !!e.item.requiresCoach).map((e) => e.item.href),
  ];
  const visibleEntries = navEntries
    .map((entry) => {
      if (entry.type === "link") return entry;
      const items = entry.items.filter((item) => item.roles.includes(role));
      return { ...entry, items };
    })
    .filter((entry) => {
      if (entry.type === "link") {
        if (!entry.item.roles.includes(role)) return false;
        if (entry.item.requiresCoach && !isAdminOrCoach) return false;
        if (isCoachOnly && !coachAllowedHrefs.includes(entry.item.href)) return false;
        return true;
      }
      if (entry.items.length === 0) return false;
      if (isCoachOnly && entry.hiddenForCoachOnly) return false;
      return true;
    });

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const entry of navEntries) {
      if (entry.type === "group") {
        initial[entry.key] = entry.items.some((item) => isEntryActive(item));
      }
    }
    return initial;
  });
  const toggleGroup = (key: string) => setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));

  const NavContent = () => (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b px-5">
        <img src={logoUrl || "/logo.png"} alt={brandName || "FlowForceRM"} className="h-8 w-8 object-contain rounded-full" />
        <div className="leading-none">
          <p className="text-sm font-bold tracking-widest">{brandName || "FlowForceRM"}</p>
          <p className="text-[10px] text-muted-foreground tracking-wider">{slogan || "Manage Less. Train More."}</p>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {visibleEntries.map((entry) => {
          if (entry.type === "link") {
            const item = entry.item;
            const active = isEntryActive(item);
            const badgeCount = badgeCounts[item.href] ?? 0;
            const showBadge = badgeCount > 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {showBadge && (
                  <span className="h-5 min-w-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {badgeCount}
                  </span>
                )}
              </Link>
            );
          }

          const open = !!openGroups[entry.key];
          return (
            <div key={entry.key} className="pt-2">
              <button
                onClick={() => toggleGroup(entry.key)}
                className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <entry.icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left">{entry.label}</span>
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
              </button>
              {open && (
                <div className="mt-1 space-y-1 pl-3">
                  {entry.items.map((item) => {
                    const active = isEntryActive(item);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          active
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={session?.user?.image ?? ""} />
            <AvatarFallback className="text-xs">
              {getInitials(session?.user?.name ?? session?.user?.email)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{session?.user?.name ?? "User"}</p>
            <p className="text-xs text-muted-foreground capitalize">{role.toLowerCase()}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r bg-background h-screen sticky top-0">
        <NavContent />
      </aside>

      {/* Mobile toggle */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 rounded-md border bg-background p-2 shadow"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="w-60 bg-background border-r shadow-xl">
            <NavContent />
          </div>
          <div className="flex-1 bg-black/50" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {showQR && (
        <Suspense fallback={null}>
          <QRScannerDialog open={showQR} onClose={() => setShowQR(false)} />
        </Suspense>
      )}
    </>
  );
}
