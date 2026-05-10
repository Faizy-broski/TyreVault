import { createClient } from '@/lib/supabase/server'
import FitmentCentresClient from '@/components/admin/fitment-centres/FitmentCentresClient'
import type { AdminFitmentCentreSummary } from '@/types/admin.types'

export const metadata = { title: 'Fitment Centres — Onyx Admin' }

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export default async function AdminFittersCentrePage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token ?? ''

  let centres: AdminFitmentCentreSummary[] = []
  let total = 0
  try {
    const res = await fetch(`${API}/api/admin/fitment-centres?page=1`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (res.ok) {
      const json = await res.json()
      centres = json.data  ?? []
      total   = json.total ?? 0
    }
  } catch { /* backend may not be running in dev */ }

  return (
    <FitmentCentresClient
      initialCentres={centres}
      initialTotal={total}
      accessToken={token}
    />
  )
}
