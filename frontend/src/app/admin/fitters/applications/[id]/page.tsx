import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ApplicationReviewClient from './ApplicationReviewClient'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

interface Props { params: Promise<{ id: string }> }

export default async function ApplicationDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token ?? ''

  let application: Record<string, unknown> | null = null
  try {
    const res = await fetch(`${API}/api/fitter/applications/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (res.ok) application = await res.json()
  } catch { /* backend not running */ }

  if (!application) notFound()

  return <ApplicationReviewClient application={application} accessToken={token} />
}
