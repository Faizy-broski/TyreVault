import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import JobDetailClient from '@/components/fitter/JobDetailClient'

export const metadata = { title: 'Job Details — Fitment Portal' }

export default async function JobDetailPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')
  return <JobDetailClient jobId={jobId} accessToken={session.access_token} />
}
