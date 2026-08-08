"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatCurrency } from "@/lib/utils";
import { SortableHeader } from "@/components/ui/sortable-header";

const PAYMENT_BADGE: Record<string, any> = {
  PAID: "success",
  PENDING: "warning",
  OVERDUE: "destructive",
  WAIVED: "secondary",
};

export function PaymentHistoryTable({ payments }: { payments: any[] }) {
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sorted = [...payments].sort((a, b) => {
    const diff = new Date(a.paidAt ?? a.createdAt).getTime() - new Date(b.paidAt ?? b.createdAt).getTime();
    return sortDir === "asc" ? diff : -diff;
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs text-muted-foreground">
            <th className="text-left py-2 pr-4 font-medium">Package</th>
            <th className="text-left py-2 pr-4 font-medium">Sessions</th>
            <th className="text-left py-2 pr-4 font-medium">
              <SortableHeader label="Date" direction={sortDir} onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))} />
            </th>
            <th className="text-left py-2 pr-4 font-medium">Method</th>
            <th className="text-right py-2 pr-4 font-medium">Amount</th>
            <th className="text-left py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {sorted.map((payment) => {
            const sub = payment.subscription;
            const sessionsLabel = sub?.sessionsTotal != null ? `${sub.sessionsTotal} sessions` : "Unlimited";
            return (
              <tr key={payment.id} className="text-sm">
                <td className="py-2.5 pr-4">
                  <div className="flex items-center gap-2">
                    {sub?.service?.color && (
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: sub.service.color }} />
                    )}
                    <span className="font-medium">{sub?.service?.name ?? "—"}</span>
                  </div>
                </td>
                <td className="py-2.5 pr-4 text-muted-foreground">{sessionsLabel}</td>
                <td className="py-2.5 pr-4 whitespace-nowrap text-muted-foreground">
                  {formatDate(payment.paidAt ?? payment.createdAt)}
                </td>
                <td className="py-2.5 pr-4">
                  {payment.method
                    ? <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-medium uppercase tracking-wide">{payment.method}</span>
                    : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="py-2.5 pr-4 text-right font-semibold whitespace-nowrap">
                  {formatCurrency(payment.amount)}
                </td>
                <td className="py-2.5">
                  <Badge variant={PAYMENT_BADGE[payment.status] ?? "secondary"} className="text-[10px]">
                    {payment.status}
                  </Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
