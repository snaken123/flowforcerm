import { Skeleton } from "@/components/ui/skeleton"

export default function CheckInLoading() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Icon + heading */}
      <div className="text-center space-y-2">
        <div className="flex justify-center">
          <Skeleton className="h-[72px] w-[72px] rounded-full" />
        </div>
        <Skeleton className="h-8 w-48 mx-auto" />
        <Skeleton className="h-4 w-72 mx-auto" />
      </div>

      {/* Search input */}
      <Skeleton className="h-14 w-full rounded-md" />

      {/* Member result cards */}
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-4 flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-3 w-48" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
            <Skeleton className="h-9 w-24 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}
