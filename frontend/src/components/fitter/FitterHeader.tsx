'use client'

import { Bell, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import FitterMobileMenu from '@/components/fitter/FitterMobileMenu'
import type { FitmentCentre } from '@/types/fitter.types'

interface Props {
  centre:             FitmentCentre
  userEmail:          string
  notificationCount?: number
}

export default function FitterHeader({ centre, userEmail, notificationCount = 0 }: Props) {
  const initials    = userEmail.slice(0, 2).toUpperCase()
  const displayName = userEmail.split('@')[0].split('.').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')

  return (
    <header className="h-14 bg-white border-b border-zinc-200 shadow-sm flex items-center gap-3 px-4 sm:px-6 shrink-0">
      <FitterMobileMenu />

      {/* Centre info */}
      <div className="flex-1 min-w-0 flex items-center gap-2.5">
        {/* Live portal indicator */}
        <span className="relative hidden sm:flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-900 truncate leading-tight">{centre.business_name}</p>
          <p className="text-xs text-zinc-400 hidden sm:block leading-tight">Partner ID: {centre.partner_id}</p>
        </div>
      </div>

      {/* Right: bell + avatar */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-full text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 h-8 w-8 transition-colors"
        >
          <Bell className="w-4 h-4" />
          {notificationCount > 0 && (
            <>
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-zinc-900 ring-2 ring-white">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary animate-ping opacity-40" />
            </>
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 h-auto hover:bg-zinc-50 transition-colors group"
            >
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-zinc-900 shrink-0 group-hover:ring-2 group-hover:ring-primary/30 transition-all">
                {initials}
              </div>
              <span className="text-sm font-medium text-zinc-700 hidden sm:block">{displayName}</span>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 hidden sm:block transition-transform group-data-[state=open]:rotate-180 duration-200" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-48 shadow-lg">
            <div className="px-3 py-2 border-b border-zinc-100">
              <p className="text-xs font-semibold text-zinc-900 truncate">{displayName}</p>
              <p className="text-[11px] text-zinc-400 truncate mt-0.5">{userEmail}</p>
            </div>
            <DropdownMenuItem asChild>
              <a href="/fitter/profile" className="cursor-pointer">Profile &amp; Settings</a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href="/fitter/support" className="cursor-pointer">Support</a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/api/auth/signout" className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer">
                Sign out
              </a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
