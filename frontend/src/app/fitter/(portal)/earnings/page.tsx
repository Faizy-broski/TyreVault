import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EarningsClient from '@/components/fitter/EarningsClient'

export const metadata = { title: 'Earnings — Fitment Portal' }

export default async function FitterEarningsPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')
  return <EarningsClient accessToken={session.access_token} />
}
