import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardClient from '@/components/fitter/DashboardClient'

export const metadata = { title: 'Dashboard — Fitment Portal' }

export default async function FitterDashboardPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')
  return <DashboardClient accessToken={session.access_token} />
}
