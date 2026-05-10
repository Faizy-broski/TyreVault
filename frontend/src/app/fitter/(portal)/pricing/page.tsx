import { createClient } from '@/lib/supabase/server'
import PricingClient from '@/components/fitter/PricingClient'
import type { FitterPricingRow } from '@/types/fitter.types'

export const metadata = { title: 'Pricing — Fitment Portal' }

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export default async function FitterPricingPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const token   = session?.access_token ?? ''

  let rows: FitterPricingRow[] = []
  try {
    const res = await fetch(`${API}/api/fitter/portal/pricing`, {
      headers: { Authorization: `Bearer ${token}` },
      cache:   'no-store',
    })
    if (res.ok) rows = await res.json()
  } catch { /* backend may not be running in dev */ }

  return <PricingClient initialRows={rows} accessToken={token} />
}
