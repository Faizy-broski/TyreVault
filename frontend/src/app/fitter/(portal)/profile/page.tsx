import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProfileClient from '@/components/fitter/ProfileClient'

export const metadata = { title: 'Profile & Settings — Fitment Portal' }

export default async function FitterProfilePage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')
  return <ProfileClient accessToken={session.access_token} />
}
