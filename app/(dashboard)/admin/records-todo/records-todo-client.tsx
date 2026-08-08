"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Loader2, Award, Inbox } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDate, getInitials } from "@/lib/utils";
import { ApproveRejectActions } from "@/components/records/approve-reject-actions";

export function RecordsTodoClient({ canApprove }: { canApprove: boolean }) {
  const [records, setRecords] = useState<any[] | null>(null);

  const load = useCallback(() => {
    fetch("/api/ranks/pending")
      .then((r) => r.json())
      .then((d) => setRecords(Array.isArray(d) ? d : []))
      .catch(() => setRecords([]));
  }, []);

  useEffect(() => { load(); }, [load]);

  if (records === null) {
    return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
  }

  if (records.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 flex flex-col items-center gap-2 text-muted-foreground">
          <Inbox className="h-8 w-8" />
          <p className="text-sm">Nothing pending — you're all caught up.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {records.map((r) => (
        <Card key={r.id}>
          <CardContent className="p-4 flex items-start gap-4">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={r.member?.photoUrl ?? ""} />
              <AvatarFallback>{getInitials(`${r.member?.firstName ?? ""} ${r.member?.lastName ?? ""}`)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <Link href={`/admin/members/${r.member?.id}`} className="font-medium text-sm hover:underline">
                {r.member?.firstName} {r.member?.lastName}
              </Link>
              <div className="flex items-center gap-2 mt-0.5 text-sm">
                {r.photoUrl && <img src={r.photoUrl} alt="" className="h-4 w-4 rounded object-cover shrink-0" />}
                <Award className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">{r.martialArt}:</span>
                <span className="font-medium">{r.rank}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3">
                <span>{formatDate(r.awardedAt)}</span>
                {r.awardedBy && <span>{r.awardedBy}</span>}
              </div>
              {r.details && <p className="text-xs text-muted-foreground mt-1">{r.details}</p>}
            </div>
            {canApprove ? (
              <ApproveRejectActions recordId={r.id} onDone={load} />
            ) : (
              <span className="text-xs text-muted-foreground shrink-0">Awaiting a coach or admin</span>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
