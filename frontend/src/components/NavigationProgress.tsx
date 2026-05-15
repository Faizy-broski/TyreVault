'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

function ProgressBar() {
  const pathname    = usePathname()
  const searchParams = useSearchParams()
  const routeKey    = pathname + searchParams.toString()
  const prevKey     = useRef(routeKey)

  const [progress, setProgress] = useState(0)
  const [visible,  setVisible]  = useState(false)
  const [fading,   setFading]   = useState(false)
  const loadingRef = useRef(false)
  const timers     = useRef<ReturnType<typeof setTimeout>[]>([])

  function schedule(fn: () => void, ms: number) {
    const t = setTimeout(fn, ms)
    timers.current.push(t)
  }

  function clearAll() {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }

  function start() {
    if (loadingRef.current) return
    loadingRef.current = true
    clearAll()
    setFading(false)
    setProgress(0)
    setVisible(true)
    schedule(() => setProgress(18), 30)
    schedule(() => setProgress(45), 400)
    schedule(() => setProgress(68), 1200)
    schedule(() => setProgress(80), 2800)
  }

  function finish() {
    loadingRef.current = false
    clearAll()
    setProgress(100)
    schedule(() => setFading(true), 250)
    schedule(() => { setVisible(false); setProgress(0); setFading(false) }, 650)
  }

  // Detect link clicks to start the bar
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const a = (e.target as HTMLElement).closest('a')
      if (!a) return
      const href = a.getAttribute('href') ?? ''
      if (!href.startsWith('/')) return           // skip external links
      if (a.getAttribute('target') === '_blank') return
      // Skip if same route
      try {
        const next = new URL(href, window.location.href)
        if (next.pathname + next.search === window.location.pathname + window.location.search) return
      } catch { return }
      start()
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Detect navigation complete
  useEffect(() => {
    if (routeKey !== prevKey.current) {
      prevKey.current = routeKey
      if (loadingRef.current) finish()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey])

  useEffect(() => () => clearAll(), [])

  if (!visible) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none"
      style={{ height: 3, opacity: fading ? 0 : 1, transition: fading ? 'opacity 400ms ease' : 'none' }}
    >
      <div
        className="h-full bg-primary relative overflow-hidden"
        style={{
          width: `${progress}%`,
          transition: progress === 0 ? 'none' : progress === 100 ? 'width 220ms ease-out' : 'width 700ms ease-out',
          boxShadow: '0 0 8px 0 var(--color-primary)',
        }}
      >
        {/* shimmer pulse on the leading edge */}
        <span
          className="absolute right-0 top-0 h-full w-12 opacity-60"
          style={{
            background: 'linear-gradient(to right, transparent, var(--color-primary), white, var(--color-primary), transparent)',
            animation: 'shimmer 1.2s infinite linear',
          }}
        />
      </div>
      <style>{`
        @keyframes shimmer {
          0%   { transform: translateX(-200%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  )
}

export default function NavigationProgress() {
  return (
    <Suspense>
      <ProgressBar />
    </Suspense>
  )
}
