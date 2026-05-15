import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ServicesClient from '@/components/fitter/ServicesClient'

export const metadata = { title: 'Services — Fitment Portal' }

export default async function FitterServicesPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')
  return <ServicesClient accessToken={session.access_token} />
}
