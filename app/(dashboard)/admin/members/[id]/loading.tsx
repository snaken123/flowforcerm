import { Skeleton } from "@/components/ui/skeleton"

export default function MemberDetailLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-24" />

      {/* Header: avatar, name, status, contact chips */}
      <div className="flex flex-wrap items-start gap-4">
        <Skeleton className="h-20 w-20 rounded-full shrink-0" />
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-6 w-20 rounded-md" />
            <Skeleton className="h-6 w-24 rounded-md" />
          </div>
          <div className="flex flex-wrap gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-28" />
            ))}
          </div>
        </div>
      </div>

      {/* Card sections: notes, subscriptions, payments, check-ins, bookings */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-card p-5 space-y-3">
          <Skeleton className="h-5 w-40" />
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="flex items-center justify-between gap-4">
                <Skeleton className="h-4 w-full max-w-sm" />
                <Skeleton className="h-4 w-20 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
