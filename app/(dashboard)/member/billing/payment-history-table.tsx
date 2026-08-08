"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";
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
            <th className="text-left py-2 pr-4 font-medium">Status</th>
            <th className="text-center py-2 font-medium">Receipt</th>
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
                <td className="py-2.5 pr-4">
                  <Badge variant={PAYMENT_BADGE[payment.status] ?? "secondary"} className="text-[10px]">
                    {payment.status}
                  </Badge>
                </td>
                <td className="py-2.5 text-center">
                  {payment.receiptUrl ? (
                    <a href={payment.receiptUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center rounded border px-2 py-0.5 text-xs hover:bg-muted">
                      View
                    </a>
                  ) : payment.needsReceipt ? (
                    <span className="inline-flex items-center gap-1 text-orange-600 text-xs"><AlertCircle className="h-3.5 w-3.5" />Missing</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
