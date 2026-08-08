"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Award, Calendar, CreditCard, CheckSquare, Mail, Phone, AlertTriangle, MapPin, Cake, Snowflake, Camera, Loader2, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDate, formatCurrency, getInitials } from "@/lib/utils";
import { toast } from "@/lib/use-toast";
import { DocumentsSection } from "./documents-section";
import { RecordStatusIndicator, recordTextClass } from "@/components/records/record-status-badge";
import { AwardSelect } from "@/components/records/award-select";
import { SortableHeader } from "@/components/ui/sortable-header";

const STATUS_COLORS: Record<string, any> = {
  ACTIVE: "success", FROZEN: "warning", INACTIVE: "secondary", CANCELLED: "destructive",
};

export function MemberProfileClient({ member }: { member: any }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [emergencyEdit, setEmergencyEdit] = useState(false);
  const [emergencyForm, setEmergencyForm] = useState({
    name: member.emergencyName ?? "",
    phone: member.emergencyPhone ?? "",
    rel: member.emergencyRel ?? "",
  });
  const [emergencySaving, setEmergencySaving] = useState(false);
  const [emergencyError, setEmergencyError] = useState("");

  const [contactEdit, setContactEdit] = useState(false);
  const [contactForm, setContactForm] = useState({
    phone: member.phone ?? "",
    dateOfBirth: member.dateOfBirth ? new Date(member.dateOfBirth).toISOString().slice(0, 10) : "",
    address: member.address ?? "",
  });
  const [contactSaving, setContactSaving] = useState(false);
  const [contactError, setContactError] = useState("");

  async function saveContact() {
    setContactSaving(true);
    setContactError("");
    try {
      const res = await fetch(`/api/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: contactForm.phone || null,
          dateOfBirth: contactForm.dateOfBirth || null,
          address: contactForm.address || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setContactEdit(false);
      router.refresh();
    } catch {
      setContactError("Something went wrong. Please try again.");
    } finally {
      setContactSaving(false);
    }
  }

  async function saveEmergency() {
    setEmergencySaving(true);
    setEmergencyError("");
    try {
      const res = await fetch(`/api/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emergencyName: emergencyForm.name,
          emergencyPhone: emergencyForm.phone,
          emergencyRel: emergencyForm.rel,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setEmergencyEdit(false);
      router.refresh();
    } catch {
      setEmergencyError("Something went wrong. Please try again.");
    } finally {
      setEmergencySaving(false);
    }
  }

  const [addRecordOpen, setAddRecordOpen] = useState(false);
  const [rankForm, setRankForm] = useState({ martialArt: "", rank: "", details: "", awardedAt: "", awardedBy: "", photoUrl: "" });
  const [savingRank, setSavingRank] = useState(false);
  const [rankError, setRankError] = useState("");
  const [uploadingRankPhoto, setUploadingRankPhoto] = useState(false);
  const [recordsSortDir, setRecordsSortDir] = useState<"asc" | "desc">("desc");
  const [attendanceSortDir, setAttendanceSortDir] = useState<"asc" | "desc">("desc");

  function openAddRecord() {
    setRankForm({ martialArt: "", rank: "", details: "", awardedAt: new Date().toISOString().slice(0, 10), awardedBy: "", photoUrl: "" });
    setRankError("");
    setAddRecordOpen(true);
  }

  async function handleRankPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingRankPhoto(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("memberId", member.id);
      const res = await fetch("/api/upload/record-photo", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setRankForm((f) => ({ ...f, photoUrl: data.url }));
    } catch {
      toast({ variant: "destructive", title: "Could not upload photo" });
    } finally {
      setUploadingRankPhoto(false);
      e.target.value = "";
    }
  }

  async function saveRecord() {
    setSavingRank(true);
    setRankError("");
    try {
      const res = await fetch("/api/ranks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: member.id,
          martialArt: rankForm.martialArt,
          rank: rankForm.rank,
          awardedAt: rankForm.awardedAt,
          awardedBy: rankForm.awardedBy || undefined,
          details: rankForm.details || undefined,
          photoUrl: rankForm.photoUrl || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setAddRecordOpen(false);
      toast({ title: "Record submitted", description: "Pending approval from a coach or admin." });
      router.refresh();
    } catch {
      setRankError("Something went wrong. Please try again.");
    } finally {
      setSavingRank(false);
    }
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoPreview(URL.createObjectURL(file));
    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("memberId", member.id);
      const upRes = await fetch("/api/upload", { method: "POST", body: fd });
      if (!upRes.ok) throw new Error("Upload failed");
      const { url } = await upRes.json();
      const patchRes = await fetch(`/api/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrl: url }),
      });
      if (!patchRes.ok) throw new Error();
      toast({ title: "Photo updated" });
      router.refresh();
    } catch {
      toast({ variant: "destructive", title: "Could not upload photo" });
      setPhotoPreview(null);
    } finally {
      setUploadingPhoto(false);
    }
  }

  const fullName = `${member.firstName} ${member.lastName}`;

  const ninetyDaysFromNow = Date.now() + 90 * 86400000;
  const sortPriority = (s: any) => {
    if (!s.sessionsTotal && s.endDate && new Date(s.endDate).getTime() > ninetyDaysFromNow) return 0;
    if (!s.sessionsTotal && !s.endDate) return 1;
    return 2;
  };
  const visibleSubs = member.subscriptions
    .filter((s: any) => s.status === "ACTIVE" || s.status === "PAUSED")
    .sort((a: any, b: any) => {
      const pa = sortPriority(a), pb = sortPriority(b);
      if (pa !== pb) return pa - pb;
      if (a.endDate && b.endDate) return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    });

  // Group rank records by martial art
  const rankGroups: Record<string, any[]> = {};
  for (const r of member.rankRecords) {
    if (!rankGroups[r.martialArt]) rankGroups[r.martialArt] = [];
    rankGroups[r.martialArt].push(r);
  }

  // Latest rank per art for header badges (rankRecords sorted desc by awardedAt) — approved only
  const latestRanks: Record<string, { rank: string; stripes?: number | null }> = {};
  for (const r of member.rankRecords) {
    if (r.status !== "APPROVED") continue;
    if (!latestRanks[r.martialArt]) latestRanks[r.martialArt] = { rank: r.rank, stripes: r.stripes };
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-4">
        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
          <Avatar className="h-20 w-20">
            <AvatarImage src={photoPreview ?? member.photoUrl ?? ""} />
            <AvatarFallback className="text-2xl">{getInitials(fullName)}</AvatarFallback>
          </Avatar>
          <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            {uploadingPhoto
              ? <Loader2 className="h-5 w-5 text-white animate-spin" />
              : <Camera className="h-5 w-5 text-white" />}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold">{fullName}</h1>
            <Badge variant={STATUS_COLORS[member.status]}>{member.status}</Badge>
            {member.memberNumber && (
              <span className="text-xs font-mono px-2 py-0.5 rounded-md border bg-muted text-muted-foreground">
                {member.memberNumber}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
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
              <span className="flex items-center gap-1">Heard via: {member.source}</span>
            )}
            <button
              onClick={() => setContactEdit(true)}
              className="flex items-center gap-1 text-xs text-primary hover:underline font-medium ml-auto"
            >
              <Pencil className="h-3 w-3" />Edit Info
            </button>
          </div>
          {Object.entries(latestRanks).length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.entries(latestRanks).map(([art, { rank, stripes }]) => (
                <span key={art} className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium">
                  <Award className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">{art}:</span>
                  <span>{rank}{stripes ? ` ${stripes} stripe${stripes > 1 ? "s" : ""}` : ""}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Emergency Contact */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />Emergency Contact
            </CardTitle>
            <button
              onClick={() => setEmergencyEdit(true)}
              className="text-xs text-primary hover:underline font-medium"
            >
              Edit
            </button>
          </CardHeader>
          <CardContent>
            {member.emergencyName ? (
              <div className="space-y-1 text-sm">
                <p className="font-medium">{member.emergencyName}</p>
                {member.emergencyPhone && <p className="text-muted-foreground">{member.emergencyPhone}</p>}
                {member.emergencyRel && <p className="text-muted-foreground">{member.emergencyRel}</p>}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No emergency contact on file.</p>
            )}
          </CardContent>
        </Card>

        {/* Emergency Contact Edit Modal */}
        {emergencyEdit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-background rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
              <h2 className="text-base font-bold">Emergency Contact</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Full Name</label>
                  <input
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    value={emergencyForm.name}
                    onChange={(e) => setEmergencyForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Contact name"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Phone Number</label>
                  <input
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    value={emergencyForm.phone}
                    onChange={(e) => setEmergencyForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="e.g. 09171234567"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Relationship</label>
                  <input
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    value={emergencyForm.rel}
                    onChange={(e) => setEmergencyForm(f => ({ ...f, rel: e.target.value }))}
                    placeholder="e.g. Spouse, Parent, Sibling"
                  />
                </div>
              </div>
              {emergencyError && <p className="text-xs text-destructive">{emergencyError}</p>}
              <div className="flex gap-2 justify-end pt-1">
                <button
                  onClick={() => { setEmergencyEdit(false); setEmergencyError(""); }}
                  className="px-4 py-2 text-sm rounded-md border hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEmergency}
                  disabled={emergencySaving}
                  className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  {emergencySaving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Contact Info Edit Modal */}
        {contactEdit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-background rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
              <h2 className="text-base font-bold">Edit Contact Info</h2>
              <p className="text-xs text-muted-foreground -mt-2">Email address cannot be changed here. Contact the gym to update your email.</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Phone Number</label>
                  <input
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    value={contactForm.phone}
                    onChange={(e) => setContactForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="e.g. 09171234567"
                    type="tel"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Date of Birth</label>
                  <input
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    value={contactForm.dateOfBirth}
                    onChange={(e) => setContactForm(f => ({ ...f, dateOfBirth: e.target.value }))}
                    type="date"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Address</label>
                  <textarea
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    rows={2}
                    value={contactForm.address}
                    onChange={(e) => setContactForm(f => ({ ...f, address: e.target.value }))}
                    placeholder="Street, City"
                  />
                </div>
              </div>
              {contactError && <p className="text-xs text-destructive">{contactError}</p>}
              <div className="flex gap-2 justify-end pt-1">
                <button
                  onClick={() => { setContactEdit(false); setContactError(""); }}
                  className="px-4 py-2 text-sm rounded-md border hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  onClick={saveContact}
                  disabled={contactSaving}
                  className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  {contactSaving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Records */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-4 w-4" />Records
            </CardTitle>
            <button onClick={openAddRecord} className="text-xs text-primary hover:underline font-medium">
              + Add Record
            </button>
          </CardHeader>
          <CardContent>
            {Object.keys(rankGroups).length === 0 ? (
              <p className="text-sm text-muted-foreground">No records yet.</p>
            ) : (
              <div className="space-y-5">
                {Object.entries(rankGroups).map(([art, groupRecords]) => {
                  const latest = groupRecords.find((r: any) => r.status === "APPROVED") ?? groupRecords[0];
                  const records = [...groupRecords].sort((a: any, b: any) => {
                    const diff = new Date(a.awardedAt).getTime() - new Date(b.awardedAt).getTime();
                    return recordsSortDir === "asc" ? diff : -diff;
                  });
                  return (
                    <div key={art}>
                      <div className="mb-2">
                        <p className="text-sm font-semibold">{art}</p>
                        <p className="text-xs text-muted-foreground">
                          Current: <span className="font-medium text-foreground">{latest.rank}</span>
                          {latest.awardedBy && <> · {latest.awardedBy}</>}
                        </p>
                      </div>
                      <div className="rounded-md border overflow-hidden">
                        <table className="w-full text-xs table-fixed">
                          <thead>
                            <tr className="bg-muted/50 border-b">
                              <th className="text-left px-3 py-2 font-medium text-muted-foreground">Rank</th>
                              <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                                <SortableHeader
                                  label="Awarded"
                                  direction={recordsSortDir}
                                  onClick={() => setRecordsSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                                />
                              </th>
                              <th className="text-left px-3 py-2 font-medium text-muted-foreground">Awarded by</th>
                            </tr>
                          </thead>
                          <tbody>
                            {records.map((r: any, i: number) => (
                              <tr key={r.id} className={i !== records.length - 1 ? "border-b" : ""}>
                                <td className={`px-3 py-2 font-medium ${recordTextClass(r.status)}`}>
                                  <span className="inline-flex items-center gap-1.5">
                                    {r.rank}{r.stripes ? ` · ${r.stripes}S` : ""}
                                    <RecordStatusIndicator status={r.status} rejectionReason={r.rejectionReason} />
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-muted-foreground">{formatDate(r.awardedAt)}</td>
                                <td className="px-3 py-2 text-muted-foreground">{r.awardedBy ?? "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Class Attendance */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />Class Attendance
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {member.bookings.length === 0 ? (
              <p className="text-sm text-muted-foreground px-6 py-4">No class bookings yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground">
                        <SortableHeader
                          label="Date & Time"
                          direction={attendanceSortDir}
                          onClick={() => setAttendanceSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                        />
                      </th>
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground">Class</th>
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground">Membership Used</th>
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...member.bookings].sort((a: any, b: any) => {
                      const diff = new Date(a.session.startsAt).getTime() - new Date(b.session.startsAt).getTime();
                      return attendanceSortDir === "asc" ? diff : -diff;
                    }).map((b: any) => (
                      <tr key={b.id} className={`border-b last:border-0 ${b.status === "CANCELLED" ? "opacity-50" : ""}`}>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <p className="font-medium">{formatDate(b.session.startsAt)}</p>
                          <p className="text-muted-foreground">
                            {new Date(b.session.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            {" – "}
                            {new Date(b.session.endsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </td>
                        <td className="px-4 py-2.5">
                          <p className="font-medium">{b.session.classType}</p>
                          {b.session.location && <p className="text-muted-foreground">{b.session.location}</p>}
                        </td>
                        <td className="px-4 py-2.5">
                          {b.subscription
                            ? <><p className="font-medium">{b.subscription.service.name}</p>
                               {b.subscription.sessionsTotal != null && <p className="text-muted-foreground">Session-based</p>}</>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {(member.notes || member.medicalNotes) && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Notes</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {member.notes && (
              <div><p className="font-medium text-muted-foreground mb-1">General</p><p>{member.notes}</p></div>
            )}
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

      {/* Documents */}
      <DocumentsSection waiverDate={member.waiverDate} privacyAcceptedAt={member.privacyAcceptedAt} />

      {/* Add Record Modal */}
      {addRecordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-bold">Add Record</h2>
            <p className="text-xs text-muted-foreground -mt-2">New records are pending approval from a coach or admin.</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Award</label>
                <div className="mt-1">
                  <AwardSelect
                    value={rankForm.martialArt}
                    onChange={(v) => setRankForm(f => ({ ...f, martialArt: v }))}
                    canManage={false}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Achievement</label>
                <input
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  value={rankForm.rank}
                  onChange={(e) => setRankForm(f => ({ ...f, rank: e.target.value }))}
                  placeholder="e.g. CF-L1, Black Belt, Gold, etc."
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Date</label>
                <input
                  type="date"
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  value={rankForm.awardedAt}
                  onChange={(e) => setRankForm(f => ({ ...f, awardedAt: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Awarded by</label>
                <input
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  value={rankForm.awardedBy}
                  onChange={(e) => setRankForm(f => ({ ...f, awardedBy: e.target.value }))}
                  placeholder="e.g. Sensei Robert, Coach Sid, 6Sigma Philippines, etc."
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Details (optional)</label>
                <input
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  value={rankForm.details}
                  onChange={(e) => setRankForm(f => ({ ...f, details: e.target.value }))}
                  placeholder="e.g. SM MOA Concert Grounds, North-a-Palooza, Pan Asians, Philippine, etc."
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Photo (optional)</label>
                <div className="mt-1 flex items-center gap-3">
                  {rankForm.photoUrl && (
                    <img src={rankForm.photoUrl} alt="" className="h-10 w-10 rounded object-cover border shrink-0" />
                  )}
                  <label htmlFor="member-rank-photo-upload" className="cursor-pointer">
                    <span className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-muted transition-colors">
                      {uploadingRankPhoto && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      {uploadingRankPhoto ? "Uploading…" : rankForm.photoUrl ? "Replace Photo" : "Upload Photo"}
                    </span>
                  </label>
                  <input
                    id="member-rank-photo-upload"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={uploadingRankPhoto}
                    onChange={handleRankPhotoChange}
                  />
                </div>
              </div>
            </div>
            {rankError && <p className="text-xs text-destructive">{rankError}</p>}
            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => setAddRecordOpen(false)}
                className="px-4 py-2 text-sm rounded-md border hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={saveRecord}
                disabled={savingRank || !rankForm.martialArt || !rankForm.rank || !rankForm.awardedAt}
                className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {savingRank ? "Saving…" : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
