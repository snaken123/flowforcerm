import { Skeleton } from "@/components/ui/skeleton"

export default function AthleteIdLoading() {
  return (
    <div className="flex flex-col items-center gap-6 max-w-sm mx-auto">
      <div className="space-y-2 text-center">
        <Skeleton className="h-8 w-40 mx-auto" />
        <Skeleton className="h-4 w-56 mx-auto" />
      </div>

      <div className="w-full aspect-[3/4] rounded-2xl border bg-card p-6 flex flex-col items-center gap-4">
        <Skeleton className="h-24 w-24 rounded-full" />
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-32 w-32 mt-4" />
      </div>
    </div>
  )
}
