import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import JobsClient from '@/components/fitter/JobsClient'

export const metadata = { title: 'Jobs — Fitment Portal' }

export default async function FitterJobsPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')
  return <JobsClient accessToken={session.access_token} />
}
