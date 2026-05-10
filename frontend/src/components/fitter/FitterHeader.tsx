'use client'

import { useState } from 'react'
import type { FitmentCentre } from '@/types/fitter.types'

interface Props {
  centre:    FitmentCentre
  userEmail: string
  notificationCount?: number
}

export default function FitterHeader({ centre, userEmail, notificationCount = 0 }: Props) {
  const [showDropdown, setShowDropdown] = useState(false)
  const initials = userEmail.slice(0, 2).toUpperCase()

  return (
    <header className="h-14 bg-white border-b border-zinc-200 flex items-center justify-between px-6 shrink-0">
      {/* Centre info */}
      <div>
        <p className="text-sm font-semibold text-zinc-900">{centre.centre_name}</p>
        <p className="text-xs text-zinc-500">Partner ID: {centre.partner_id}</p>
      </div>

      {/* Right: bell + avatar */}
      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <button className="relative p-1.5 rounded-full hover:bg-zinc-100 transition-colors text-zinc-500">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
          </svg>
          {notificationCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-yellow-400 flex items-center justify-center text-[9px] font-bold text-zinc-900">
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
        </button>

        {/* Avatar dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(v => !v)}
            className="flex items-center gap-2 hover:bg-zinc-50 rounded-lg px-2 py-1.5 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-yellow-400 flex items-center justify-center text-xs font-bold text-zinc-900">
              {initials}
            </div>
            <span className="text-sm font-medium text-zinc-700">
              {userEmail.split('@')[0].split('.').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')}
            </span>
            <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showDropdown && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg border border-zinc-200 shadow-lg z-20 py-1">
              <a href="/fitter/profile" className="block px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50">Profile & Settings</a>
              <a href="/fitter/support" className="block px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50">Support</a>
              <hr className="my-1 border-zinc-100" />
              <a href="/api/auth/signout" className="block px-4 py-2 text-sm text-red-600 hover:bg-red-50">Sign out</a>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
