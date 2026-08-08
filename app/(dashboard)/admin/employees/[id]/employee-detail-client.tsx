"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeft, User, CreditCard, CheckCircle2, Clock, XCircle } from "lucide-react";
import Link from "next/link";
import { SortableHeader } from "@/components/ui/sortable-header";

const STATUS_STYLES: Record<string, { label: string; icon: any; className: string }> = {
  ACTIVE: { label: "Active", icon: CheckCircle2, className: "bg-green-100 text-green-800 border-green-200" },
  PAUSED: { label: "Paused", icon: Clock, className: "bg-amber-100 text-amber-800 border-amber-200" },
  EXPIRED: { label: "Expired", icon: XCircle, className: "bg-gray-100 text-gray-600 border-gray-200" },
  CANCELLED: { label: "Cancelled", icon: XCircle, className: "bg-red-100 text-red-700 border-red-200" },
};

export function EmployeeDetailClient({ employee, isAdmin }: { employee: any; isAdmin: boolean }) {
  const router = useRouter();
  const [tab, setTab] = useState("info");
  const [historySortDir, setHistorySortDir] = useState<"asc" | "desc">("desc");

  const activeSubscriptions = employee.subscriptions.filter((s: any) => s.status === "ACTIVE");
  const pastSubscriptions = employee.subscriptions.filter((s: any) => s.status !== "ACTIVE");
  const fullName = `${employee.firstName} ${employee.lastName}`;
  const types: string[] = employee.employeeTypes?.length ? employee.employeeTypes : [employee.employeeType ?? "STAFF"];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/employees"><ArrowLeft className="h-4 w-4 mr-1" />Employees</Link>
        </Button>
      </div>

      <div className="flex items-center gap-4">
        {employee.photoUrl ? (
          <img src={employee.photoUrl} alt={fullName} className="h-16 w-16 rounded-full object-cover border" />
        ) : (
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-xl font-semibold text-muted-foreground">
            {employee.firstName[0]}{employee.lastName[0]}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold">{fullName}</h1>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {types.map((t: string) => (
              <Badge key={t} variant="secondary" className="capitalize text-xs">{t.toLowerCase()}</Badge>
            ))}
            {employee.title && <span className="text-sm text-muted-foreground">· {employee.title}</span>}
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="info" className="gap-2"><User className="h-4 w-4" />Info</TabsTrigger>
          <TabsTrigger value="memberships" className="gap-2">
            <CreditCard className="h-4 w-4" />Memberships
            {activeSubscriptions.length > 0 && (
              <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1">
                {activeSubscriptions.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* INFO TAB */}
        <TabsContent value="info" className="mt-4">
          <div className="rounded-lg border divide-y">
            {[
              { label: "Email", value: employee.user?.email ?? "—" },
              { label: "Phone", value: employee.phone ?? "—" },
              { label: "Employee #", value: employee.employeeNumber ?? "—" },
              { label: "Hire Date", value: employee.hireDate ? new Date(employee.hireDate).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" }) : "—" },
              { label: "Date of Birth", value: employee.dateOfBirth ? new Date(employee.dateOfBirth).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" }) : "—" },
              { label: "Belt", value: employee.belt ?? "—" },
              { label: "Status", value: employee.isActive ? "Active" : "Inactive" },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-start px-4 py-3 gap-4">
                <span className="text-sm font-medium text-muted-foreground w-32 shrink-0">{label}</span>
                <span className="text-sm">{value}</span>
              </div>
            ))}
            {employee.taughtServices?.length > 0 && (
              <div className="flex items-start px-4 py-3 gap-4">
                <span className="text-sm font-medium text-muted-foreground w-32 shrink-0">Classes Taught</span>
                <div className="flex flex-wrap gap-1.5">
                  {employee.taughtServices.map((ts: any) => (
                    <span key={ts.serviceId} className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: ts.service?.color ?? "#6b7280" }}>
                      {ts.service?.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* MEMBERSHIPS TAB */}
        <TabsContent value="memberships" className="mt-4 space-y-6">
          {employee.subscriptions.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
              No membership packages assigned yet.
            </div>
          ) : (
            <>
              {activeSubscriptions.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm mb-2">Active</h3>
                  <div className="rounded-md border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left px-4 py-2 font-medium">Service</th>
                          <th className="text-left px-4 py-2 font-medium">Status</th>
                          <th className="text-right px-4 py-2 font-medium">Sessions</th>
                          <th className="text-left px-4 py-2 font-medium">Expires</th>
                          <th className="text-right px-4 py-2 font-medium">Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {activeSubscriptions.map((sub: any) => {
                          const st = STATUS_STYLES[sub.status] ?? STATUS_STYLES.ACTIVE;
                          return (
                            <tr key={sub.id} className="hover:bg-muted/30">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: sub.service?.color ?? "#6b7280" }} />
                                  <span className="font-medium">{sub.service?.name}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${st.className}`}>
                                  <st.icon className="h-3 w-3" />{st.label}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                {sub.sessionsTotal == null
                                  ? "Unlimited"
                                  : `${sub.sessionsUsed} / ${sub.sessionsTotal}`}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {sub.endDate ? new Date(sub.endDate).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) : "No expiry"}
                              </td>
                              <td className="px-4 py-3 text-right font-medium">{formatCurrency(sub.price)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {pastSubscriptions.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm mb-2 text-muted-foreground">History</h3>
                  <div className="rounded-md border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left px-4 py-2 font-medium">Service</th>
                          <th className="text-left px-4 py-2 font-medium">Status</th>
                          <th className="text-right px-4 py-2 font-medium">Sessions</th>
                          <th className="text-left px-4 py-2 font-medium">
                            <SortableHeader label="Period" direction={historySortDir} onClick={() => setHistorySortDir((d) => (d === "asc" ? "desc" : "asc"))} />
                          </th>
                          <th className="text-right px-4 py-2 font-medium">Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {[...pastSubscriptions].sort((a: any, b: any) => {
                          const diff = new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
                          return historySortDir === "asc" ? diff : -diff;
                        }).map((sub: any) => {
                          const st = STATUS_STYLES[sub.status] ?? STATUS_STYLES.EXPIRED;
                          return (
                            <tr key={sub.id} className="hover:bg-muted/30 opacity-70">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span className="h-2.5 w-2.5 rounded-full shrink-0 bg-gray-400" />
                                  <span className="font-medium">{sub.service?.name}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${st.className}`}>
                                  <st.icon className="h-3 w-3" />{st.label}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                {sub.sessionsTotal == null ? "Unlimited" : `${sub.sessionsUsed} / ${sub.sessionsTotal}`}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground text-xs">
                                {new Date(sub.startDate).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                                {sub.endDate && ` — ${new Date(sub.endDate).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}`}
                              </td>
                              <td className="px-4 py-3 text-right font-medium">{formatCurrency(sub.price)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
