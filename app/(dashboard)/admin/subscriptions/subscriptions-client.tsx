"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Loader2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatDate, formatCurrency } from "@/lib/utils";
import { toast } from "@/lib/use-toast";
import { SortableHeader } from "@/components/ui/sortable-header";

const STATUS_BADGE: Record<string, any> = {
  ACTIVE: "success", PAUSED: "warning", EXPIRED: "secondary", CANCELLED: "destructive",
};

const schema = z.object({
  memberId: z.string().min(1, "Select a member"),
  serviceId: z.string().min(1, "Select a service"),
  billingCycle: z.enum(["MONTHLY", "QUARTERLY", "SEMI_ANNUAL", "ANNUAL"]),
  price: z.coerce.number().min(0),
  startDate: z.string().optional(),
  notes: z.string().optional(),
  paymentMethod: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function SubscriptionsClient({
  subscriptions,
  members,
  services,
  page,
  total,
  pageSize,
}: {
  subscriptions: any[];
  members: any[];
  services: any[];
  page: number;
  total: number;
  pageSize: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sort, setSort] = useState<{ field: "start" | "nextBill"; dir: "asc" | "desc" } | null>(null);

  function toggleSort(field: "start" | "nextBill") {
    setSort((prev) => {
      if (prev?.field !== field) return { field, dir: "desc" };
      return { field, dir: prev.dir === "asc" ? "desc" : "asc" };
    });
  }

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { billingCycle: "MONTHLY" },
  });

  // Auto-fill price when service is selected
  const selectedServiceId = watch("serviceId");
  const selectedService = services.find((s) => s.id === selectedServiceId);

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed");
      }
      toast({ title: "Subscription created" });
      reset();
      setShowAdd(false);
      router.refresh();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setLoading(false);
    }
  }

  const filtered = subscriptions
    .filter((s) => statusFilter === "ALL" || s.status === statusFilter)
    .sort((a, b) => {
      if (!sort) return 0;
      const field = sort.field === "start" ? "startDate" : "nextBillDate";
      const aTime = a[field] ? new Date(a[field]).getTime() : -Infinity;
      const bTime = b[field] ? new Date(b[field]).getTime() : -Infinity;
      const diff = aTime - bTime;
      return sort.dir === "asc" ? diff : -diff;
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Subscriptions</h1>
          <p className="text-muted-foreground">{total} total subscriptions</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="mr-2 h-4 w-4" />Add Subscription
        </Button>
      </div>

      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="PAUSED">Paused</SelectItem>
            <SelectItem value="EXPIRED">Expired</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium">Member</th>
                  <th className="text-left px-4 py-3 font-medium">Service</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Price</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Cycle</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">
                    <SortableHeader label="Start" direction={sort?.field === "start" ? sort.dir : null} onClick={() => toggleSort("start")} />
                  </th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">
                    <SortableHeader label="Next Bill" direction={sort?.field === "nextBill" ? sort.dir : null} onClick={() => toggleSort("nextBill")} />
                  </th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((sub) => (
                  <tr key={sub.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">
                      {sub.member
                        ? `${sub.member.firstName} ${sub.member.lastName}`
                        : sub.employee
                          ? `${sub.employee.firstName} ${sub.employee.lastName} (staff)`
                          : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: sub.service.color }} />
                        {sub.service.name}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">{formatCurrency(sub.price)}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell capitalize">
                      {sub.billingCycle.toLowerCase().replace("_", " ")}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                      {formatDate(sub.startDate)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                      {sub.nextBillDate ? formatDate(sub.nextBillDate) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_BADGE[sub.status]}>{sub.status}</Badge>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      No subscriptions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {total > pageSize && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total} subscriptions
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => router.push(`${pathname}?page=${page - 1}`)}
              className="px-3 py-1.5 rounded border bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              disabled={page * pageSize >= total}
              onClick={() => router.push(`${pathname}?page=${page + 1}`)}
              className="px-3 py-1.5 rounded border bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={(o) => !o && setShowAdd(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Subscription</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label>Member</Label>
              <Select onValueChange={(v) => setValue("memberId", v)}>
                <SelectTrigger><SelectValue placeholder="Select member..." /></SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.firstName} {m.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.memberId && <p className="text-xs text-destructive">{errors.memberId.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Service</Label>
              <Select onValueChange={(v) => {
                setValue("serviceId", v);
                const svc = services.find((s) => s.id === v);
                if (svc?.monthlyPrice) setValue("price", svc.monthlyPrice);
              }}>
                <SelectTrigger><SelectValue placeholder="Select service..." /></SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.serviceId && <p className="text-xs text-destructive">{errors.serviceId.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Price ($)</Label>
                <Input type="number" step="0.01" {...register("price")} />
                {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Billing Cycle</Label>
                <Select defaultValue="MONTHLY" onValueChange={(v) => setValue("billingCycle", v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                    <SelectItem value="SEMI_ANNUAL">Semi-Annual</SelectItem>
                    <SelectItem value="ANNUAL">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Start Date</Label>
              <Input type="date" {...register("startDate")} />
            </div>
            <div className="space-y-1">
              <Label>Payment Method</Label>
              <Select onValueChange={(v) => setValue("paymentMethod", v)}>
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
              <Label>Notes</Label>
              <Input placeholder="Optional notes..." {...register("notes")} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
