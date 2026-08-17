import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center px-4">
      <div className="text-4xl">🔍</div>
      <h2 className="text-lg font-semibold">Page not found</h2>
      <p className="text-sm text-muted-foreground max-w-sm">
        The page you're looking for doesn't exist or may have moved.
      </p>
      <Link
        href="/dashboard"
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
      >
        Back to Dashboard
      </Link>
    </div>
  )
}
