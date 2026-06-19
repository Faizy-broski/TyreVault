import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import JobsClient from '@/components/fitter/JobsClient'
import type { FitmentJob } from '@/types/fitter.types'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Jobs — Fitment Portal' }

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export default async function FitterJobsPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const headers = { Authorization: `Bearer ${session.access_token}` }

  let initialJobs: FitmentJob[] = []
  try {
    const res = await fetch(`${API}/api/fitter/portal/jobs`, { headers, cache: 'no-store' })
    if (res.ok) initialJobs = await res.json()
  } catch { /* backend not reachable in dev */ }

  return <JobsClient initialJobs={initialJobs} />
}
