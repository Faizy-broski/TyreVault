'use client'

import { cn } from '@/lib/utils'

/* ── Orbiting-dots spinner (8 dots fade in sequence around a circle) ──────── */
export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      role="status"
      aria-label="Loading"
      className={cn('text-primary', className)}
    >
      <style>{`@keyframes _dot_fade{0%,100%{opacity:.12}50%{opacity:1}}`}</style>
      {Array.from({ length: 8 }, (_, i) => {
        const angle = (i / 8) * Math.PI * 2
        return (
          <circle
            key={i}
            cx={16 + 10 * Math.sin(angle)}
            cy={16 - 10 * Math.cos(angle)}
            r={2.8}
            fill="currentColor"
            style={{
              animationName:            '_dot_fade',
              animationDuration:        '1s',
              animationTimingFunction:  'ease-in-out',
              animationIterationCount:  'infinite',
              animationDelay:           `${(i / 8) - 1}s`,
            }}
          />
        )
      })}
    </svg>
  )
}

/* ── Drop-in tbody row spinner ───────────────────────────────────────────── */
export function TableBodySpinner({ colSpan = 100 }: { colSpan?: number }) {
  return (
    <tr>
      <td colSpan={colSpan}>
        <div className="flex flex-col items-center justify-center gap-3 py-20">
          <Spinner className="w-10 h-10" />
          <span className="text-xs font-medium text-zinc-400 tracking-wide">Loading…</span>
        </div>
      </td>
    </tr>
  )
}

/* ── Centred spinner for non-table loading areas ─────────────────────────── */
export function BoxSpinner({ minHeight = 280 }: { minHeight?: number }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 w-full rounded-2xl border border-zinc-200 bg-white"
      style={{ minHeight }}
    >
      <Spinner className="w-10 h-10" />
      <span className="text-xs font-medium text-zinc-400 tracking-wide">Loading…</span>
    </div>
  )
}

/* ── Tiny inline fetching indicator for background refetch ───────────────── */
export function FetchingDot({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-400">
      <Spinner className="w-3.5 h-3.5" />
      Refreshing
    </span>
  )
}
