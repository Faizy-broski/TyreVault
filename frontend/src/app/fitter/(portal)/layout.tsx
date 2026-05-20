import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import FitterSidebar from '@/components/fitter/FitterSidebar'
import FitterHeader  from '@/components/fitter/FitterHeader'
import type { FitmentCentre } from '@/types/fitter.types'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export default async function FitterLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = (profile as any)?.role
  if (role !== 'fitter' && role !== 'super_admin') redirect('/fitter/onboarding')

  // Get session token to call backend
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token ?? ''

  let centre: FitmentCentre | null = null
  if (token) {
    try {
      const res = await fetch(`${API}/api/fitter/portal/centre`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      if (res.ok) centre = await res.json()
    } catch { /* backend unreachable */ }
  }

  if (!centre) redirect('/fitter/onboarding')

  return (
    <div className="flex h-svh bg-zinc-100 overflow-hidden">
      {/* Desktop sidebar — hidden on mobile, shown lg+ */}
      <FitterSidebar />

      {/* Main column */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <FitterHeader
          centre={centre}
          userEmail={user.email ?? ''}
          notificationCount={0}
        />
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}
