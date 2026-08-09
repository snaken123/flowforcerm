"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { RecordsTodoClient } from "./records-todo-client";
import { PendingReceiptsClient } from "./pending-receipts-client";
import { PendingStoreSalesClient } from "./pending-store-sales-client";
import { PendingPaymentsClient } from "./pending-payments-client";
import { FreeTrialFollowUpsClient } from "./free-trial-followups-client";

interface Props {
  pendingPayments: any[];
  openFollowUps: any[];
  services: any[];
  canApprove: boolean;
}

const SECTIONS = [
  { key: "followups", label: "Free Trial Follow-ups", description: "Trial members awaiting conversion or decline decision." },
  { key: "payments", label: "Pending Membership Payments", description: "Memberships assigned without complete payment info." },
  { key: "receipts", label: "Pending Receipts", description: "Payments flagged as needing a receipt, but none attached yet." },
  { key: "sales", label: "Pending Store Sales", description: "Sales missing a payment mode or a required receipt." },
  { key: "records", label: "Pending Records", description: "Achievements submitted by members, awaiting approval." },
] as const;

export function RecordsTodoLayout({ pendingPayments, openFollowUps, services, canApprove }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  function toggle(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="space-y-8">
      {SECTIONS.map(({ key, label, description }) => {
        const isCollapsed = collapsed.has(key);
        return (
          <div key={key} className="space-y-3">
            <button
              type="button"
              className="w-full flex items-center justify-between gap-2 cursor-pointer select-none group"
              onClick={() => toggle(key)}
            >
              <div className="text-left">
                <h2 className="text-lg font-semibold group-hover:text-foreground/80 transition-colors">{label}</h2>
                {!isCollapsed && (
                  <p className="text-sm text-muted-foreground">{description}</p>
                )}
              </div>
              {isCollapsed
                ? <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
                : <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0" />}
            </button>
            {!isCollapsed && (
              <>
                {key === "followups" && <FreeTrialFollowUpsClient openFollowUps={openFollowUps} services={services} />}
                {key === "payments" && <PendingPaymentsClient pendingPayments={pendingPayments} />}
                {key === "receipts" && <PendingReceiptsClient />}
                {key === "sales" && <PendingStoreSalesClient />}
                {key === "records" && <RecordsTodoClient canApprove={canApprove} />}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
