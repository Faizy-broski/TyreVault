import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PricingClient from '@/components/fitter/PricingClient'

export const metadata = { title: 'Pricing — Fitment Portal' }

export default async function FitterPricingPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')
  return <PricingClient accessToken={session.access_token} />
}
