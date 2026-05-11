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
    } catch { /* backend may not be running in dev */ }
  }

  // Fallback centre for dev/preview
  const fallbackCentre: FitmentCentre = {
    fitment_id:    'dev',
    business_name: 'QuickFit Tyres Melbourne',
    partner_id:        'PRT-2024-001',
    contact_phone:     null,
    business_number:   null,
    user_id:           user.id,
    is_active:         true,
  }

  return (
    <div className="flex h-screen bg-zinc-100 overflow-hidden">
      <FitterSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <FitterHeader
          centre={centre ?? fallbackCentre}
          userEmail={user.email ?? ''}
          notificationCount={3}
        />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
