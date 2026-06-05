import { supabase as db } from './supabase.service'

// ── Resolve centre from auth user ────────────────────────────────────────────

export async function getCentreByUser(userId: string) {
  return db
    .from('fitment_centres')
    .select('fitment_centre_id, business_name, partner_id, contact_phone, business_number')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single()
}

// ── KPI stats ─────────────────────────────────────────────────────────────────

export async function getKPIs(centreId: string) {
  const today      = new Date().toISOString().split('T')[0]
  const weekStart  = getWeekStart(new Date())
  const weekEnd    = getWeekEnd(new Date())
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

  const [newToday, pending, scheduled, earningsRes, payoutsRes] = await Promise.all([
    db.from('fitment_jobs')
      .select('job_id', { count: 'exact', head: true })
      .eq('fitment_centre_id', centreId)
      .eq('job_status', 'pending')
      .gte('created_at', `${today}T00:00:00`)
      .lte('created_at', `${today}T23:59:59`),

    db.from('fitment_jobs')
      .select('job_id', { count: 'exact', head: true })
      .eq('fitment_centre_id', centreId)
      .eq('job_status', 'pending'),

    db.from('fitment_jobs')
      .select('job_id', { count: 'exact', head: true })
      .eq('fitment_centre_id', centreId)
      .in('job_status', ['accepted', 'assigned', 'in_progress'])
      .gte('scheduled_date', weekStart)
      .lte('scheduled_date', weekEnd),

    db.from('fitter_earnings')
      .select('amount, status')
      .eq('fitment_centre_id', centreId)
      .gte('created_at', `${monthStart}T00:00:00`),

    db.from('fitter_earnings')
      .select('amount')
      .eq('fitment_centre_id', centreId)
      .eq('status', 'pending'),
  ])

  const earnings = (earningsRes.data ?? []) as any[]
  const payouts  = (payoutsRes.data ?? []) as any[]

  const earningsThisMonth      = earnings.reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0)
  const completedJobsThisMonth = earnings.length
  const pendingPayouts         = payouts.reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0)

  return {
    newJobsToday:           newToday.count ?? 0,
    pendingJobs:            pending.count  ?? 0,
    scheduledThisWeek:      scheduled.count ?? 0,
    earningsThisMonth,
    completedJobsThisMonth,
    pendingPayouts,
  }
}

// ── Jobs ──────────────────────────────────────────────────────────────────────

export async function listJobs(centreId: string, status?: string) {
  let query = db
    .from('fitment_jobs')
    .select('job_id, task_number, customer_name, customer_phone, scheduled_date, scheduled_time, tyre_pattern, tyre_size, quantity, vehicle_model, job_status, notes, earnings_amount, created_at')
    .eq('fitment_centre_id', centreId)
    .order('scheduled_date', { ascending: true })
    .order('scheduled_time', { ascending: true })

  if (status) query = query.eq('job_status', status)
  return query
}

export async function getJob(centreId: string, jobId: string) {
  const [jobRes, itemsRes] = await Promise.all([
    db
      .from('fitment_jobs')
      .select('job_id, fitment_centre_id, task_number, customer_name, customer_phone, scheduled_date, scheduled_time, tyre_pattern, tyre_size, quantity, vehicle_model, job_status, notes, fitter_notes, admin_notes, accepted_at, completed_at, earnings_amount, created_at')
      .eq('job_id', jobId)
      .eq('fitment_centre_id', centreId)
      .single(),

    db
      .from('fitment_job_items')
      .select('job_item_id, product_id, quantity, service_type, unit_price')
      .eq('job_id', jobId),
  ])

  if (jobRes.error || !jobRes.data) return jobRes

  // Attach items array — empty array if table not yet populated or query fails
  const items = itemsRes.error ? [] : (itemsRes.data ?? [])
  return { ...jobRes, data: { ...jobRes.data, items } }
}

export async function updateJobStatus(
  centreId:       string,
  jobId:          string,
  status:         'accepted' | 'rejected' | 'in_progress' | 'completed' | 'cancelled',
  fitterNotes?:   string,
  scheduledDate?: string | null,
  scheduledTime?: string | null,
) {
  const update: Record<string, unknown> = { job_status: status }

  if (fitterNotes !== undefined) update.fitter_notes = fitterNotes

  // Audit timestamps
  if (status === 'accepted')  update.accepted_at  = new Date().toISOString()
  if (status === 'completed') update.completed_at = new Date().toISOString()

  // Fitter records the appointment they arranged with the customer
  if (scheduledDate !== undefined) update.scheduled_date = scheduledDate ?? null
  if (scheduledTime !== undefined) update.scheduled_time = scheduledTime ?? null

  // Auto-calculate earnings_amount when completing (if not already set on creation)
  if (status === 'completed') {
    const { data: job } = await db
      .from('fitment_jobs')
      .select('earnings_amount, quantity, fitment_centre_id')
      .eq('job_id', jobId)
      .maybeSingle()

    if (job && (job.earnings_amount == null || Number(job.earnings_amount) === 0)) {
      const { data: centre } = await db
        .from('fitment_centres')
        .select('fitting_price')
        .eq('fitment_centre_id', job.fitment_centre_id)
        .maybeSingle()
      if (centre?.fitting_price) {
        update.earnings_amount = +(Number(centre.fitting_price) * (job.quantity ?? 1)).toFixed(2)
      }
    }
  }

  return db
    .from('fitment_jobs')
    .update(update)
    .eq('job_id', jobId)
    .eq('fitment_centre_id', centreId)
}

// ── Schedule ──────────────────────────────────────────────────────────────────

export async function getWeekJobs(centreId: string, weekStart: string, weekEnd: string) {
  return db
    .from('fitment_jobs')
    .select('job_id, customer_name, vehicle_model, scheduled_date, scheduled_time, job_status, tyre_size, quantity')
    .eq('fitment_centre_id', centreId)
    .gte('scheduled_date', weekStart)
    .lte('scheduled_date', weekEnd)
    .in('job_status', ['assigned', 'accepted', 'in_progress', 'completed'])
    .order('scheduled_date', { ascending: true })
    .order('scheduled_time', { ascending: true })
}

// ── Earnings ──────────────────────────────────────────────────────────────────

export async function getEarningsSummary(centreId: string) {
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

  const [monthRes, pendingRes] = await Promise.all([
    db.from('fitter_earnings')
      .select('amount')
      .eq('fitment_centre_id', centreId)
      .gte('created_at', `${monthStart}T00:00:00`),

    db.from('fitter_earnings')
      .select('amount')
      .eq('fitment_centre_id', centreId)
      .eq('status', 'pending'),
  ])

  const thisMonth    = (monthRes.data ?? []).reduce((s: number, e: any) => s + Number(e.amount), 0)
  const pendingTotal = (pendingRes.data ?? []).reduce((s: number, e: any) => s + Number(e.amount), 0)
  const completedCount = monthRes.data?.length ?? 0

  return { thisMonth, pendingTotal, completedCount }
}

export async function listEarnings(centreId: string, opts: {
  status?: string; search?: string; page?: number
}) {
  const { status, search, page = 1 } = opts
  const limit = 20
  const from  = (page - 1) * limit

  let query = db
    .from('fitter_earnings')
    .select('id, customer_name, amount, status, payment_date, created_at', { count: 'exact' })
    .eq('fitment_centre_id', centreId)
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1)

  if (status) query = query.eq('status', status)
  if (search) query = query.ilike('customer_name', `%${search}%`)
  return query
}

// ── Pricing ───────────────────────────────────────────────────────────────────

export async function getPricing(centreId: string) {
  return db
    .from('fitter_pricing')
    .select('id, tyre_type, rim_range, per_tyre, per_pair, per_set_of_4, callout_fee')
    .eq('fitment_centre_id', centreId)
}

export async function upsertPricing(centreId: string, rows: {
  tyre_type: string; rim_range: string
  per_tyre: number | null; per_pair: number | null
  per_set_of_4: number | null; callout_fee: number | null
}[]) {
  const payload = rows.map(r => ({ ...r, fitment_centre_id: centreId, updated_at: new Date().toISOString() }))
  return db
    .from('fitter_pricing')
    .upsert(payload, { onConflict: 'fitment_centre_id,tyre_type,rim_range' })
}

// ── Profile ───────────────────────────────────────────────────────────────────

export async function getProfile(centreId: string) {
  return db
    .from('fitment_centres')
    .select('fitment_centre_id, business_name, contact_name, email, contact_phone, business_number, partner_id, approved_status')
    .eq('fitment_centre_id', centreId)
    .single()
}

export async function updateProfile(centreId: string, payload: {
  business_name?: string
  contact_name?:  string
  email?:         string
  contact_phone?: string
  business_number?: string
}) {
  return db
    .from('fitment_centres')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('fitment_centre_id', centreId)
}

// ── Services ──────────────────────────────────────────────────────────────────

export async function getServices(centreId: string) {
  return db
    .from('fitment_centres')
    .select('services_offered, wheel_alignment_price, mobile_fitting_available, opening_hours')
    .eq('fitment_centre_id', centreId)
    .single()
}

export async function updateServices(centreId: string, payload: {
  services_offered:        string[]
  wheel_alignment_price?:  number | null
  mobile_fitting_available: boolean
  opening_hours:           unknown
}) {
  return db
    .from('fitment_centres')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('fitment_centre_id', centreId)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getWeekStart(d: Date) {
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff)).toISOString().split('T')[0]
}

function getWeekEnd(d: Date) {
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? 0 : 7)
  return new Date(d.setDate(diff)).toISOString().split('T')[0]
}
