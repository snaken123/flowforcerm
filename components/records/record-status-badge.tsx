import { HelpCircle, XCircle } from "lucide-react";

type Status = "APPROVED" | "PENDING" | "REJECTED";

// Pending: gray text + red "?" icon with a tooltip. Rejected: stays visible, marked
// with the reason. Approved: no badge — the record simply renders solid/normal.
export function RecordStatusIndicator({ status, rejectionReason }: { status: Status; rejectionReason?: string | null }) {
  if (status === "PENDING") {
    return (
      <span title="Pending Approval" className="cursor-help">
        <HelpCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
      </span>
    );
  }
  if (status === "REJECTED") {
    return (
      <span className="inline-flex items-center gap-1 text-destructive shrink-0" title={rejectionReason ? `Rejected: ${rejectionReason}` : "Rejected"}>
        <XCircle className="h-3.5 w-3.5" />
        <span className="text-xs font-medium">Rejected</span>
      </span>
    );
  }
  return null;
}

export function recordTextClass(status: Status): string {
  if (status === "PENDING") return "text-muted-foreground";
  if (status === "REJECTED") return "text-muted-foreground";
  return "text-foreground";
}
