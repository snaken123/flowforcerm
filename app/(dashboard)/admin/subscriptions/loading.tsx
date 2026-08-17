import { Skeleton } from "@/components/ui/skeleton"

export default function SubscriptionsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>

      <div className="flex gap-3 flex-wrap">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-36" />
      </div>

      <div className="rounded-lg border bg-card">
        <div className="grid grid-cols-5 gap-4 px-4 py-3 border-b">
          {["Member", "Service", "Status", "Expires", ""].map((col) => (
            <Skeleton key={col} className="h-4 w-20" />
          ))}
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="grid grid-cols-5 gap-4 px-4 py-3 border-b last:border-0 items-center">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-16 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}
