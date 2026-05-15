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
    <header className="h-14 bg-white border-b border-zinc-200 flex items-center justify-between px-6 shrink-0">
      {/* Centre info */}
      <div>
        <p className="text-sm font-semibold text-zinc-900">{centre.business_name}</p>
        <p className="text-xs text-zinc-500">Partner ID: {centre.partner_id}</p>
      </div>

      {/* Right: bell + avatar */}
      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-full text-zinc-500 hover:bg-zinc-100 h-8 w-8"
        >
          <Bell className="w-5 h-5" />
          {notificationCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center text-[9px] font-bold text-zinc-900">
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
        </Button>

        {/* Avatar dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 h-auto hover:bg-zinc-50"
            >
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-zinc-900">
                {initials}
              </div>
              <span className="text-sm font-medium text-zinc-700">{displayName}</span>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem asChild>
              <a href="/fitter/profile">Profile &amp; Settings</a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href="/fitter/support">Support</a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/api/auth/signout" className="text-red-600 focus:text-red-600 focus:bg-red-50">
                Sign out
              </a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
