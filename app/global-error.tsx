"use client"

// Only rendered if the root layout itself throws (rare) -- this replaces the entire
// document, including <html>/<body>, so it can't rely on the app's own layout, fonts,
// or Tailwind classes being available. Kept dependency-free and inline-styled on purpose.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            gap: "16px",
            textAlign: "center",
            padding: "16px",
          }}
        >
          <div style={{ fontSize: "36px" }}>⚠️</div>
          <h2 style={{ fontSize: "18px", fontWeight: 600, margin: 0 }}>Something went wrong</h2>
          <p style={{ fontSize: "14px", color: "#6b7280", maxWidth: "360px", margin: 0 }}>
            The app hit an unexpected error. This is usually temporary — please try again.
          </p>
          <button
            onClick={reset}
            style={{
              padding: "8px 16px",
              background: "#111111",
              color: "#ffffff",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
