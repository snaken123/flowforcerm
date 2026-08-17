import { Skeleton } from "@/components/ui/skeleton"

export default function EmployeesLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>

      <div className="rounded-lg border bg-card">
        <div className="grid grid-cols-4 gap-4 px-4 py-3 border-b">
          {["Name", "Role", "Status", ""].map((col) => (
            <Skeleton key={col} className="h-4 w-20" />
          ))}
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="grid grid-cols-4 gap-4 px-4 py-3 border-b last:border-0 items-center">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-8 w-16 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}
