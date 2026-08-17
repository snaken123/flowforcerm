import { Skeleton } from "@/components/ui/skeleton"

export default function EmailLoading() {
  return (
    <div className="flex gap-4 h-[calc(100vh-8rem)]">
      <div className="w-72 shrink-0 space-y-2">
        <Skeleton className="h-9 w-full mb-3" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-md border bg-card p-3 space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>
      <div className="flex-1 rounded-lg border bg-card p-6 space-y-4">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-4 w-40" />
        <div className="space-y-2 pt-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    </div>
  )
}
