"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Phone, Mail, AlertTriangle, Award, Calendar, CreditCard, CheckSquare, Plus, Loader2, Snowflake, Trash2, Pencil, MapPin, Cake, Camera, X, CheckCircle2, Users, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { formatDate, formatCurrency, timeAgo, getInitials } from "@/lib/utils";
import { toast } from "@/lib/use-toast";
import { useTenantTimezone } from "@/components/tenant-timezone-provider";
import { getUtcOffsetString } from "@/lib/timezone-offset";
import { MEMBER_SOURCE_OPTIONS } from "@/lib/member-source";

const STATUS_COLORS: Record<string, any> = {
  ACTIVE: "success", FROZEN: "warning", INACTIVE: "secondary", CANCELLED: "destructive",
};

const SUB_STATUS_COLORS: Record<string, any> = {
  ACTIVE: "success", PAUSED: "warning", EXPIRED: "secondary", CANCELLED: "destructive",
};

export function MemberDetailClient({ member, services, isAdmin, isStaff }: { member: any; services: any[]; isAdmin: boolean; isStaff?: boolean }) {
  const router = useRouter();
  const timeZone = useTenantTimezone();
  const [status, setStatus] = useState(member.status);
  const [saving, setSaving] = useState(false);

  // Keep local status in sync when server data refreshes
  if (status !== member.status && !saving) setStatus(member.status);


  // Edit profile
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editForm, setEditForm] = useState({
    memberNumber: member.memberNumber ?? "",
    firstName: member.firstName,
    lastName: member.lastName,
    email: member.user?.email ?? "",
    gender: member.gender ?? "",
    phone: member.phone ?? "",
    dateOfBirth: member.dateOfBirth ? new Date(member.dateOfBirth).toLocaleDateString("en-CA", { timeZone }) : "",
    address: member.address ?? "",
    source: member.source ?? "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  // Guardian linking
  const [showGuardianDialog, setShowGuardianDialog] = useState(false);
  const [guardianSearch, setGuardianSearch] = useState("");
  const [guardianResults, setGuardianResults] = useState<any[]>([]);
  const [guardianSearching, setGuardianSearching] = useState(false);
  const [guardianMode, setGuardianMode] = useState<"search" | "create">("search");
  const [newGuardianName, setNewGuardianName] = useState("");
  const [newGuardianEmail, setNewGuardianEmail] = useState("");
  const [savingGuardian, setSavingGuardian] = useState(false);
  const [currentGuardian, setCurrentGuardian] = useState<{ id: string; name: string | null; email: string } | null>(
    member.guardian ?? null
  );

  async function searchGuardians(q: string) {
    setGuardianSearch(q);
    if (!q.trim()) { setGuardianResults([]); return; }
    setGuardianSearching(true);
    try {
      const res = await fetch(`/api/guardian?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setGuardianResults(data);
    } finally {
      setGuardianSearching(false);
    }
  }

  async function linkGuardian(userId: string) {
    setSavingGuardian(true);
    try {
      const res = await fetch(`/api/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guardianUserId: userId }),
      });
      if (!res.ok) throw new Error("Failed to link guardian");
      const found = guardianResults.find((u) => u.id === userId);
      if (found) setCurrentGuardian({ id: found.id, name: found.name, email: found.email });
      setShowGuardianDialog(false);
      toast({ title: "Guardian linked successfully" });
    } catch {
      toast({ title: "Failed to link guardian", variant: "destructive" });
    } finally {
      setSavingGuardian(false);
    }
  }

  async function createAndLinkGuardian() {
    if (!newGuardianName.trim() || !newGuardianEmail.trim()) return;
    setSavingGuardian(true);
    try {
      const res = await fetch("/api/guardian", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newGuardianName, email: newGuardianEmail }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to create guardian");
      }
      const { user, tempPassword } = await res.json();
      await linkGuardian(user.id);
      toast({ title: `Guardian account created`, description: `Temp password: ${tempPassword}` });
    } catch (e: any) {
      toast({ title: e.message ?? "Error", variant: "destructive" });
    } finally {
      setSavingGuardian(false);
    }
  }

  async function removeGuardian() {
    setSavingGuardian(true);
    try {
      await fetch(`/api/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guardianUserId: null }),
      });
      setCurrentGuardian(null);
      toast({ title: "Guardian removed" });
    } catch {
      toast({ title: "Failed to remove guardian", variant: "destructive" });
    } finally {
      setSavingGuardian(false);
    }
  }

  function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function saveProfile() {
    setSavingProfile(true);
    try {
      let photoUrl: string | undefined;
      if (photoFile) {
        const fd = new FormData();
        fd.append("file", photoFile);
        fd.append("memberId", member.id);
        const upRes = await fetch("/api/upload", { method: "POST", body: fd });
        if (!upRes.ok) throw new Error("Upload failed");
        const upData = await upRes.json();
        photoUrl = upData.url;
      }
      const res = await fetch(`/api/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: editForm.firstName,
          lastName: editForm.lastName,
          email: editForm.email || null,
          gender: editForm.gender || null,
          phone: editForm.phone || null,
          dateOfBirth: editForm.dateOfBirth || null,
          address: editForm.address || null,
          source: editForm.source || null,
          ...(photoUrl ? { photoUrl } : {}),
        }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); console.error("saveProfile error", err); throw new Error(); }
      toast({ title: "Profile updated" });
      setShowEditProfile(false);
      setPhotoFile(null);
      setPhotoPreview(null);
      router.refresh();
    } catch {
      toast({ variant: "destructive", title: "Could not save profile" });
    } finally {
      setSavingProfile(false);
    }
  }

  // Rank management
  const [rankDialog, setRankDialog] = useState<{ mode: "add"; art: string } | { mode: "edit"; record: any } | null>(null);
  const [rankForm, setRankForm] = useState({ martialArt: "", rank: "", stripes: "", awardedAt: "", awardedBy: "" });
  const [savingRank, setSavingRank] = useState(false);
  const [deletingRank, setDeletingRank] = useState<any | null>(null);
  const [deletingRankConfirm, setDeletingRankConfirm] = useState(false);

  // Check-in modal
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [todaySchedule, setTodaySchedule] = useState<any[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<any | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [forceCheckIn, setForceCheckIn] = useState<{ checkedInAt: string } | null>(null);

  const nowTs = Date.now();

  // All active/paused subs that have already started and not yet expired
  const activeSubs = member.subscriptions
    .filter((s: any) =>
      (s.status === "ACTIVE" || s.status === "PAUSED") &&
      new Date(s.startDate).getTime() <= nowTs &&
      (!s.endDate || new Date(s.endDate).getTime() >= nowTs)
    )
    .sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  const memberServiceIds = new Set<string>(activeSubs.map((s: any) => s.service.id as string));

  // For a given serviceId, find the oldest sub that still has sessions (FIFO queue)
  function nextSubForService(serviceId: string) {
    return activeSubs.find(
      (s: any) =>
        s.service.id === serviceId &&
        (s.sessionsTotal === null || s.sessionsUsed < s.sessionsTotal)
    ) ?? null;
  }

  // A service is exhausted only when there's no remaining sub with sessions left
  const exhaustedServiceIds = new Set(
    [...memberServiceIds].filter((id) => nextSubForService(id) === null)
  );

  async function openCheckIn() {
    setShowCheckIn(true);
    setSelectedSchedule(null);
    setScheduleLoading(true);
    try {
      const res = await fetch("/api/schedule/today");
      const data = await res.json();
      // Only show classes that the member's active subscriptions allow
      const allowed = data.filter((slot: any) =>
        slot.classDef.allowedServices.length === 0 ||
        slot.classDef.allowedServices.some((as: any) => memberServiceIds.has(as.serviceId))
      );
      setTodaySchedule(allowed);
    } catch {
      setTodaySchedule([]);
    } finally {
      setScheduleLoading(false);
    }
  }

  function formatTime(t: string) {
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
  }

  async function submitCheckIn(force = false) {
    if (!selectedSchedule) return;
    // Find the allowed service IDs for this class slot
    const allowedSvcIds: string[] = selectedSchedule.classDef.allowedServices.map((as: any) => as.serviceId);
    // Pick the oldest sub with sessions remaining (FIFO across packs)
    const matchedSub = allowedSvcIds.length === 0
      ? activeSubs.find((s: any) => s.sessionsTotal === null || s.sessionsUsed < s.sessionsTotal) ?? activeSubs[0] ?? null
      : allowedSvcIds.reduce((found: any, svcId: string) => found ?? nextSubForService(svcId), null);

    if (!matchedSub) {
      toast({ variant: "destructive", title: "No sessions remaining", description: "This member has used all sessions for this class." });
      return;
    }
    setCheckingIn(true);
    try {
      const res = await fetch("/api/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: member.id,
          scheduleId: selectedSchedule.id,
          classSessionId: selectedSchedule.classDef.id,
          serviceId: matchedSub?.service.id ?? undefined,
          force,
        }),
      });
      if (res.status === 409) {
        const data = await res.json();
        if (data.code === "already_checked_in_today") {
          setForceCheckIn({ checkedInAt: data.checkedInAt });
          return;
        }
      }
      if (!res.ok) throw new Error();
      toast({ title: "Checked in!", description: `${member.firstName} checked in to ${selectedSchedule.classDef.name}.` });
      setShowCheckIn(false);
      setSelectedSchedule(null);
      router.refresh();
    } catch {
      toast({ variant: "destructive", title: "Check-in failed" });
    } finally {
      setCheckingIn(false);
    }
  }

  // Class Attendance
  const [showAllBookings, setShowAllBookings] = useState(false);

  // Compute session number per booking within each subscription (chronological order)
  const sessionNumberMap: Record<string, number> = (() => {
    const bySubId: Record<string, any[]> = {};
    for (const b of member.bookings) {
      if (!b.subscription?.id || b.subscription.sessionsTotal == null) continue;
      if (!bySubId[b.subscription.id]) bySubId[b.subscription.id] = [];
      bySubId[b.subscription.id].push(b);
    }
    const map: Record<string, number> = {};
    for (const subs of Object.values(bySubId)) {
      const sorted = [...subs].sort((a, b) =>
        new Date(a.session?.startsAt ?? 0).getTime() - new Date(b.session?.startsAt ?? 0).getTime()
      );
      sorted.forEach((b, i) => { map[b.id] = i + 1; });
    }
    return map;
  })();

  // Cancel booking
  const [cancelBooking, setCancelBooking] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancellingBooking, setCancellingBooking] = useState(false);

  async function confirmCancelBooking() {
    if (!cancelBooking) return;
    setCancellingBooking(true);
    try {
      const res = await fetch(`/api/bookings/${cancelBooking.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason, returnSession: true }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Booking cancelled", description: cancelBooking.subscription?.sessionsTotal != null ? "Session returned to membership." : undefined });
      setCancelBooking(null);
      setCancelReason("");
      router.refresh();
    } catch {
      toast({ variant: "destructive", title: "Could not cancel booking" });
    } finally {
      setCancellingBooking(false);
    }
  }

  function openAddRank(art: string) {
    setRankForm({ martialArt: art, rank: "", stripes: "", awardedAt: new Date().toLocaleDateString("en-CA", { timeZone }), awardedBy: "" });
    setRankDialog({ mode: "add", art });
  }

  function openEditRank(record: any) {
    setRankForm({
      martialArt: record.martialArt,
      rank: record.rank,
      stripes: record.stripes ?? "",
      awardedAt: new Date(record.awardedAt).toLocaleDateString("en-CA", { timeZone }),
      awardedBy: record.awardedBy ?? "",
    });
    setRankDialog({ mode: "edit", record });
  }

  async function saveRank() {
    setSavingRank(true);
    try {
      const isEdit = rankDialog?.mode === "edit";
      const url = isEdit ? `/api/ranks/${(rankDialog as any).record.id}` : "/api/ranks";
      const method = isEdit ? "PATCH" : "POST";
      const extras = rankForm.stripes ? { stripes: Number(rankForm.stripes) } : { stripes: null };
      const body = isEdit
        ? { rank: rankForm.rank, awardedAt: rankForm.awardedAt, awardedBy: rankForm.awardedBy, martialArt: rankForm.martialArt, ...extras }
        : { memberId: member.id, martialArt: rankForm.martialArt, rank: rankForm.rank, awardedAt: rankForm.awardedAt, awardedBy: rankForm.awardedBy, ...extras };
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { const err = await res.json().catch(() => ({})); console.error("saveRank error", err); throw new Error(); }
      toast({ title: isEdit ? "Rank updated" : "Rank added" });
      setRankDialog(null);
      router.refresh();
    } catch {
      toast({ variant: "destructive", title: "Could not save rank" });
    } finally {
      setSavingRank(false);
    }
  }

  async function deleteRank() {
    if (!deletingRank) return;
    setDeletingRankConfirm(true);
    try {
      await fetch(`/api/ranks/${deletingRank.id}`, { method: "DELETE" });
      toast({ title: "Rank record deleted" });
      setDeletingRank(null);
      router.refresh();
    } catch {
      toast({ variant: "destructive", title: "Could not delete rank" });
    } finally {
      setDeletingRankConfirm(false);
    }
  }

  const [deletingSub, setDeletingSub] = useState<any | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [editingSubDates, setEditingSubDates] = useState<any | null>(null);
  const [editDatesForm, setEditDatesForm] = useState({ startDate: "", endDate: "", sessionsRemaining: "", notes: "" });
  const [editDatesReasons, setEditDatesReasons] = useState<string[]>([]);
  const [editDatesOther, setEditDatesOther] = useState("");
  const [savingDates, setSavingDates] = useState(false);

  async function saveSubDates() {
    if (!editingSubDates) return;
    const reason = [
      ...editDatesReasons,
      ...(editDatesOther.trim() ? [`Other: ${editDatesOther.trim()}`] : []),
    ].join("; ");
    if (!reason) return;

    const sessionsRemaining = parseInt(editDatesForm.sessionsRemaining || "0");
    if (editingSubDates?.sessionsTotal != null && sessionsRemaining > editingSubDates.sessionsTotal) {
      toast({
        variant: "destructive",
        title: "Sessions remaining cannot exceed the total for this package",
        description: `Maximum allowed: ${editingSubDates.sessionsTotal}`,
      });
      return;
    }

    setSavingDates(true);
    try {
      const res = await fetch(`/api/subscriptions/${editingSubDates.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: editDatesForm.startDate,
          endDate: editDatesForm.endDate || null,
          ...(editingSubDates?.sessionsTotal != null
            ? { sessionsUsed: editingSubDates.sessionsTotal - parseInt(editDatesForm.sessionsRemaining || "0") }
            : {}),
          ...(editDatesForm.notes.trim() ? { notes: editDatesForm.notes.trim() } : {}),
          reason,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed");
      }
      toast({ title: "Membership updated" });
      setEditingSubDates(null);
      router.refresh();
    } catch (e: any) {
      toast({ variant: "destructive", title: e.message ?? "Could not update dates" });
    } finally {
      setSavingDates(false);
    }
  }

  async function confirmDeleteSub() {
    if (!deletingSub) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/subscriptions/${deletingSub.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: deleteReason, password: deletePassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Membership removed" });
      setDeletingSub(null);
      setDeleteReason("");
      setDeletePassword("");
      router.refresh();
    } catch (e: any) {
      toast({ variant: "destructive", title: e.message ?? "Could not delete membership" });
    } finally {
      setDeleting(false);
    }
  }

  const [showFreezeAll, setShowFreezeAll] = useState(false);
  const [freezeDays, setFreezeDays] = useState("7");
  const [freezeReason, setFreezeReason] = useState("");
  const [freezePassword, setFreezePassword] = useState("");
  const [freezing, setFreezing] = useState(false);
  const [freezeFile, setFreezeFile] = useState<File | null>(null);
  const [freezePreview, setFreezePreview] = useState<string | null>(null);
  const [showUnfreezeAll, setShowUnfreezeAll] = useState(false);
  const [unfreezeReason, setUnfreezeReason] = useState("");
  const [unfreezePassword, setUnfreezePassword] = useState("");
  const [unfreezing, setUnfreezing] = useState(false);
  const [unfreezeFile, setUnfreezeFile] = useState<File | null>(null);
  const [unfreezePreview, setUnfreezePreview] = useState<string | null>(null);

  const hasFrozen = member.subscriptions.some((s: any) => s.status === "PAUSED");

  // Show ACTIVE and PAUSED; hide EXPIRED and CANCELLED
  // Sort priority:
  // 1 = annual (has endDate > 90 days, no sessions) — always top
  // 2 = unlimited (no endDate, no sessions)
  // 3 = everything else, by endDate asc then startDate asc
  const ninetyDaysFromNow = Date.now() + 90 * 86400000;
  const sortPriority = (s: any) => {
    if (!s.sessionsTotal && s.endDate && new Date(s.endDate).getTime() > ninetyDaysFromNow) return 0;
    if (!s.sessionsTotal && !s.endDate) return 1;
    return 2;
  };
  const now = Date.now();
  const visibleSubs = member.subscriptions
    .filter((s: any) => {
      if (s.status !== "ACTIVE" && s.status !== "PAUSED") return false;
      if (s.endDate && new Date(s.endDate).getTime() < now) return false;
      if (s.sessionsTotal !== null && s.sessionsUsed >= s.sessionsTotal) return false;
      return true;
    })
    .sort((a: any, b: any) => {
      const pa = sortPriority(a), pb = sortPriority(b);
      if (pa !== pb) return pa - pb;
      if (a.endDate && b.endDate) return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    });

  async function freezeAll() {
    setFreezing(true);
    try {
      const res = await fetch(`/api/members/${member.id}/freeze-all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: Number(freezeDays), reason: freezeReason, password: freezePassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (freezeFile) {
        try {
          const fd = new FormData();
          fd.append("file", freezeFile);
          fd.append("memberId", member.id);
          fd.append("lastName", member.lastName);
          fd.append("sport", "Freeze");
          fd.append("package", `${freezeDays}days`);
          fd.append("amount", "0");
          fd.append("paymentMethod", "Freeze");
          await fetch("/api/upload-receipt", { method: "POST", body: fd });
        } catch {}
      }
      toast({ title: "Memberships frozen", description: `Frozen for ${freezeDays} day(s).` });
      setShowFreezeAll(false);
      setFreezeReason("");
      setFreezePassword("");
      setFreezeFile(null);
      setFreezePreview(null);
      router.refresh();
    } catch (e: any) {
      toast({ variant: "destructive", title: e.message ?? "Error" });
    } finally {
      setFreezing(false);
    }
  }

  async function unfreezeAll() {
    setUnfreezing(true);
    try {
      const res = await fetch(`/api/members/${member.id}/unfreeze-all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: unfreezeReason, password: unfreezePassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (unfreezeFile) {
        try {
          const fd = new FormData();
          fd.append("file", unfreezeFile);
          fd.append("memberId", member.id);
          fd.append("lastName", member.lastName);
          fd.append("sport", "Unfreeze");
          fd.append("package", "RemoveFreeze");
          fd.append("amount", "0");
          fd.append("paymentMethod", "Unfreeze");
          await fetch("/api/upload-receipt", { method: "POST", body: fd });
        } catch {}
      }
      toast({ title: "Freeze removed", description: "All memberships restored." });
      setShowUnfreezeAll(false);
      setUnfreezeReason("");
      setUnfreezePassword("");
      setUnfreezeFile(null);
      setUnfreezePreview(null);
      router.refresh();
    } catch (e: any) {
      toast({ variant: "destructive", title: e.message ?? "Could not remove freeze" });
    } finally {
      setUnfreezing(false);
    }
  }

  // Log payment dialog
  const [showLogPayment, setShowLogPayment] = useState(false);
  const [logPaymentForm, setLogPaymentForm] = useState({ subscriptionId: "", amount: "", method: "", date: new Date().toLocaleDateString("en-CA", { timeZone }), notes: "" });
  const [loggingPayment, setLoggingPayment] = useState(false);

  async function logPayment() {
    if (!logPaymentForm.amount || !logPaymentForm.method) return;
    setLoggingPayment(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: member.id,
          subscriptionId: logPaymentForm.subscriptionId || undefined,
          amount: parseFloat(logPaymentForm.amount),
          method: logPaymentForm.method,
          paidAt: logPaymentForm.date || undefined,
          notes: logPaymentForm.notes || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Payment logged" });
      setShowLogPayment(false);
      setLogPaymentForm({ subscriptionId: "", amount: "", method: "", date: new Date().toLocaleDateString("en-CA", { timeZone }), notes: "" });
      router.refresh();
    } catch {
      toast({ variant: "destructive", title: "Could not log payment" });
    } finally {
      setLoggingPayment(false);
    }
  }

  // Assign membership dialog
  const [showAssign, setShowAssign] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedPackageId, setSelectedPackageId] = useState("");
  // Services the member already has an active/paused subscription for
  const activeServiceIds = new Set(
    member.subscriptions
      .filter((s: any) => {
        if (s.status !== "ACTIVE" && s.status !== "PAUSED") return false;
        if (s.endDate && new Date(s.endDate).getTime() < Date.now()) return false;
        if (s.sessionsTotal !== null && s.sessionsUsed >= s.sessionsTotal) return false;
        return true;
      })
      .map((s: any) => s.serviceId)
  );

  const hasActiveAnnual = member.subscriptions.some((s: any) =>
    s.status === "ACTIVE" &&
    s.service?.name?.toLowerCase().includes("annual") &&
    (!s.endDate || new Date(s.endDate).getTime() >= Date.now())
  );

  const [rateType, setRateType] = useState<"member" | "nonMember">(hasActiveAnnual ? "member" : "nonMember");
  const [discount, setDiscount] = useState("0");
  const [specialPriceOpen, setSpecialPriceOpen] = useState(false);
  const [specialPriceInput, setSpecialPriceInput] = useState("");
  const [specialPriceReasons, setSpecialPriceReasons] = useState<string[]>([]);
  const [specialPriceOther, setSpecialPriceOther] = useState("");
  const [specialPriceNote, setSpecialPriceNote] = useState("");
  const [paymentMode, setPaymentMode] = useState("");
  const [paymentSubMode, setPaymentSubMode] = useState<string[]>([]);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [receiptStatus, setReceiptStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [receiptLink, setReceiptLink] = useState<string | null>(null);
  const [membershipNeedsReceipt, setMembershipNeedsReceipt] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [showDupConfirm, setShowDupConfirm] = useState(false);

  const selectedService = services.find((s) => s.id === selectedServiceId);
  const selectedPackage = selectedService?.packages?.find((p: any) => p.id === selectedPackageId);
  const basePrice = rateType === "member" ? (selectedPackage?.memberPrice ?? 0) : (selectedPackage?.nonMemberPrice ?? 0);
  const discountPct = Math.min(Math.max(Number(discount) || 0, 0), 100);
  const discountAmt = basePrice * (discountPct / 100);
  const finalPrice = basePrice - discountAmt;

  const SPECIAL_PRICE_REASONS = [
    "Employee Price",
    "Family / Friend Discount",
    "Loyalty Discount",
    "Promotional Rate",
    "Complimentary",
    "Bundle Deal",
  ];

  async function updateStatus(newStatus: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      setStatus(newStatus);
      toast({ title: "Status updated" });
      router.refresh();
    } catch {
      toast({ variant: "destructive", title: "Could not update status" });
    } finally {
      setSaving(false);
    }
  }


  async function assignMembership(skipDupCheck = false) {
    if (!selectedServiceId || !selectedPackageId) return;

    // HIGH-8: warn if the member already has an active/paused sub for this service
    if (!skipDupCheck) {
      const existing = member.subscriptions.find(
        (s: any) =>
          s.serviceId === selectedServiceId &&
          (s.status === "ACTIVE" || s.status === "PAUSED") &&
          (!s.endDate || new Date(s.endDate).getTime() >= Date.now()) &&
          (s.sessionsTotal === null || s.sessionsUsed < s.sessionsTotal)
      );
      if (existing) {
        setShowDupConfirm(true);
        return;
      }
    }

    setAssigning(true);
    try {
      // Calculate end date from package validDays
      const startDateStr = new Date().toLocaleDateString("en-CA", { timeZone });
      const startOffset = getUtcOffsetString(new Date(`${startDateStr}T12:00:00Z`), timeZone);
      const startDate = new Date(startDateStr + "T00:00:00" + startOffset);
      const endDate = selectedPackage
        ? new Date(startDate.getTime() + selectedPackage.validDays * 86400000)
        : undefined;

      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: member.id,
          serviceId: selectedServiceId,
          packageId: selectedPackageId,
          price: finalPrice,
          startDate: startDateStr,
          endDate: endDate ? endDate.toLocaleDateString("en-CA", { timeZone }) : undefined,
          sessionsTotal: selectedPackage?.sessions ?? null,
          paymentMethod: paymentSubMode.length ? `${paymentMode} - ${paymentSubMode.join(" & ")}` : paymentMode || undefined,
          ...(specialPriceNote ? { notes: specialPriceNote } : {}),
        }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err?.error || "Failed"); }

      // Upload receipt photo if one was attached
      let uploadError = false;
      if (receiptFile && selectedService && selectedPackage) {
        setReceiptStatus("uploading");
        try {
          const fd = new FormData();
          fd.append("file", receiptFile);
          fd.append("memberId", member.id);
          fd.append("lastName", member.lastName);
          fd.append("sport", selectedService.name);
          fd.append("package", selectedPackage.name);
          fd.append("amount", String(finalPrice));
          fd.append("paymentMethod", paymentSubMode.length ? `${paymentMode}${paymentSubMode.join("")}` : paymentMode);
          const upRes = await fetch("/api/upload-receipt", { method: "POST", body: fd });
          if (upRes.ok) {
            const data = await upRes.json();
            setReceiptLink(data.link ?? null);
            setReceiptStatus("done");
          } else {
            setReceiptStatus("error");
            uploadError = true;
          }
        } catch {
          setReceiptStatus("error");
          uploadError = true;
        }
      }

      toast({
        title: "Membership assigned",
        ...(uploadError && membershipNeedsReceipt ? { description: "Receipt upload failed — membership was still created. Upload the receipt manually." } : {}),
      });
      setShowAssign(false);
      setSelectedServiceId("");
      setSelectedPackageId("");
      setDiscount("0");
      setSpecialPriceNote("");
      setSpecialPriceReasons([]);
      setSpecialPriceOther("");
      setSpecialPriceInput("");
      setPaymentMode("");
      setPaymentSubMode([]);
      setReceiptFile(null);
      setReceiptPreview(null);
      setReceiptStatus("idle");
      setReceiptLink(null);
      setMembershipNeedsReceipt(true);
      router.refresh();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Could not assign membership", description: e?.message });
    } finally {
      setAssigning(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/members"><ArrowLeft className="h-4 w-4 mr-1" />Members</Link>
        </Button>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-start gap-4">
        <Avatar className="h-20 w-20">
          <AvatarImage src={member.photoUrl ?? ""} />
          <AvatarFallback className="text-2xl">
            {getInitials(`${member.firstName} ${member.lastName}`)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold">{member.firstName} {member.lastName}</h1>
            {isAdmin ? (
              <Select value={status} onValueChange={updateStatus} disabled={saving}>
                <SelectTrigger className="h-7 w-auto text-xs px-2 gap-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                  <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                  <SelectItem value="CANCELLED">CANCELLED</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Badge variant={STATUS_COLORS[status]}>{status}</Badge>
            )}
            <span className="text-xs font-mono px-2 py-0.5 rounded-md border bg-muted text-muted-foreground">
              {member.memberNumber ?? "No Athlete ID"}
            </span>
            {isAdmin && (
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => {
                setEditForm({
                  memberNumber: member.memberNumber ?? "",
                  firstName: member.firstName,
                  lastName: member.lastName,
                  email: member.user?.email ?? "",
                  gender: member.gender ?? "",
                  phone: member.phone ?? "",
                  dateOfBirth: member.dateOfBirth ? new Date(member.dateOfBirth).toLocaleDateString("en-CA", { timeZone }) : "",
                  address: member.address ?? "",
                  source: member.source ?? "",
                });
                setShowEditProfile(true);
              }}>
                <Pencil className="h-3 w-3 mr-1" />Edit
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
            {member.user?.email && !member.user.email.endsWith("@flowforcerm.local") && (
              <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{member.user.email}</span>
            )}
            {member.phone && (
              <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{member.phone}</span>
            )}
            {member.dateOfBirth && (
              <span className="flex items-center gap-1"><Cake className="h-3.5 w-3.5" />{formatDate(member.dateOfBirth)}</span>
            )}
            {member.address && (
              <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{member.address}</span>
            )}
            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Joined {formatDate(member.joinDate)}</span>
            {member.source && (
              <span className="flex items-center gap-1 text-muted-foreground">Heard via: {member.source}</span>
            )}
            {member.emergencyName && (
              <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs" title={[member.emergencyName, member.emergencyPhone, member.emergencyRel].filter(Boolean).join(" · ")}>
                <AlertTriangle className="h-3 w-3" />Emergency: {member.emergencyName}
              </span>
            )}
            {member.waiverSigned && (
              <span className="flex items-center gap-1 text-green-700">
                <CheckSquare className="h-3.5 w-3.5" />Waiver signed {formatDate(member.waiverDate)}
              </span>
            )}
          </div>
          {/* Current ranks per martial art */}
          {(() => {
            const latestRanks: Record<string, { rank: string; stripes?: number | null }> = {};
            for (const r of member.rankRecords) {
              if (!latestRanks[r.martialArt]) latestRanks[r.martialArt] = { rank: r.rank, stripes: r.stripes };
            }
            const entries = Object.entries(latestRanks);
            if (entries.length === 0) return null;
            return (
              <div className="flex flex-wrap gap-2 mt-2">
                {entries.map(([art, { rank, stripes }]) => (
                  <span key={art} className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium">
                    <Award className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">{art}:</span>
                    <span>{rank}{art === "BJJ" && stripes ? ` ${"▪".repeat(stripes)}` : ""}</span>
                  </span>
                ))}
              </div>
            );
          })()}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={openCheckIn} size="sm">
            <CheckSquare className="mr-2 h-4 w-4" />Check In
          </Button>
          {(isAdmin || isStaff) && (
            <Button size="sm" variant="outline" onClick={() => setShowAssign(true)}>
              <Plus className="mr-2 h-4 w-4" />Assign Membership
            </Button>
          )}
        </div>
      </div>

      {/* Notes (if present) */}
      {(member.notes || member.medicalNotes) && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Notes</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {member.notes && <div><p className="font-medium text-muted-foreground mb-1">General</p><p>{member.notes}</p></div>}
            {member.medicalNotes && (
              <div>
                <p className="font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />Medical
                </p>
                <p className="bg-yellow-50 border border-yellow-200 rounded p-2">{member.medicalNotes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Row 1: Memberships + Guardian Account */}
      <div className={`grid gap-6 ${isAdmin ? "md:grid-cols-2" : ""}`}>
        {/* Memberships */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" />Memberships
            </CardTitle>
            {isAdmin && visibleSubs.length > 0 && (
              hasFrozen ? (
                <Button size="sm" variant="outline" className="h-7 text-xs text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => { setShowUnfreezeAll(true); setUnfreezeReason(""); setUnfreezePassword(""); }}>
                  <Snowflake className="h-3 w-3 mr-1" />Remove Freeze
                </Button>
              ) : (
                <Button size="sm" variant="outline" className="h-7 text-xs text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => { setShowFreezeAll(true); setFreezeDays("7"); }}>
                  <Snowflake className="h-3 w-3 mr-1" />Freeze
                </Button>
              )
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            {visibleSubs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active memberships.</p>
            ) : (
              visibleSubs.map((sub: any) => {
                const isFrozen = sub.status === "PAUSED";
                const isSessionBased = sub.sessionsTotal !== null;
                const sessionsLeft = isSessionBased ? sub.sessionsTotal - sub.sessionsUsed : null;
                const daysLeft = !isSessionBased && sub.endDate
                  ? Math.max(0, Math.ceil((new Date(sub.endDate).getTime() - Date.now()) / 86400000))
                  : null;

                return (
                  <div key={sub.id} className={`rounded-md border p-3 space-y-2 ${isFrozen ? "bg-blue-50/50 border-blue-200" : ""}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full inline-block shrink-0" style={{ backgroundColor: sub.service.color }} />
                        <span className="font-medium text-sm">{sub.service.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isFrozen
                          ? <Badge variant="warning" className="flex items-center gap-1"><Snowflake className="h-3 w-3" />FROZEN</Badge>
                          : <Badge variant="success">ACTIVE</Badge>
                        }
                        {sub.notes && (
                          <span title={sub.notes} className="cursor-help text-muted-foreground hover:text-foreground transition-colors">
                            <Info className="h-3.5 w-3.5" />
                          </span>
                        )}
                        {(isAdmin || isStaff) && (
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => {
                              setEditingSubDates(sub);
                              setEditDatesForm({
                                startDate: new Date(sub.startDate).toLocaleDateString("en-CA", { timeZone }),
                                endDate: sub.endDate ? new Date(sub.endDate).toLocaleDateString("en-CA", { timeZone }) : "",
                                sessionsRemaining: sub.sessionsTotal != null ? String(sub.sessionsTotal - sub.sessionsUsed) : "",
                                notes: sub.notes ?? "",
                              });
                              setEditDatesReasons([]);
                              setEditDatesOther("");
                            }}
                            title="Edit dates"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-destructive transition-colors"
                            onClick={() => { setDeletingSub(sub); setDeleteReason(""); setDeletePassword(""); }}
                            title="Remove membership"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3">
                      <span>Started {formatDate(sub.startDate)}</span>
                      {sub.endDate && <span>Expires {formatDate(sub.endDate)}</span>}
                    </div>
                    {isFrozen && sub.frozenUntil && (
                      <p className="text-xs text-blue-600 font-medium flex items-center gap-1">
                        <Snowflake className="h-3 w-3" />
                        Frozen until {formatDate(sub.frozenUntil)}
                      </p>
                    )}
                    {!isFrozen && isSessionBased ? (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Sessions used</span>
                          <span className={sessionsLeft === 0 ? "text-destructive font-medium" : sessionsLeft! <= 2 ? "text-yellow-600 font-medium" : "font-medium"}>
                            {sub.sessionsUsed} / {sub.sessionsTotal} &nbsp;·&nbsp; {sessionsLeft} left
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${sessionsLeft === 0 ? "bg-destructive" : sessionsLeft! <= 2 ? "bg-yellow-500" : "bg-green-500"}`}
                            style={{ width: `${(sub.sessionsUsed / sub.sessionsTotal) * 100}%` }}
                          />
                        </div>
                      </div>
                    ) : !isFrozen && daysLeft !== null ? (
                      <p className={`text-xs font-medium ${daysLeft === 0 ? "text-destructive" : daysLeft <= 7 ? "text-yellow-600" : "text-green-700"}`}>
                        {daysLeft === 0 ? "Expires today" : `${daysLeft} day${daysLeft !== 1 ? "s" : ""} remaining`}
                      </p>
                    ) : null}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Guardian Account */}
        {isAdmin && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />Guardian Account
              </CardTitle>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowGuardianDialog(true)}>
                {currentGuardian ? <><Pencil className="h-3 w-3 mr-1" />Change</> : <><Plus className="h-3 w-3 mr-1" />Link Guardian</>}
              </Button>
            </CardHeader>
            <CardContent>
              {currentGuardian ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{currentGuardian.name ?? "—"}</p>
                    <p className="text-sm text-muted-foreground">{currentGuardian.email}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">This member&apos;s QR appears on the guardian&apos;s phone.</p>
                  </div>
                  <Button size="sm" variant="ghost" className="text-destructive h-7" onClick={removeGuardian} disabled={savingGuardian}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No guardian linked. Link one so a parent can access this athlete&apos;s QR code from their phone.</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>{/* end Row 1 grid */}

      {/* Row 2: Rank History — full width */}
      <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-4 w-4" />Rank History
            </CardTitle>
            {isAdmin && (
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openAddRank("")}>
                <Plus className="h-3 w-3 mr-1" />Add Rank
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {member.rankRecords.length === 0 ? (
              <p className="text-sm text-muted-foreground">No rank records.</p>
            ) : (() => {
              const groups: Record<string, any[]> = {};
              for (const r of member.rankRecords) {
                if (!groups[r.martialArt]) groups[r.martialArt] = [];
                groups[r.martialArt].push(r);
              }
              return (
                <div className="space-y-5">
                  {Object.entries(groups).map(([art, records]) => {
                    const latest = records[0];
                    return (
                      <div key={art}>
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="text-sm font-semibold">{art}</p>
                            <p className="text-xs text-muted-foreground">
                              Current: <span className="font-medium text-foreground">{latest.rank}</span>
                              {latest.awardedBy && <> · {latest.awardedBy}</>}
                            </p>
                          </div>
                          {isAdmin && (
                            <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => openAddRank(art)}>
                              <Plus className="h-3 w-3 mr-1" />Add
                            </Button>
                          )}
                        </div>
                        <div className="rounded-md border overflow-hidden">
                          <table className="w-full text-xs table-fixed">
                            <colgroup>
                              <col className="w-[40%]" />
                              <col className="w-[25%]" />
                              <col className="w-[25%]" />
                              {isAdmin && <col className="w-[10%]" />}
                            </colgroup>
                            <thead>
                              <tr className="bg-muted/50 border-b">
                                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Rank</th>
                                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Awarded</th>
                                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Awarded by</th>
                                {isAdmin && <th className="px-3 py-2" />}
                              </tr>
                            </thead>
                            <tbody>
                              {records.map((r: any, i: number) => (
                                <tr key={r.id} className={i !== records.length - 1 ? "border-b" : ""}>
                                  <td className="px-3 py-2 font-medium">{r.rank}{r.stripes ? ` · ${r.stripes}S` : ""}</td>
                                  <td className="px-3 py-2 text-muted-foreground">{formatDate(r.awardedAt)}</td>
                                  <td className="px-3 py-2 text-muted-foreground">{r.awardedBy ?? "—"}</td>
                                  {isAdmin && (
                                    <td className="px-3 py-2">
                                      <div className="flex items-center gap-1 justify-end">
                                        <button type="button" className="text-muted-foreground hover:text-foreground transition-colors" onClick={() => openEditRank(r)}>
                                          <Pencil className="h-3 w-3" />
                                        </button>
                                        <button type="button" className="text-muted-foreground hover:text-destructive transition-colors" onClick={() => setDeletingRank(r)}>
                                          <Trash2 className="h-3 w-3" />
                                        </button>
                                      </div>
                                    </td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </CardContent>
      </Card>{/* end Row 2 */}

      {/* Row 3: Class Attendance — full width */}
      <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />Class Attendance
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {member.bookings.length === 0 ? (
              <p className="text-sm text-muted-foreground px-6 py-4">No class bookings yet.</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/50 border-b">
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground">Date & Time</th>
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground">Class</th>
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground">Membership Used</th>
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground">Status</th>
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground">Booked by</th>
                        {isAdmin && <th className="px-4 py-2 w-10" />}
                      </tr>
                    </thead>
                    <tbody>
                      {(showAllBookings ? member.bookings : member.bookings.slice(0, 10)).map((b: any) => {
                        const sessionNum = sessionNumberMap[b.id];
                        const sessionsTotal = b.subscription?.sessionsTotal;
                        return (
                          <tr key={b.id} className={`border-b last:border-0 ${b.status === "CANCELLED" ? "opacity-50" : ""}`}>
                            <td className="px-4 py-2.5 whitespace-nowrap">
                              {(() => {
                                const date = b.scheduledDate ?? b.session?.startsAt ?? b.createdAt;
                                const hasScheduleTimes = b.schedule?.startTime && b.schedule?.endTime;
                                return (
                                  <>
                                    <p className="font-medium">
                                      {date ? new Date(date).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric", timeZone }) : "—"}
                                    </p>
                                    <p className="text-muted-foreground">
                                      {hasScheduleTimes
                                        ? `${b.schedule.startTime} – ${b.schedule.endTime}`
                                        : b.session?.startsAt
                                          ? `${new Date(b.session.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – ${new Date(b.session.endsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                                          : "—"}
                                    </p>
                                  </>
                                );
                              })()}
                            </td>
                            <td className="px-4 py-2.5">
                              <p className="font-medium">{b.session.name}</p>
                              {b.session.location && <p className="text-muted-foreground text-[11px]">{b.session.location}</p>}
                            </td>
                            <td className="px-4 py-2.5">
                              {b.subscription
                                ? <>
                                    <p className="font-medium">{b.subscription.service.name}</p>
                                    {sessionsTotal != null && sessionNum != null && (
                                      <p className="text-muted-foreground">Session {sessionNum}/{sessionsTotal}</p>
                                    )}
                                  </>
                                : <span className="text-muted-foreground">—</span>}
                            </td>
                            <td className="px-4 py-2.5">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border ${
                                b.status === "CONFIRMED" ? "bg-green-50 text-green-700 border-green-200" :
                                b.status === "ATTENDED"  ? "bg-blue-50 text-blue-700 border-blue-200" :
                                "bg-red-50 text-red-700 border-red-200"
                              }`}>
                                {b.status}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-muted-foreground">
                              {b.bookedBy?.name ?? b.bookedBy?.email ?? "System"}
                            </td>
                            {isAdmin && (
                              <td className="px-4 py-2.5">
                                {b.status !== "CANCELLED" && (
                                  <button type="button" onClick={() => { setCancelBooking(b); setCancelReason(""); }}
                                    className="text-muted-foreground hover:text-destructive transition-colors">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {member.bookings.length > 10 && (
                  <div className="px-4 py-3 border-t">
                    <button
                      onClick={() => setShowAllBookings((v) => !v)}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      {showAllBookings
                        ? "Show less"
                        : `Show all ${member.bookings.length} entries`}
                    </button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

      {/* Guardian Dialog */}
      <Dialog open={showGuardianDialog} onOpenChange={setShowGuardianDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link Guardian Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button size="sm" variant={guardianMode === "search" ? "default" : "outline"} onClick={() => setGuardianMode("search")}>Find Existing</Button>
              <Button size="sm" variant={guardianMode === "create" ? "default" : "outline"} onClick={() => setGuardianMode("create")}>Create New</Button>
            </div>
            {guardianMode === "search" ? (
              <div className="space-y-2">
                <Label>Search by name or email</Label>
                <Input
                  placeholder="e.g. parent@email.com"
                  value={guardianSearch}
                  onChange={(e) => searchGuardians(e.target.value)}
                />
                {guardianSearching && <p className="text-xs text-muted-foreground">Searching…</p>}
                {guardianResults.length > 0 && (
                  <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
                    {guardianResults.map((u) => (
                      <button key={u.id} className="w-full text-left px-3 py-2 hover:bg-muted text-sm" onClick={() => linkGuardian(u.id)} disabled={savingGuardian}>
                        <p className="font-medium">{u.name ?? u.email}</p>
                        <p className="text-xs text-muted-foreground">{u.email}{u.member ? ` · also has own member record` : ""}</p>
                      </button>
                    ))}
                  </div>
                )}
                {!guardianSearching && guardianSearch && guardianResults.length === 0 && (
                  <p className="text-xs text-muted-foreground">No users found. Try creating a new guardian account.</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label>Parent / Guardian Name</Label>
                  <Input placeholder="Maria Santos" value={newGuardianName} onChange={(e) => setNewGuardianName(e.target.value)} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" placeholder="parent@email.com" value={newGuardianEmail} onChange={(e) => setNewGuardianEmail(e.target.value)} />
                </div>
                <p className="text-xs text-muted-foreground">A login will be created. The temp password will be shown after saving.</p>
                <Button className="w-full" onClick={createAndLinkGuardian} disabled={savingGuardian || !newGuardianName || !newGuardianEmail}>
                  {savingGuardian ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create & Link Guardian"}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4" />Payment History
          </CardTitle>
          {isAdmin && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowLogPayment(true)}>
              <Plus className="h-3 w-3 mr-1" />Log Payment
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {member.payments.length === 0 ? (
            <p className="text-sm text-muted-foreground px-6 py-4">No payment history yet.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Date</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Package</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Method</th>
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground">Amount</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {member.payments.map((p: any) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {formatDate(p.paidAt ?? p.createdAt)}
                    </td>
                    <td className="px-4 py-2.5">
                      {p.subscription?.service
                        ? <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: p.subscription.service.color }} />
                            {p.subscription.service.name}
                          </span>
                        : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      {p.method
                        ? <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-medium uppercase tracking-wide">{p.method}</span>
                        : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold">{formatCurrency(p.amount)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border ${
                        p.status === "PAID" ? "bg-green-50 text-green-700 border-green-200" :
                        p.status === "PENDING" ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                        "bg-red-50 text-red-700 border-red-200"
                      }`}>{p.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Log Payment dialog */}
      <Dialog open={showLogPayment} onOpenChange={(o) => !o && setShowLogPayment(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Log Payment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Membership <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Select value={logPaymentForm.subscriptionId} onValueChange={(v) => setLogPaymentForm((f) => ({ ...f, subscriptionId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select membership..." /></SelectTrigger>
                <SelectContent>
                  {member.subscriptions.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.service.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Amount</Label>
                <Input type="number" step="0.01" placeholder="0.00" value={logPaymentForm.amount} onChange={(e) => setLogPaymentForm((f) => ({ ...f, amount: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Date</Label>
                <Input type="date" value={logPaymentForm.date} onChange={(e) => setLogPaymentForm((f) => ({ ...f, date: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Payment Method</Label>
              <Select value={logPaymentForm.method} onValueChange={(v) => setLogPaymentForm((f) => ({ ...f, method: v }))}>
                <SelectTrigger><SelectValue placeholder="Select method..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="GCash">GCash</SelectItem>
                  <SelectItem value="Card">Card</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input placeholder="e.g. renewal, walk-in..." value={logPaymentForm.notes} onChange={(e) => setLogPaymentForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLogPayment(false)}>Cancel</Button>
            <Button onClick={logPayment} disabled={!logPaymentForm.amount || !logPaymentForm.method || loggingPayment}>
              {loggingPayment && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Membership dialog */}
      <Dialog open={!!deletingSub} onOpenChange={(o) => !o && setDeletingSub(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-4 w-4" />Remove Membership
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              You are about to remove <span className="font-medium text-foreground">{deletingSub?.service?.name}</span> from this athlete. This cannot be undone.
            </p>
            <div className="space-y-1">
              <Label>Reason</Label>
              <Input
                placeholder="Enter reason for removal..."
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Admin Password</Label>
              <Input
                type="password"
                placeholder="Enter your password to confirm..."
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingSub(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={!deleteReason.trim() || !deletePassword || deleting}
              onClick={confirmDeleteSub}
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remove Membership
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Membership dialog */}
      <Dialog open={!!editingSubDates} onOpenChange={(o) => !o && setEditingSubDates(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4" />Edit Membership
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Editing <span className="font-medium text-foreground">{editingSubDates?.service?.name}</span>.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={editDatesForm.startDate}
                  onChange={(e) => setEditDatesForm((f) => ({ ...f, startDate: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>End Date <span className="text-muted-foreground font-normal text-xs">(leave blank = no expiry)</span></Label>
                <Input
                  type="date"
                  value={editDatesForm.endDate}
                  onChange={(e) => setEditDatesForm((f) => ({ ...f, endDate: e.target.value }))}
                />
              </div>
            </div>
            {editingSubDates?.sessionsTotal != null && (
              <div className="space-y-1">
                <Label>
                  Sessions remaining
                  <span className="ml-2 text-xs text-muted-foreground font-normal">
                    (max {editingSubDates.sessionsTotal})
                  </span>
                </Label>
                <Input
                  type="number"
                  min="0"
                  max={editingSubDates.sessionsTotal}
                  value={editDatesForm.sessionsRemaining}
                  onChange={(e) => setEditDatesForm((f) => ({ ...f, sessionsRemaining: e.target.value }))}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Reason for change</Label>
              {[
                "Admin entry error",
                "Billing correction",
                "Medical / injury extension",
                "Freeze adjustment",
                "Membership transfer",
                "Customer request",
                "Promotional extension",
              ].map((r) => (
                <label key={r} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editDatesReasons.includes(r)}
                    onChange={(e) => {
                      setEditDatesReasons((prev) =>
                        e.target.checked ? [...prev, r] : prev.filter((x) => x !== r)
                      );
                    }}
                    className="h-4 w-4 rounded border accent-primary"
                  />
                  {r}
                </label>
              ))}
              <div className="space-y-1 pt-1">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={editDatesOther.length > 0}
                    readOnly
                    className="h-4 w-4 rounded border accent-primary"
                  />
                  Other
                </label>
                <Input
                  placeholder="Describe the reason..."
                  value={editDatesOther}
                  onChange={(e) => setEditDatesOther(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Internal notes <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                rows={3}
                maxLength={500}
                placeholder="Any additional context for this change..."
                value={editDatesForm.notes}
                onChange={(e) => setEditDatesForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSubDates(null)}>Cancel</Button>
            <Button
              disabled={
                !editDatesForm.startDate ||
                (editDatesReasons.length === 0 && !editDatesOther.trim()) ||
                savingDates
              }
              onClick={saveSubDates}
            >
              {savingDates && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Freeze dialog */}
      <Dialog open={showUnfreezeAll} onOpenChange={(o) => { if (!o) { setShowUnfreezeAll(false); setUnfreezeReason(""); setUnfreezePassword(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Snowflake className="h-4 w-4 text-blue-500" />
              Remove Freeze
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              All paused memberships will be restored. End dates will be adjusted to account for the early return.
            </p>
            <div className="space-y-1">
              <Label>Reason</Label>
              <Input placeholder="Enter reason for removing freeze..." value={unfreezeReason} onChange={(e) => setUnfreezeReason(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Admin Password</Label>
              <Input type="password" placeholder="Enter your password to confirm..." value={unfreezePassword} onChange={(e) => setUnfreezePassword(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Photo / Proof <span className="text-muted-foreground">(optional)</span></Label>
              {unfreezePreview ? (
                <div className="relative">
                  <img src={unfreezePreview} alt="Preview" className="w-full max-h-32 object-cover rounded-lg border" />
                  <button onClick={() => { setUnfreezeFile(null); setUnfreezePreview(null); }} className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5"><X className="h-3 w-3 text-white" /></button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50">
                  <Camera className="h-5 w-5 text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground">Take or upload photo</span>
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setUnfreezeFile(f); setUnfreezePreview(URL.createObjectURL(f)); } }} />
                </label>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUnfreezeAll(false)}>Cancel</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={!unfreezeReason.trim() || !unfreezePassword || unfreezing}
              onClick={unfreezeAll}
            >
              {unfreezing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remove Freeze
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Freeze All dialog */}
      <Dialog open={showFreezeAll} onOpenChange={(o) => { if (!o) { setShowFreezeAll(false); setFreezeReason(""); setFreezePassword(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Snowflake className="h-4 w-4 text-blue-500" />
              Freeze Memberships
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Session-based and short-term memberships will be paused. Annual memberships remain active. End dates are extended by the frozen duration.
            </p>
            <div className="space-y-1">
              <Label>Days to freeze</Label>
              <Input type="number" min="1" value={freezeDays} onChange={(e) => setFreezeDays(e.target.value)} placeholder="7" />
            </div>
            {freezeDays && Number(freezeDays) > 0 && (
              <p className="text-xs text-muted-foreground">
                Frozen until{" "}
                <span className="font-medium text-foreground">
                  {new Date(Date.now() + Number(freezeDays) * 86400000).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </p>
            )}
            <div className="space-y-1">
              <Label>Reason</Label>
              <Input placeholder="Enter reason for freezing..." value={freezeReason} onChange={(e) => setFreezeReason(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Admin Password</Label>
              <Input type="password" placeholder="Enter your password to confirm..." value={freezePassword} onChange={(e) => setFreezePassword(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Photo / Proof <span className="text-muted-foreground">(optional)</span></Label>
              {freezePreview ? (
                <div className="relative">
                  <img src={freezePreview} alt="Preview" className="w-full max-h-32 object-cover rounded-lg border" />
                  <button onClick={() => { setFreezeFile(null); setFreezePreview(null); }} className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5"><X className="h-3 w-3 text-white" /></button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50">
                  <Camera className="h-5 w-5 text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground">Take or upload photo</span>
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setFreezeFile(f); setFreezePreview(URL.createObjectURL(f)); } }} />
                </label>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFreezeAll(false)}>Cancel</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={!freezeDays || Number(freezeDays) < 1 || !freezeReason.trim() || !freezePassword || freezing}
              onClick={freezeAll}
            >
              {freezing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Freeze Memberships
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Membership dialog */}
      <Dialog open={showAssign} onOpenChange={(o) => {
        if (!o) {
          setShowAssign(false);
          setSelectedServiceId("");
          setSelectedPackageId("");
          setDiscount("0");
          setSpecialPriceNote("");
          setSpecialPriceReasons([]);
          setSpecialPriceOther("");
          setSpecialPriceInput("");
          setSpecialPriceOpen(false);
          setPaymentMode("");
          setPaymentSubMode([]);
          setReceiptFile(null);
          setReceiptPreview(null);
          setReceiptStatus("idle");
          setReceiptLink(null);
          setMembershipNeedsReceipt(true);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Membership — {member.firstName} {member.lastName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Membership</Label>
              <Select value={selectedServiceId} onValueChange={(v) => { setSelectedServiceId(v); setSelectedPackageId(""); setRateType(hasActiveAnnual ? "member" : "nonMember"); }}>
                <SelectTrigger><SelectValue placeholder="Select a membership..." /></SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedService && (
              <div className="space-y-1">
                <Label>Package</Label>
                {selectedService.packages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No packages for this membership.</p>
                ) : (
                  <Select value={selectedPackageId} onValueChange={(v) => { setSelectedPackageId(v); setRateType(hasActiveAnnual ? "member" : "nonMember"); }}>
                    <SelectTrigger><SelectValue placeholder="Select a package..." /></SelectTrigger>
                    <SelectContent>
                      {selectedService.packages
                        .filter((pkg: any) => rateType === "member" || pkg.nonMemberPrice > 0 || pkg.memberPrice === 0)
                        .map((pkg: any) => (
                          <SelectItem key={pkg.id} value={pkg.id}>
                            {pkg.name} — {pkg.sessions ? `${pkg.sessions} sessions` : "Unlimited"} / {pkg.validDays}d · {formatCurrency(rateType === "member" ? pkg.memberPrice : pkg.nonMemberPrice)}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {selectedPackage && (
              <>
                {/* Rate selector — auto-set based on annual membership, staff can override */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Rate</Label>
                    <span className="text-xs text-muted-foreground">
                      {hasActiveAnnual ? "Auto: member (has annual membership)" : "Auto: non-member (no annual membership)"}
                    </span>
                  </div>
                  <div className="flex rounded-md border overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setRateType("member")}
                      className={`flex-1 py-2 text-sm font-medium transition-colors ${rateType === "member" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                    >
                      Member — {formatCurrency(selectedPackage.memberPrice)}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRateType("nonMember")}
                      disabled={!selectedPackage.nonMemberPrice}
                      className={`flex-1 py-2 text-sm font-medium border-l transition-colors ${rateType === "nonMember" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"} disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      Non-member — {selectedPackage.nonMemberPrice ? formatCurrency(selectedPackage.nonMemberPrice) : "N/A"}
                    </button>
                  </div>
                </div>

                <div className="rounded-md bg-muted/50 border p-3 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sessions</span>
                    <span className="font-medium">{selectedPackage.sessions ? `${selectedPackage.sessions} sessions` : "Unlimited"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valid for</span>
                    <span className="font-medium">{selectedPackage.validDays} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{rateType === "member" ? "Member rate" : "Non-member rate"}</span>
                    <span className="font-medium">{formatCurrency(basePrice)}</span>
                  </div>
                  {discountAmt > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Discount</span>
                      <span className="font-medium text-destructive">− {formatCurrency(discountAmt)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center border-t pt-1 mt-1">
                    <span className="font-medium">Total</span>
                    <div className="flex items-center gap-2">
                      {specialPriceNote && (
                        <span className="text-xs text-muted-foreground line-through">{formatCurrency(basePrice)}</span>
                      )}
                      <span className="font-bold text-green-700">{formatCurrency(finalPrice)}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSpecialPriceInput(String(finalPrice));
                          setSpecialPriceOpen((o) => !o);
                        }}
                        className="text-xs px-2 py-0.5 rounded border border-amber-400 text-amber-600 hover:bg-amber-50 font-medium transition-colors"
                      >
                        {specialPriceNote ? "Edit Special" : "Special Price"}
                      </button>
                    </div>
                  </div>
                  {specialPriceNote && (
                    <div className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <span>⚡ Special price applied:</span>
                      <span className="truncate">{specialPriceNote}</span>
                      <button
                        type="button"
                        onClick={() => { setSpecialPriceNote(""); setSpecialPriceReasons([]); setSpecialPriceOther(""); setDiscount("0"); setSpecialPriceOpen(false); }}
                        className="ml-auto text-muted-foreground hover:text-destructive"
                      >✕</button>
                    </div>
                  )}
                </div>

                {specialPriceOpen && (
                  <div className="rounded-md border border-amber-200 bg-amber-50/60 p-3 space-y-3">
                    <p className="text-sm font-medium text-amber-800">Special Price</p>
                    <div className="space-y-1">
                      <Label className="text-xs">New Total Amount (₱)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={specialPriceInput}
                        onChange={(e) => setSpecialPriceInput(e.target.value)}
                        placeholder="0.00"
                        className="bg-white"
                      />
                      {basePrice > 0 && Number(specialPriceInput) >= 0 && Number(specialPriceInput) < basePrice && (
                        <p className="text-xs text-muted-foreground">
                          {Math.round((basePrice - Number(specialPriceInput)) / basePrice * 100)}% off — saving ₱{(basePrice - Number(specialPriceInput)).toFixed(2)}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Reason (select all that apply)</Label>
                      {SPECIAL_PRICE_REASONS.map((r) => (
                        <label key={r} className="flex items-center gap-2 cursor-pointer text-sm">
                          <input
                            type="checkbox"
                            checked={specialPriceReasons.includes(r)}
                            onChange={(e) => setSpecialPriceReasons((prev) =>
                              e.target.checked ? [...prev, r] : prev.filter((x) => x !== r)
                            )}
                          />
                          {r}
                        </label>
                      ))}
                      <Input
                        value={specialPriceOther}
                        onChange={(e) => setSpecialPriceOther(e.target.value)}
                        placeholder="Other reason..."
                        className="bg-white mt-1"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setSpecialPriceOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="flex-1"
                        disabled={
                          !specialPriceInput ||
                          Number(specialPriceInput) < 0 ||
                          Number(specialPriceInput) > basePrice ||
                          (specialPriceReasons.length === 0 && !specialPriceOther.trim())
                        }
                        onClick={() => {
                          const newTotal = parseFloat(specialPriceInput);
                          const pct = basePrice > 0 ? ((basePrice - newTotal) / basePrice) * 100 : 0;
                          setDiscount(String(Math.round(pct * 100) / 100));
                          const note = [
                            ...specialPriceReasons,
                            ...(specialPriceOther.trim() ? [specialPriceOther.trim()] : []),
                          ].join("; ");
                          setSpecialPriceNote(note);
                          setSpecialPriceOpen(false);
                        }}
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <Label>Discount (%)</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      placeholder="0"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Mode of Payment</Label>
                  <Select value={paymentMode} onValueChange={(v) => { setPaymentMode(v); setPaymentSubMode([]); }}>
                    <SelectTrigger><SelectValue placeholder="Select payment method..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Credit Card">Credit Card</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="eWallet">eWallet</SelectItem>
                      <SelectItem value="Class Pass">Class Pass</SelectItem>
                    </SelectContent>
                  </Select>
                  {paymentMode === "Bank Transfer" && (
                    <Select value={paymentSubMode[0] ?? ""} onValueChange={(v) => setPaymentSubMode([v])}>
                      <SelectTrigger><SelectValue placeholder="Select bank..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BDO">BDO</SelectItem>
                        <SelectItem value="BPI">BPI</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  {paymentMode === "eWallet" && (
                    <Select value={paymentSubMode[0] ?? ""} onValueChange={(v) => setPaymentSubMode([v])}>
                      <SelectTrigger><SelectValue placeholder="Select e-wallet..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GCash">GCash</SelectItem>
                        <SelectItem value="Maya">Maya</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
                {/* Receipt photo */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <input
                      type="checkbox"
                      id="membershipNeedsReceiptCheck"
                      checked={membershipNeedsReceipt}
                      onChange={(e) => setMembershipNeedsReceipt(e.target.checked)}
                      className="h-4 w-4 accent-primary cursor-pointer"
                    />
                    <label htmlFor="membershipNeedsReceiptCheck" className="text-xs font-medium cursor-pointer select-none">Needs Receipt</label>
                  </div>
                  <Label>Receipt / Proof of Payment <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
                  {receiptPreview ? (
                    <div className="relative w-full">
                      <img src={receiptPreview} alt="Receipt preview" className="w-full max-h-40 object-cover rounded-lg border" />
                      <button
                        type="button"
                        onClick={() => { setReceiptFile(null); setReceiptPreview(null); setReceiptStatus("idle"); }}
                        className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full p-0.5 hover:bg-black/80"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                      {receiptStatus === "done" && (
                        <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 bg-green-600 text-white text-xs px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="h-3 w-3" /> Uploaded
                        </div>
                      )}
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 cursor-pointer border-2 border-dashed border-border rounded-lg px-4 py-3 hover:border-primary/50 transition-colors">
                      <Camera className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Take photo or choose image</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setReceiptFile(file);
                          setReceiptPreview(URL.createObjectURL(file));
                          setReceiptStatus("idle");
                        }}
                      />
                    </label>
                  )}
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssign(false)}>Cancel</Button>
            <Button onClick={() => assignMembership()} disabled={!selectedServiceId || !selectedPackageId || !paymentMode || (["Bank Transfer","eWallet"].includes(paymentMode) && paymentSubMode.length === 0) || assigning}>
              {assigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign Membership
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* HIGH-8: Duplicate membership confirmation */}
      <Dialog open={showDupConfirm} onOpenChange={(o) => !o && setShowDupConfirm(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="h-4 w-4" />Duplicate Membership
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This athlete already has an active <span className="font-medium text-foreground">{services.find((s) => s.id === selectedServiceId)?.name}</span> membership. Are you sure you want to assign another?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDupConfirm(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { setShowDupConfirm(false); assignMembership(true); }}>
              Assign Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Force check-in confirmation */}
      <Dialog open={!!forceCheckIn} onOpenChange={(o) => !o && setForceCheckIn(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="h-4 w-4" />
              Already Checked In Today
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{member.firstName}</span> already checked
            in today at{" "}
            <span className="font-medium text-foreground">
              {forceCheckIn?.checkedInAt
                ? new Date(forceCheckIn.checkedInAt).toLocaleTimeString("en-PH", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                    timeZone,
                  })
                : "—"}
            </span>
            . Check in again?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setForceCheckIn(null)}>Cancel</Button>
            <Button onClick={() => { setForceCheckIn(null); submitCheckIn(true); }}>
              Check In Again
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Rank Dialog */}
      <Dialog open={!!rankDialog} onOpenChange={(o) => { if (!o) setRankDialog(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{rankDialog?.mode === "add" ? "Add Rank Record" : "Edit Rank Record"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Martial Art</Label>
              <Select
                value={rankForm.martialArt}
                onValueChange={(v) => setRankForm(f => ({ ...f, martialArt: v, rank: "" }))}
              >
                <SelectTrigger><SelectValue placeholder="Select martial art" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BJJ">Brazilian Jiu-Jitsu</SelectItem>
                  <SelectItem value="Judo">Judo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Rank</Label>
              <Select
                value={rankForm.rank}
                onValueChange={(v) => setRankForm(f => ({ ...f, rank: v }))}
                disabled={!rankForm.martialArt}
              >
                <SelectTrigger><SelectValue placeholder={rankForm.martialArt ? "Select rank" : "Select martial art first"} /></SelectTrigger>
                <SelectContent>
                  {rankForm.martialArt === "BJJ" && (
                    <>
                      <SelectItem value="— Kids Ranks —" disabled>— Kids Ranks —</SelectItem>
                      <SelectItem value="Kids White Belt">Kids White Belt</SelectItem>
                      <SelectItem value="Grey/White Belt">Grey/White Belt</SelectItem>
                      <SelectItem value="Solid Grey Belt">Solid Grey Belt</SelectItem>
                      <SelectItem value="Grey/Black Belt">Grey/Black Belt</SelectItem>
                      <SelectItem value="Yellow/White Belt">Yellow/White Belt</SelectItem>
                      <SelectItem value="Solid Yellow Belt">Solid Yellow Belt</SelectItem>
                      <SelectItem value="Yellow/Black Belt">Yellow/Black Belt</SelectItem>
                      <SelectItem value="Orange/White Belt">Orange/White Belt</SelectItem>
                      <SelectItem value="Solid Orange Belt">Solid Orange Belt</SelectItem>
                      <SelectItem value="Orange/Black Belt">Orange/Black Belt</SelectItem>
                      <SelectItem value="Green/White Belt">Green/White Belt</SelectItem>
                      <SelectItem value="Solid Green Belt">Solid Green Belt</SelectItem>
                      <SelectItem value="Green/Black Belt">Green/Black Belt</SelectItem>
                      <SelectItem value="— Adult Ranks —" disabled>— Adult Ranks —</SelectItem>
                      <SelectItem value="White Belt">White Belt</SelectItem>
                      <SelectItem value="Blue Belt">Blue Belt</SelectItem>
                      <SelectItem value="Purple Belt">Purple Belt</SelectItem>
                      <SelectItem value="Brown Belt">Brown Belt</SelectItem>
                      <SelectItem value="Black Belt">Black Belt</SelectItem>
                      <SelectItem value="Red/Black Belt (Coral)">Red/Black Belt (Coral)</SelectItem>
                      <SelectItem value="Red/White Belt (Coral)">Red/White Belt (Coral)</SelectItem>
                      <SelectItem value="Red Belt">Red Belt</SelectItem>
                    </>
                  )}
                  {rankForm.martialArt === "Judo" && (
                    <>
                      <SelectItem value="— Kids Ranks —" disabled>— Kids Ranks —</SelectItem>
                      <SelectItem value="Kids White Belt">Kids White Belt</SelectItem>
                      <SelectItem value="Kids Yellow Belt">Kids Yellow Belt</SelectItem>
                      <SelectItem value="Kids Orange Belt">Kids Orange Belt</SelectItem>
                      <SelectItem value="Kids Green Belt">Kids Green Belt</SelectItem>
                      <SelectItem value="Kids Blue Belt">Kids Blue Belt</SelectItem>
                      <SelectItem value="Kids Brown Belt">Kids Brown Belt</SelectItem>
                      <SelectItem value="— Kyu Grades —" disabled>— Kyu Grades —</SelectItem>
                      <SelectItem value="6th Kyu - White Belt">6th Kyu - White Belt</SelectItem>
                      <SelectItem value="5th Kyu - Yellow Belt">5th Kyu - Yellow Belt</SelectItem>
                      <SelectItem value="4th Kyu - Orange Belt">4th Kyu - Orange Belt</SelectItem>
                      <SelectItem value="3rd Kyu - Green Belt">3rd Kyu - Green Belt</SelectItem>
                      <SelectItem value="2nd Kyu - Blue Belt">2nd Kyu - Blue Belt</SelectItem>
                      <SelectItem value="1st Kyu - Brown Belt">1st Kyu - Brown Belt</SelectItem>
                      <SelectItem value="— Dan Grades —" disabled>— Dan Grades —</SelectItem>
                      <SelectItem value="1st Dan - Black Belt">1st Dan - Black Belt</SelectItem>
                      <SelectItem value="2nd Dan - Black Belt">2nd Dan - Black Belt</SelectItem>
                      <SelectItem value="3rd Dan - Black Belt">3rd Dan - Black Belt</SelectItem>
                      <SelectItem value="4th Dan - Black Belt">4th Dan - Black Belt</SelectItem>
                      <SelectItem value="5th Dan - Black Belt">5th Dan - Black Belt</SelectItem>
                      <SelectItem value="6th Dan - Red/White Belt">6th Dan - Red/White Belt</SelectItem>
                      <SelectItem value="7th Dan - Red/White Belt">7th Dan - Red/White Belt</SelectItem>
                      <SelectItem value="8th Dan - Red/White Belt">8th Dan - Red/White Belt</SelectItem>
                      <SelectItem value="9th Dan - Red Belt">9th Dan - Red Belt</SelectItem>
                      <SelectItem value="10th Dan - Red Belt">10th Dan - Red Belt</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            {rankForm.martialArt === "BJJ" && (
              <div className="space-y-1">
                <Label>Stripes <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Select
                  value={rankForm.stripes}
                  onValueChange={(v) => setRankForm(f => ({ ...f, stripes: v }))}
                >
                  <SelectTrigger><SelectValue placeholder="No stripes" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No stripes</SelectItem>
                    <SelectItem value="1">1 Stripe</SelectItem>
                    <SelectItem value="2">2 Stripes</SelectItem>
                    <SelectItem value="3">3 Stripes</SelectItem>
                    <SelectItem value="4">4 Stripes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1">
              <Label>Date Awarded</Label>
              <Input
                type="date"
                value={rankForm.awardedAt}
                onChange={(e) => setRankForm(f => ({ ...f, awardedAt: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Awarded by</Label>
              <Input
                value={rankForm.awardedBy}
                onChange={(e) => setRankForm(f => ({ ...f, awardedBy: e.target.value }))}
                placeholder="Professor / Instructor name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRankDialog(null)}>Cancel</Button>
            <Button onClick={saveRank} disabled={savingRank || !rankForm.martialArt || !rankForm.rank || !rankForm.awardedAt}>
              {savingRank && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Rank Confirmation Dialog */}
      <Dialog open={!!deletingRank} onOpenChange={(o) => { if (!o) { setDeletingRank(null); setDeletingRankConfirm(false); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />Delete Rank Record
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Remove <span className="font-medium text-foreground">{deletingRank?.rank}</span> ({deletingRank?.martialArt}) awarded on {deletingRank ? formatDate(deletingRank.awardedAt) : ""}? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeletingRank(null); setDeletingRankConfirm(false); }}>Cancel</Button>
            <Button variant="destructive" onClick={deleteRank} disabled={deletingRankConfirm}>
              {deletingRankConfirm && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Booking Dialog */}
      <Dialog open={!!cancelBooking} onOpenChange={(o) => { if (!o) { setCancelBooking(null); setCancelReason(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />Cancel Booking
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-sm">
            <p className="text-muted-foreground">
              Cancel <span className="font-medium text-foreground">{cancelBooking?.session?.classType}</span> on{" "}
              <span className="font-medium text-foreground">{cancelBooking ? formatDate(cancelBooking.session.startsAt) : ""}</span>?
              {cancelBooking?.subscription?.sessionsTotal != null && " The session will be returned to their membership balance."}
            </p>
            <div className="space-y-1">
              <Label>Reason <span className="text-muted-foreground">(optional)</span></Label>
              <Input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="e.g. Athlete request, injury..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCancelBooking(null); setCancelReason(""); }}>Keep</Button>
            <Button variant="destructive" onClick={confirmCancelBooking} disabled={cancellingBooking}>
              {cancellingBooking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cancel Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={showEditProfile} onOpenChange={(o) => { if (!o) setShowEditProfile(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {/* Photo upload */}
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 shrink-0">
                <AvatarImage src={photoPreview ?? member.photoUrl ?? ""} />
                <AvatarFallback>{getInitials(`${editForm.firstName} ${editForm.lastName}`)}</AvatarFallback>
              </Avatar>
              <div className="space-y-1 flex-1">
                <Label>Profile Photo</Label>
                <Input type="file" accept="image/*" onChange={onPhotoChange} className="text-xs cursor-pointer" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Athlete ID <span className="text-muted-foreground text-xs">(auto-assigned on activation)</span></Label>
              <Input value={editForm.memberNumber || "Not yet assigned"} readOnly disabled className="font-mono bg-muted cursor-not-allowed" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>First Name</Label>
                <Input value={editForm.firstName} onChange={(e) => setEditForm(f => ({ ...f, firstName: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Last Name</Label>
                <Input value={editForm.lastName} onChange={(e) => setEditForm(f => ({ ...f, lastName: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" value={editForm.email} onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))} placeholder="athlete@example.com" />
            </div>
            <div className="space-y-1">
              <Label>Gender</Label>
              <Select value={editForm.gender} onValueChange={(v) => setEditForm(f => ({ ...f, gender: v }))}>
                <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                  <SelectItem value="Would Rather Not Say">Would Rather Not Say</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input value={editForm.phone} onChange={(e) => setEditForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 555-0100" />
            </div>
            <div className="space-y-1">
              <Label>Date of Birth</Label>
              <Input type="date" value={editForm.dateOfBirth} onChange={(e) => setEditForm(f => ({ ...f, dateOfBirth: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Address</Label>
              <Input value={editForm.address} onChange={(e) => setEditForm(f => ({ ...f, address: e.target.value }))} placeholder="Street, City, Province" />
            </div>
            <div className="space-y-1">
              <Label>Registered</Label>
              <Input value={member.joinDate ? formatDate(member.joinDate) : "Not yet registered"} readOnly disabled className="bg-muted cursor-not-allowed" />
            </div>
            <div className="space-y-1">
              <Label>Activated</Label>
              <Input value={member.activatedAt ? formatDate(member.activatedAt) : "Not yet activated"} readOnly disabled className="bg-muted cursor-not-allowed" />
            </div>
            <div className="space-y-1">
              <Label>How did you hear about us?</Label>
              <Select value={editForm.source || "__none__"} onValueChange={(v) => setEditForm(f => ({ ...f, source: v === "__none__" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Select source…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Not specified —</SelectItem>
                  {MEMBER_SOURCE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditProfile(false)}>Cancel</Button>
            <Button onClick={saveProfile} disabled={savingProfile || !editForm.firstName || !editForm.lastName}>
              {savingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Check-in modal */}
      <Dialog open={showCheckIn} onOpenChange={(o) => { setShowCheckIn(o); if (!o) setSelectedSchedule(null); }}>
        <DialogContent className="max-w-sm flex flex-col max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Check In — {member.firstName} {member.lastName}</DialogTitle>
          </DialogHeader>
          {scheduleLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : todaySchedule.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No classes scheduled today that match this member's memberships.</p>
          ) : (
            <div className="overflow-y-auto flex-1 space-y-2 py-2 pr-1">
              <p className="text-sm text-muted-foreground mb-3">Select today's class:</p>
              {todaySchedule.map((slot: any) => {
                const selected = selectedSchedule?.id === slot.id;
                const coaches = slot.coaches.map((c: any) => `${c.employee.firstName} ${c.employee.lastName}`).join(", ");
                // A slot is exhausted only if no pack with sessions remains for any allowed service
                const slotAllowedIds: string[] = slot.classDef.allowedServices.map((as: any) => as.serviceId);
                const isExhausted = slotAllowedIds.length === 0
                  ? activeSubs.every((s: any) => s.sessionsTotal !== null && s.sessionsUsed >= s.sessionsTotal)
                  : slotAllowedIds.every((id: string) => nextSubForService(id) === null);
                return (
                  <button
                    key={slot.id}
                    onClick={() => !isExhausted && setSelectedSchedule(slot)}
                    disabled={isExhausted}
                    className={`w-full rounded-lg border px-4 py-3 text-left transition-colors ${
                      isExhausted
                        ? "border-border opacity-50 cursor-not-allowed"
                        : selected
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:bg-accent"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: slot.classDef.color }} />
                      <span className="font-semibold text-sm">{slot.classDef.name}</span>
                      {isExhausted && <span className="ml-auto text-xs text-destructive font-medium">No sessions left</span>}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground pl-5">
                      {formatTime(slot.startTime)} – {formatTime(slot.endTime)}
                      {coaches && ` · ${coaches}`}
                      {slot.location && ` · ${slot.location}`}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          <DialogFooter className="pt-2 border-t">
            <Button variant="outline" onClick={() => { setShowCheckIn(false); setSelectedSchedule(null); }}>Cancel</Button>
            <Button onClick={() => submitCheckIn()} disabled={checkingIn || !selectedSchedule}>
              {checkingIn && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Check In
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
