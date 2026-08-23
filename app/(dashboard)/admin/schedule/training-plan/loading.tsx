import { Skeleton } from "@/components/ui/skeleton"

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const ROW_COUNTS = [2, 3, 2, 3, 2, 3, 1]

export default function TrainingPlanLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-40" />

      {/* Toolbar: view toggle + week nav */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>

      {/* Category rows x day columns board */}
      <div className="rounded-lg border overflow-hidden">
        <div className="grid grid-cols-8 gap-px bg-border">
          <div className="bg-card p-3" />
          {DAYS.map((day) => (
            <div key={day} className="bg-card p-3">
              <Skeleton className="h-4 w-8 mx-auto" />
            </div>
          ))}
        </div>
        {ROW_COUNTS.map((_, rowIdx) => (
          <div key={rowIdx} className="grid grid-cols-8 gap-px bg-border border-t">
            <div className="bg-card p-3">
              <Skeleton className="h-4 w-20" />
            </div>
            {DAYS.map((day, colIdx) => (
              <div key={day} className="bg-card p-2">
                <Skeleton className={`h-16 w-full rounded-md ${(rowIdx + colIdx) % 3 === 0 ? "opacity-40" : ""}`} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
