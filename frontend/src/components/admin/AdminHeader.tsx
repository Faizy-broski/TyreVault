'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, ChevronDown, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'

interface Props {
  userEmail:          string
  notificationCount?: number
  onMenuToggle?:      () => void
}

export default function AdminHeader({ userEmail, notificationCount = 0, onMenuToggle }: Props) {
  const router      = useRouter()
  const initials    = userEmail.slice(0, 2).toUpperCase()
  const displayName = userEmail.split('@')[0].split('.').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')

  async function handleSignOut() {
    await createClient().auth.signOut()
    router.push('/login')
  }

  return (
    <header className="h-14 bg-white border-b border-zinc-200 flex items-center justify-between px-4 sm:px-6 shrink-0 shadow-sm">
      {/* Hamburger — mobile only */}
      <button
        type="button"
        onClick={onMenuToggle}
        className="lg:hidden p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 transition-colors"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Right: bell + avatar */}
      <div className="flex items-center gap-3 ml-auto">
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
              <Link href="/admin/profile">Profile &amp; Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/admin/support">Support</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
              onSelect={handleSignOut}
            >
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
