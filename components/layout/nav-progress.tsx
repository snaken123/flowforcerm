"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"

export function NavProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  function clearTimers() {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }

  function start() {
    clearTimers()
    setLoading(true)
    setProgress(20)
    timers.current.push(setTimeout(() => setProgress(60), 150))
    timers.current.push(setTimeout(() => setProgress(80), 500))
  }

  function finish() {
    clearTimers()
    setProgress(100)
    timers.current.push(setTimeout(() => {
      setLoading(false)
      setProgress(0)
    }, 200))
  }

  // A click on a Link (or browser back/forward) begins the navigation well before
  // Next.js commits the new route -- usePathname/useSearchParams only change *after*
  // that commit, so reacting to them alone means the bar would only ever appear once
  // the wait is already over. Starting on click/popstate gives the "something is
  // loading" signal right when it's needed; the pathname effect below just marks done.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      // Capture phase, and no e.defaultPrevented check: Next.js's <Link> always
      // calls preventDefault() on the click it intercepts for client-side routing,
      // so checking defaultPrevented here would skip the bar on every real nav click.
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const anchor = (e.target as HTMLElement)?.closest("a")
      if (!anchor) return
      const href = anchor.getAttribute("href")
      if (!href || !href.startsWith("/") || anchor.target === "_blank") return
      const currentUrl = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "")
      if (href === currentUrl) return
      start()
    }
    document.addEventListener("click", onClick, true)
    window.addEventListener("popstate", start)
    return () => {
      document.removeEventListener("click", onClick, true)
      window.removeEventListener("popstate", start)
    }
  }, [pathname, searchParams])

  // pathname/searchParams only change once the new route *commits* -- and with a
  // loading.tsx in play, that commit happens as soon as its skeleton mounts, not
  // when the real content replaces it (that swap happens later, invisibly to this
  // hook, as the page's own Suspense boundary resolves). So finishing here would
  // race the bar to 100% the instant the skeleton appears. Every loading.tsx in
  // this app renders the shared Skeleton primitive (.animate-pulse), so watch for
  // that to actually disappear from the page before calling the nav done.
  useEffect(() => {
    const hasSkeleton = () => document.querySelector("main .animate-pulse") !== null

    if (!hasSkeleton()) {
      finish()
      return clearTimers
    }

    const main = document.querySelector("main")
    if (!main) {
      finish()
      return clearTimers
    }

    const obs = new MutationObserver(() => {
      if (!hasSkeleton()) {
        finish()
        obs.disconnect()
      }
    })
    obs.observe(main, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] })
    return () => {
      obs.disconnect()
      clearTimers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams])

  if (!loading && progress === 0) return null

  return (
    <div
      className="fixed top-0 left-0 z-[9999] h-[2px] bg-primary transition-all duration-300 ease-out"
      style={{ width: `${progress}%`, opacity: loading ? 1 : 0 }}
    />
  )
}
