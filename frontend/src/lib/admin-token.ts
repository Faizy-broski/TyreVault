import { createClient } from '@/lib/supabase/client'

/** Returns the current Supabase access token for authenticating backend API calls. */
export async function getAdminToken(): Promise<string> {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.access_token ?? ''
}
