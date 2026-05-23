import { supabase as db } from './supabase.service'

export interface WorkingHoursEntry {
  day:        string
  is_closed:  boolean
  open_time:  string
  close_time: string
}

export interface FitterApplicationPayload {
  // Step 1
  fullName:  string
  email:     string
  // Step 2
  contactPerson:  string
  contactEmail:   string
  address?:       string
  mobileNumber?:  string
  businessNumber?: string
  // Step 3
  fitsPassengerSuv:   boolean
  fitsWheelPackages:  boolean
  fitsTruck:          boolean
  wheelAlignmentAvailable: boolean
  wheelAlignmentPrice?: number
  mobileFittingAvailable: boolean
  workingHours: WorkingHoursEntry[]
}

export async function resendFitterInvite(id: string) {
  const { data: app, error: fetchErr } = await db
    .from('fitter_applications')
    .select('email, full_name, status')
    .eq('id', id)
    .single()

  if (fetchErr || !app) return { error: fetchErr ?? new Error('Not found') }
  if (app.status !== 'approved') return { error: new Error('Application is not approved') }

  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000'

  const { error } = await db.auth.admin.inviteUserByEmail(app.email as string, {
    redirectTo: `${frontendUrl}/update-password`,
    data: { full_name: app.full_name },
  })

  return { error }
}

export async function submitApplication(payload: FitterApplicationPayload) {
  const { data, error } = await db
    .from('fitter_applications')
    .insert({
      full_name:                payload.fullName,
      email:                    payload.email,
      contact_person:           payload.contactPerson,
      contact_email:            payload.contactEmail,
      address:                  payload.address ?? null,
      mobile_number:            payload.mobileNumber ?? null,
      business_number:          payload.businessNumber ?? null,
      fits_passenger_suv:       payload.fitsPassengerSuv,
      fits_wheel_packages:      payload.fitsWheelPackages,
      fits_truck:               payload.fitsTruck,
      wheel_alignment_available: payload.wheelAlignmentAvailable,
      wheel_alignment_price:    payload.wheelAlignmentPrice ?? null,
      mobile_fitting_available:  payload.mobileFittingAvailable,
      working_hours:            payload.workingHours,
    })
    .select('id')
    .single()

  return { data, error }
}

export async function listApplications(opts: { status?: string; page?: number }) {
  const { status, page = 1 } = opts
  const limit = 20
  const from  = (page - 1) * limit

  let query = db
    .from('fitter_applications')
    .select('id, full_name, email, status, submitted_at', { count: 'exact' })
    .order('submitted_at', { ascending: false })
    .range(from, from + limit - 1)

  if (status) query = query.eq('status', status)
  return query
}

export async function getApplication(id: string) {
  return db
    .from('fitter_applications')
    .select('*')
    .eq('id', id)
    .single()
}

export async function reviewApplication(
  id: string,
  status: 'approved' | 'rejected',
  adminNotes?: string,
  reviewerId?: string
) {
  // Always stamp the decision first so it never stays in limbo
  await db
    .from('fitter_applications')
    .update({
      status,
      admin_notes: adminNotes ?? null,
      reviewed_by: reviewerId ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (status !== 'approved') return { error: null }

  // ── Fetch full application data ──────────────────────────────────────────
  const { data: app, error: fetchErr } = await db
    .from('fitter_applications')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchErr || !app) return { error: fetchErr ?? new Error('Application not found') }

  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000'

  // ── 1. Invite user via Supabase Auth ─────────────────────────────────────
  // inviteUserByEmail creates the auth.users row + sends the invite email.
  // The trigger auto-creates a profiles row with role='customer'.
  let userId: string

  const { data: invited, error: inviteErr } = await db.auth.admin.inviteUserByEmail(
    app.email as string,
    {
      redirectTo: `${frontendUrl}/update-password`,
      data: { full_name: app.full_name },
    }
  )

  if (inviteErr) {
    // User may already exist — look them up by email instead
    const { data: existing } = await db.auth.admin.listUsers()
    const found = existing?.users?.find((u: { email?: string }) => u.email === app.email)
    if (!found) {
      console.error('[fitter approval] invite failed:', inviteErr)
      return { error: inviteErr }
    }
    userId = found.id
  } else {
    userId = invited!.user!.id
  }

  // ── 2. Elevate profile role to fitter ────────────────────────────────────
  await db
    .from('profiles')
    .update({ role: 'fitter' })
    .eq('id', userId)

  // ── 3. Build services_offered array from booleans ────────────────────────
  const services: string[] = []
  if (app.fits_passenger_suv)       services.push('passenger_suv')
  if (app.fits_wheel_packages)      services.push('wheel_packages')
  if (app.fits_truck)               services.push('truck')
  if (app.wheel_alignment_available) services.push('wheel_alignment')
  if (app.mobile_fitting_available)  services.push('mobile_fitting')

  // ── 4. Create fitment_centres row from application data ──────────────────
  const { error: centreErr } = await db
    .from('fitment_centres')
    .insert({
      user_id:         userId,
      business_name:   app.full_name,          // fitter's trading name
      contact_name:    app.contact_person,
      contact_phone:   app.mobile_number ?? null,
      email:           app.email,
      phone:           app.mobile_number ?? null,
      business_number: app.business_number ?? null,
      services_offered: services,
      opening_hours:   app.working_hours ?? [],
      approved_status: 'approved',
      is_active:       true,
    })

  if (centreErr) {
    console.error('[fitter approval] fitment_centres insert failed:', centreErr)
    return { error: centreErr }
  }

  // ── 5. Link the invited user back to the application ─────────────────────
  await db
    .from('fitter_applications')
    .update({ invited_user_id: userId })
    .eq('id', id)

  return { error: null }
}
