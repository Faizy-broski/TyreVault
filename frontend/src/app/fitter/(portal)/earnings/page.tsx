import { createClient } from '@/lib/supabase/server'
import EarningsClient from '@/components/fitter/EarningsClient'
import type { FitterEarning } from '@/types/fitter.types'
import {dummyEarnings} from "@/dummydata/fitter/EarningsFitterData"

export const metadata = { title: 'Earnings — Fitment Portal' }

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export default async function FitterEarningsPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const token   = session?.access_token ?? ''
  const headers = { Authorization: `Bearer ${token}` }

    const thisMonth = dummyEarnings
    .filter(e => e.status === 'paid')
    .reduce((sum, e) => sum + e.amount, 0)

  const pendingTotal = dummyEarnings
    .filter(e => e.status === 'pending')
    .reduce((sum, e) => sum + e.amount, 0)

  const completedCount = dummyEarnings.filter(
    e => e.status === 'paid'
  ).length
  // let thisMonth    = 0
  // let pendingTotal = 0
  // let completedCount = 0
  // let earnings: FitterEarning[] = []
  // let total    = 0

  // try {
  //   const [summaryRes, historyRes] = await Promise.all([
  //     fetch(`${API}/api/fitter/portal/earnings/summary`, { headers, cache: 'no-store' }),
  //     fetch(`${API}/api/fitter/portal/earnings?page=1`,  { headers, cache: 'no-store' }),
  //   ])
  //   if (summaryRes.ok) {
  //     const s = await summaryRes.json()
  //     thisMonth      = s.thisMonth      ?? 0
  //     pendingTotal   = s.pendingTotal   ?? 0
  //     completedCount = s.completedCount ?? 0
  //   }
  //   if (historyRes.ok) {
  //     const h = await historyRes.json()
  //     earnings = h.data  ?? []
  //     total    = h.total ?? 0
  //   }
  // } catch { /* backend may not be running in dev */ }

  return (
    <EarningsClient
      thisMonth={thisMonth}
      pendingTotal={pendingTotal}
      completedCount={completedCount}
      // initialEarnings={earnings}
      initialEarnings={dummyEarnings}
      // initialTotal={total}
      initialTotal={dummyEarnings.length}
      accessToken={token}
    />
  )
}
