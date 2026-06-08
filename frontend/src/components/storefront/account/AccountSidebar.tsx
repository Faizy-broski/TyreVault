'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { PackageOpen, User, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const links = [
  { label: 'My Orders', href: '/account/orders',  icon: PackageOpen },
  { label: 'Profile',   href: '/account/profile', icon: User },
]

export default function AccountSidebar() {
  const pathname = usePathname()
  const router   = useRouter()

  async function handleSignOut() {
    await createClient().auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <aside className="w-full sm:w-48 shrink-0">
      <nav className="flex sm:flex-col gap-1">
        {links.map(({ label, href, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-zinc-600 hover:!bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}

        <button
          type="button"
          onClick={handleSignOut}
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 hover:!bg-zinc-100 hover:text-red-500 transition-colors mt-auto sm:mt-4"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign out
        </button>
      </nav>
    </aside>
  )
}
