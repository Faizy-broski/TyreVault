import { supabase } from './supabase.service'
import { invalidateRoleCache } from '../middleware/auth.middleware'

const PAGE_LIMIT = 20

export async function deleteFitmentCentre(id: string) {
  // Delete auth user — cascade handles all related rows via FK
  const centre = await getFitmentCentre(id)
  if (!centre) throw Object.assign(new Error('Not found'), { status: 404 })

  const { error: delError } = await supabase
    .from('fitment_centres')
    .delete()
    .eq('fitment_centre_id', id)
  if (delError) throw delError

  if (centre.user_id) {
    const { error: authError } = await supabase.auth.admin.deleteUser(centre.user_id)
    if (authError) throw authError
  }
}

export async function emailExists(email: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('auth_email_exists', { email_to_check: email })
  if (error) throw error
  return Boolean(data)
}

export async function listFitmentCentres(opts: {
  page?:   number
  search?: string
  status?: string
}) {
  const page = opts.page ?? 1
  const from = (page - 1) * PAGE_LIMIT
  const to   = from + PAGE_LIMIT - 1

  // let query = supabase
  //   .from('fitment_centres')
  //   .select(
  //     `fitment_id, business_name, partner_id, is_active,
  //      contact_phone, business_number, created_at,
  //      profiles!user_id (email)`,
  //     { count: 'exact' }
  //   )
  let query = supabase
    .from('fitment_centres_with_users')
    .select(`
      fitment_centre_id,
      business_name,
      user_id,
      partner_id,
      is_active,
      approved_status,
      contact_phone,
      business_number,
      created_at,
      role,
      email
    `, { count: 'exact' })

  if (opts.status === 'active') query = query.eq('is_active', true)
  if (opts.status === 'hold')   query = query.eq('is_active', false)
  if (opts.search)              query = query.ilike('business_name', `%${opts.search}%`)

  const { data, error, count } = await query
    .range(from, to)
    .order('created_at', { ascending: false })

  if (error) throw error
  return { data: data ?? [], total: count ?? 0 }
}

export async function createFitmentCentre(body: {
  // Credentials
  email:    string
  password: string
  // Identity
  full_name?:      string
  contact_person?: string
  contact_email?:  string
  // Business
  business_name:            string
  address?:                 string
  mobile_number?:           string
  phone?:                   string
  business_number?:         string
  preferred_partner?:       boolean
  // Services
  fits_passenger_suv?:       boolean
  fits_wheel_packages?:      boolean
  fits_truck?:               boolean
  fitting_price?:            number | null
  wheel_alignment_available?: boolean
  wheel_alignment_price?:    number | null
  mobile_fitting_available?: boolean
  // Schedule
  working_hours?: { day: string; label: string; isClosed: boolean; openTime: string; closeTime: string }[]
}) {
  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email:         body.email,
    password:      body.password,
    email_confirm: true,
  })
  if (authError) throw authError
  const userId = authData.user.id

  // 2. Upsert profile with fitter role
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({ id: userId, role: 'fitter' }, { onConflict: 'id' })
  if (profileError) throw profileError
  await invalidateRoleCache(userId)

  // 3. Build services_offered array from fitting type flags
  const services: string[] = []
  if (body.fits_passenger_suv)  services.push('passenger', 'suv')
  if (body.fits_wheel_packages) services.push('wheel_packages')
  if (body.fits_truck)          services.push('truck')

  // 4. Create fitment centre record (approved + active immediately)
  const { data: centre, error: centreError } = await supabase
    .from('fitment_centres')
    .insert({
      user_id:                  userId,
      email:                    body.contact_email || body.email,
      business_name:            body.business_name,
      contact_name:             body.contact_person   ?? body.full_name ?? null,
      contact_phone:            body.mobile_number    ?? null,
      phone:                    body.phone            ?? null,
      business_number:          body.business_number  ?? null,
      fitting_price:            body.fitting_price    ?? null,
      wheel_alignment_price:    body.wheel_alignment_available ? (body.wheel_alignment_price ?? null) : null,
      mobile_fitting_available: body.mobile_fitting_available  ?? false,
      preferred_partner:        body.preferred_partner         ?? false,
      services_offered:         services,
      opening_hours:            body.working_hours    ?? [],
      approved_status:          'approved',
      is_active:                true,
    })
    .select('fitment_centre_id, partner_id, business_name')
    .single()
  if (centreError) throw centreError

  return centre
}

export async function getFitmentCentre(id: string) {
  const { data, error } = await supabase
    .from('fitment_centres_with_users')
    .select(`
      fitment_centre_id,
      user_id,
      business_name,
      contact_name,
      contact_phone,
      phone,
      email,
      business_number,
      partner_id,
      is_active,
      approved_status,
      address_id,
      latitude,
      longitude,
      fitting_price,
      wheel_alignment_price,
      mobile_fitting_available,
      preferred_partner,
      opening_hours,
      services_offered,
      created_at,
      role
    `)
    .eq('fitment_centre_id', id)
    .single()

  if (error) throw error
  return data
}

export async function updateFitmentCentreStatus(id: string, isActive: boolean) {
  const { error } = await supabase
    .from('fitment_centres')
    .update({ is_active: isActive })
    .eq('fitment_centre_id', id)
  if (error) throw error
}

export async function updateFitmentCentreProfile(id: string, updates: Record<string, unknown>) {
  const ALLOWED = [
    'business_name', 'contact_name', 'contact_phone', 'phone', 'email',
    'business_number', 'approved_status',
    'address_id', 'latitude', 'longitude',
    'fitting_price', 'wheel_alignment_price',
    'mobile_fitting_available', 'preferred_partner',
    'opening_hours', 'services_offered',
    'is_active',
  ]
  const safe = Object.fromEntries(
    Object.entries(updates).filter(([k]) => ALLOWED.includes(k))
  )
  const { error } = await supabase
    .from('fitment_centres')
    .update(safe)
    .eq('fitment_centre_id', id)
  if (error) throw error
}

export async function listCentreJobs(id: string, opts: {
  page?:   number
  status?: string
  search?: string
}) {
  const page  = opts.page ?? 1
  const limit = 20
  const from  = (page - 1) * limit
  const to    = from + limit - 1

  let query = supabase
    .from('fitment_jobs')
    .select('*', { count: 'exact' })
    .eq('fitment_centre_id', id)

  if (opts.status) query = query.eq('job_status', opts.status)
  if (opts.search) query = query.ilike('customer_name', `%${opts.search}%`)

  const { data, error, count } = await query
    .range(from, to)
    .order('created_at', { ascending: false })

  if (error) throw error
  return { data: data ?? [], total: count ?? 0 }
}

export async function getAdminJob(centreId: string, jobId: string) {
  const [jobRes, itemsRes] = await Promise.all([
    supabase
      .from('fitment_jobs')
      .select(`
        job_id, order_id, fitment_centre_id, customer_id,
        task_number, customer_name, customer_phone,
        scheduled_date, scheduled_time,
        tyre_pattern, tyre_size, quantity, vehicle_model,
        job_status, notes, fitter_notes, admin_notes,
        assigned_by_admin_id, accepted_at, completed_at,
        earnings_amount, created_at, updated_at
      `)
      .eq('job_id', jobId)
      .eq('fitment_centre_id', centreId)
      .single(),
    supabase
      .from('fitment_job_items')
      .select('job_item_id, product_id, quantity, service_type, unit_price')
      .eq('job_id', jobId),
  ])

  if (jobRes.error || !jobRes.data) return { data: null, error: jobRes.error }
  const items = itemsRes.error ? [] : (itemsRes.data ?? [])
  return { data: { ...jobRes.data, items }, error: null }
}

export type AdminJobStatus = 'pending' | 'assigned' | 'accepted' | 'rejected' | 'in_progress' | 'completed' | 'cancelled'

export async function updateAdminJob(centreId: string, jobId: string, payload: {
  job_status?:           AdminJobStatus
  admin_notes?:          string | null
  assigned_by_admin_id?: string | null
}) {
  const ALLOWED = ['job_status', 'admin_notes', 'assigned_by_admin_id'] as const
  const safe: Record<string, unknown> = {}
  for (const key of ALLOWED) {
    if (payload[key] !== undefined) safe[key] = payload[key]
  }
  if (Object.keys(safe).length === 0) return
  const { error } = await supabase
    .from('fitment_jobs')
    .update(safe)
    .eq('job_id', jobId)
    .eq('fitment_centre_id', centreId)
  if (error) throw error
}

export async function getCentreKPIs(id: string) {
  const startOfMonth = new Date(
    new Date().getFullYear(), new Date().getMonth(), 1
  ).toISOString()

  const [activeRes, completedRes, earningsRes] = await Promise.all([
    supabase
      .from('fitment_jobs')
      .select('job_id', { count: 'exact', head: true })
      .eq('fitment_centre_id', id)
      .in('job_status', ['pending', 'assigned', 'accepted']),
    supabase
      .from('fitment_jobs')
      .select('job_id', { count: 'exact', head: true })
      .eq('fitment_centre_id', id)
      .eq('job_status', 'completed')
      .gte('created_at', startOfMonth),
    supabase
      .from('fitment_jobs')
      .select('earnings_amount')
      .eq('fitment_centre_id', id)
      .eq('job_status', 'completed')
      .gte('created_at', startOfMonth),
  ])

  const thisMonthEarnings = (earningsRes.data ?? [])
    .reduce((s, r) => s + (r.earnings_amount ?? 0), 0)

  return {
    activeJobs:         activeRes.count    ?? 0,
    thisMonthCompleted: completedRes.count ?? 0,
    averageRating:      4.8,               // placeholder — needs ratings table
    ratingCount:        completedRes.count ?? 0,
    thisMonthEarnings,
  }
}

export async function getCentrePricing(id: string) {
  const { data, error } = await supabase
    .from('fitter_pricing')
    .select('*')
    .eq('fitment_centre_id', id)
  if (error) throw error
  return data ?? []
}

export async function upsertCentrePricing(id: string, rows: {
  tyre_type:    string
  rim_range:    string
  per_tyre:     number | null
  per_pair:     number | null
  per_set_of_4: number | null
  callout_fee:  number | null
}[]) {
  const upsertRows = rows.map(r => ({ ...r, fitment_centre_id: id }))
  const { error } = await supabase
    .from('fitter_pricing')
    .upsert(upsertRows, { onConflict: 'fitment_centre_id,tyre_type,rim_range' })
  if (error) throw error
}

// ── Payment & Settlement ─────────────────────────────────────────────────────

export async function getPaymentSummary(id: string) {
  const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString()

  const { data: payouts } = await supabase
    .from('fitment_centre_payouts')
    .select('gross_amount, net_payout, status, payment_date, settlement_schedule')
    .eq('fitment_centre_id', id)
    .order('payment_date', { ascending: false })

  const rows  = payouts ?? []
  const thisYear = rows.filter(
    r => r.payment_date && r.payment_date >= yearStart.slice(0, 10)
  )

  const totalPaidThisYear  = thisYear
    .filter(r => r.status === 'completed')
    .reduce((s, r) => s + (r.net_payout ?? 0), 0)

  const completedPayments  = thisYear.filter(r => r.status === 'completed').length

  const pendingPayout      = rows
    .filter(r => r.status === 'in_progress')
    .reduce((s, r) => s + (r.net_payout ?? 0), 0)

  const lastCompleted      = rows.find(r => r.status === 'completed')

  return {
    totalPaidThisYear,
    completedPayments,
    pendingPayout,
    lastPaymentAmount: lastCompleted?.net_payout ?? 0,
    lastPaymentDate:   lastCompleted?.payment_date ?? null,
    settlementSchedule: rows[0]?.settlement_schedule ?? 'monthly',
  }
}

export async function listPaymentHistory(id: string, opts: {
  page?:   number
  status?: string
  search?: string
}) {
  const page  = opts.page ?? 1
  const limit = 20
  const from  = (page - 1) * limit
  const to    = from + limit - 1

  let query = supabase
    .from('fitment_centre_payouts')
    .select('*', { count: 'exact' })
    .eq('fitment_centre_id', id)

  if (opts.status) query = query.eq('status', opts.status)

  const { data, error, count } = await query
    .range(from, to)
    .order('created_at', { ascending: false })

  if (error) throw error
  return { data: data ?? [], total: count ?? 0 }
}

export async function getBankDetails(id: string) {
  const { data } = await supabase
    .from('fitment_centre_bank_details')
    .select('*')
    .eq('fitment_centre_id', id)
    .single()
  return data ?? null
}

export async function upsertBankDetails(id: string, details: {
  account_holder: string
  bank_name:      string
  bsb:            string | null
  account_number: string
}) {
  const { error } = await supabase
    .from('fitment_centre_bank_details')
    .upsert({ ...details, fitment_centre_id: id }, { onConflict: 'fitment_centre_id' })
  if (error) throw error
}

// ── Compliance Documents ─────────────────────────────────────────────────────

export async function listComplianceDocs(id: string) {
  const { data, error } = await supabase
    .from('fitment_centre_compliance_docs')
    .select('*')
    .eq('fitment_centre_id', id)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function updateComplianceDoc(
  centreId: string,
  docId:    string,
  updates:  { status?: string; provider?: string; policy_number?: string; expiry_date?: string }
) {
  const { error } = await supabase
    .from('fitment_centre_compliance_docs')
    .update(updates)
    .eq('id', docId)
    .eq('fitment_centre_id', centreId)
  if (error) throw error
}

// ── Purchase Stats ─────────────────────────────────────────────────────────

export async function getCentreStats(id: string) {
  const yearStart = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const { data, error } = await supabase.rpc('get_centre_stats', {
    p_centre_id: id,
    p_year_start: yearStart,
  })
  if (error) throw error

  return {
    purchase12Months: (data ?? []).map((row: any) => ({ month: row.month, amount: Number(row.earnings ?? 0) })),
    loginHistory:     [],
  }
}
