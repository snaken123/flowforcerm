"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Users, UserCog, Dumbbell, CreditCard,
  LayoutDashboard, Mail, BarChart2, Calendar, LogOut, Menu, X, GraduationCap, IdCard, Settings, ChevronDown, Globe, ClipboardList, Megaphone, ShoppingBag, ShieldCheck, Lock
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
};

const mainNavItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["ADMIN", "STAFF", "MEMBER"] },
  { label: "Members", href: "/admin/members", icon: Users, roles: ["ADMIN", "STAFF", "STORE"] },
  { label: "Schedule", href: "/admin/schedule", icon: Calendar, roles: ["ADMIN", "STAFF"] },
  { label: "Reports", href: "/admin/reports", icon: BarChart2, roles: ["ADMIN"] },
  { label: "Store", href: "/admin/shop", icon: ShoppingBag, roles: ["ADMIN", "STAFF", "STORE"] },
  // Member-only
  { label: "Athlete ID", href: "/member/athlete-id", icon: IdCard, roles: ["MEMBER"] },
  { label: "My Profile", href: "/member/profile", icon: Users, roles: ["MEMBER"] },
  { label: "My Schedule", href: "/member/schedule", icon: Calendar, roles: ["MEMBER"] },
  { label: "My Billing", href: "/member/billing", icon: CreditCard, roles: ["MEMBER"] },
  { label: "Security", href: "/member/security", icon: Lock, roles: ["MEMBER"] },
  { label: "Privacy & Data", href: "/member/privacy", icon: ShieldCheck, roles: ["MEMBER"] },
];

const commsNavItems: NavItem[] = [
  { label: "Broadcast", href: "/admin/communications", icon: Megaphone, roles: ["ADMIN"] },
  { label: "Email", href: "/admin/email", icon: Mail, roles: ["ADMIN"] },
];

const settingsNavItems: NavItem[] = [
  { label: "Classes", href: "/admin/classes", icon: GraduationCap, roles: ["ADMIN"] },
  { label: "Memberships", href: "/admin/services", icon: Dumbbell, roles: ["ADMIN"] },
  { label: "Employees", href: "/admin/employees", icon: UserCog, roles: ["ADMIN"] },
  { label: "Subscriptions", href: "/admin/subscriptions", icon: CreditCard, roles: ["ADMIN"] },
  { label: "Web Integration", href: "/admin/web-integration", icon: Globe, roles: ["ADMIN"] },
  { label: "Activity Logs", href: "/admin/logs", icon: ClipboardList, roles: ["ADMIN", "STAFF"] },
  { label: "Customize", href: "/admin/settings", icon: Settings, roles: ["ADMIN"] },
];

export function Sidebar({ brandName, logoUrl }: { brandName?: string | null; logoUrl?: string | null }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [freeTrialCount, setFreeTrialCount] = useState(0);
  const [storePendingCount, setStorePendingCount] = useState(0);
  const role = (session?.user as any)?.role ?? "MEMBER";
  const employeeTypes: string[] = (session?.user as any)?.employeeTypes ?? [];
  const isCoachOnly = employeeTypes.length > 0 && !employeeTypes.includes("ADMIN") && !employeeTypes.includes("STAFF");
  const isStoreRole = role === "STORE";

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
  }, [role]);

  const commsHrefs = commsNavItems.map((i) => i.href);
  const commsActive = commsHrefs.some((h) => pathname === h || pathname.startsWith(h + "/"));
  const [commsOpen, setCommsOpen] = useState(commsActive);

  const settingsHrefs = settingsNavItems.map((i) => i.href);
  const settingsActive = settingsHrefs.some((h) => pathname === h || pathname.startsWith(h + "/"));
  const [settingsOpen, setSettingsOpen] = useState(settingsActive);

  const coachAllowedHrefs = ["/dashboard", "/admin/schedule"];
  const filteredMain = mainNavItems
    .filter((item) => item.roles.includes(role))
    .filter((item) => !isCoachOnly || coachAllowedHrefs.includes(item.href));
  const filteredComms = isCoachOnly ? [] : commsNavItems.filter((item) => item.roles.includes(role));
  const filteredSettings = isCoachOnly ? [] : settingsNavItems.filter((item) => item.roles.includes(role));

  const SubNavLink = ({ item }: { item: NavItem }) => {
    const active = pathname === item.href || pathname.startsWith(item.href + "/");
    return (
      <Link
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
  };

  const NavContent = () => (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b px-5">
        <img src={logoUrl || "/logo.png"} alt={brandName || "FlowForceRM"} className="h-8 w-8 object-contain rounded-full" />
        <div className="leading-none">
          <p className="text-sm font-bold tracking-widest">{brandName || "FlowForceRM"}</p>
          <p className="text-[10px] text-muted-foreground tracking-wider">Manage Less. Train More.</p>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {filteredMain.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const showBadge = (item.href === "/admin/members" && freeTrialCount > 0) || (item.href === "/admin/shop" && storePendingCount > 0);
          const badgeCount = item.href === "/admin/members" ? freeTrialCount : item.href === "/admin/shop" ? storePendingCount : 0;
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
        })}


        {/* Communications section */}
        {filteredComms.length > 0 && (
          <div className="pt-2">
            <button
              onClick={() => setCommsOpen((o) => !o)}
              className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <Mail className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">Communications</span>
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", commsOpen && "rotate-180")} />
            </button>
            {commsOpen && (
              <div className="mt-1 space-y-1 pl-3">
                {filteredComms.map((item) => <SubNavLink key={item.href} item={item} />)}
              </div>
            )}
          </div>
        )}

        {/* Settings section */}
        {filteredSettings.length > 0 && (
          <div className="pt-2">
            <button
              onClick={() => setSettingsOpen((o) => !o)}
              className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <Settings className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">Settings</span>
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", settingsOpen && "rotate-180")} />
            </button>
            {settingsOpen && (
              <div className="mt-1 space-y-1 pl-3">
                {filteredSettings.map((item) => <SubNavLink key={item.href} item={item} />)}
              </div>
            )}
          </div>
        )}
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
