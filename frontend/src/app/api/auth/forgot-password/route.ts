import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : null

  if (!email) {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
  }

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!

  // Look up the user by email via the GoTrue admin REST API (supports email filter natively)
  const usersRes = await fetch(
    `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
  )

  if (!usersRes.ok) {
    console.error('[forgot-password] user lookup failed:', usersRes.status)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }

  const { users } = await usersRes.json()
  const user = (users as any[])?.find(
    (u: any) => u.email?.toLowerCase() === email
  )

  if (user) {
    // Check role from profiles table using the admin client (bypasses RLS)
    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if ((profile as any)?.role === 'super_admin') {
      return NextResponse.json(
        { error: 'Password reset is not available for admin accounts. Contact your system administrator.' },
        { status: 403 }
      )
    }

    // Send reset email
    const supabase = await createClient()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback?next=/update-password`,
    })
    if (resetError) {
      console.error('[forgot-password] reset error:', resetError.message)
      return NextResponse.json({ error: 'Could not send reset email. Please try again.' }, { status: 500 })
    }
  }

  // Always return success — avoids leaking whether an email is registered
  return NextResponse.json({ success: true })
}
