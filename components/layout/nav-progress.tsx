"use client"

import { useEffect, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"

export function NavProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    setLoading(true)
    setProgress(20)
    const t1 = setTimeout(() => setProgress(60), 100)
    const t2 = setTimeout(() => setProgress(80), 300)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [pathname, searchParams])

  useEffect(() => {
    if (loading) {
      const t = setTimeout(() => {
        setProgress(100)
        setTimeout(() => {
          setLoading(false)
          setProgress(0)
        }, 200)
      }, 100)
      return () => clearTimeout(t)
    }
  }, [loading])

  if (!loading && progress === 0) return null

  return (
    <div
      className="fixed top-0 left-0 z-[9999] h-[2px] bg-primary transition-all duration-300 ease-out"
      style={{ width: `${progress}%`, opacity: loading ? 1 : 0 }}
    />
  )
}
