import { createClient } from '@/lib/supabase/server'
import ScheduleClient from '@/components/fitter/ScheduleClient'

export const metadata = { title: 'Schedule — Fitment Portal' }

export default async function FitterSchedulePage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return <ScheduleClient accessToken={session?.access_token ?? ''} />
}
