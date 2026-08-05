import { Skeleton } from "@/components/ui/skeleton"

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
// Deterministic card counts per column so there is no hydration mismatch
const CARD_COUNTS = [1, 2, 3, 2, 3, 2, 1]

export default function ScheduleLoading() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>

      {/* Week navigation */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-md" />
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-9 w-9 rounded-md" />
      </div>

      {/* Week grid */}
      <div className="grid grid-cols-7 gap-3">
        {DAYS.map((day, colIdx) => (
          <div key={day} className="space-y-2">
            <Skeleton className="h-5 w-10 mx-auto" />
            <div className="space-y-2">
              {Array.from({ length: CARD_COUNTS[colIdx] }).map((_, i) => (
                <div key={i} className="rounded-md border bg-card p-3 space-y-2">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
