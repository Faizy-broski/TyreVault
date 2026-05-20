import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardClient from '@/components/fitter/DashboardClient'
import type { FitterKPIs, FitmentJob } from '@/types/fitter.types'

export const metadata = { title: 'Dashboard — Fitment Portal' }

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export default async function FitterDashboardPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const token   = session.access_token
  const headers = { Authorization: `Bearer ${token}` }

  let kpis: FitterKPIs = {
    newJobsToday: 0, pendingJobs: 0, scheduledThisWeek: 0,
    earningsThisMonth: 0, completedJobsThisMonth: 0, pendingPayouts: 0,
  }
  let jobs: FitmentJob[] = []
  let centreId = ''

  try {
    const [kpiRes, jobsRes, centreRes] = await Promise.all([
      fetch(`${API}/api/fitter/portal/kpis`,  { headers, cache: 'no-store' }),
      fetch(`${API}/api/fitter/portal/jobs`,   { headers, cache: 'no-store' }),
      fetch(`${API}/api/fitter/portal/centre`, { headers, cache: 'no-store' }),
    ])
    if (kpiRes.ok)    kpis = await kpiRes.json()
    if (jobsRes.ok)   jobs = await jobsRes.json()
    if (centreRes.ok) { const c = await centreRes.json(); centreId = c.fitment_centre_id ?? '' }
  } catch { /* backend may not be running in dev */ }

  return (
    <DashboardClient
      initialKPIs={kpis}
      initialJobs={jobs}
      centreId={centreId}
      accessToken={token}
    />
  )
}
