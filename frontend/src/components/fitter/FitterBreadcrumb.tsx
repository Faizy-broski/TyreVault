'use client'

import Link from 'next/link'
import { Home, ChevronRight } from 'lucide-react'

interface Crumb {
  label: string
  href?: string
}

export function FitterBreadcrumb({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav className="flex items-center gap-1 text-xs text-zinc-400">
      <Link
        href="/fitter/dashboard"
        className="flex items-center gap-1 hover:text-zinc-700 transition-colors"
      >
        <Home className="w-3.5 h-3.5" />
        <span>Home</span>
      </Link>
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1">
          <ChevronRight className="w-3 h-3 text-zinc-300" />
          {crumb.href ? (
            <Link href={crumb.href} className="hover:text-zinc-700 transition-colors">
              {crumb.label}
            </Link>
          ) : (
            <span className="text-zinc-700 font-medium">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
