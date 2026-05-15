import { supabase } from './supabase.service'

const PAGE_LIMIT = 20

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

export async function getFitmentCentre(id: string) {
  const { data, error } = await supabase
    .from('fitment_centres_with_users')
    .select(`
      fitment_centre_id,
      user_id,
      business_name,
      partner_id,
      is_active,
      contact_phone,
      business_number,
      created_at,
      role,
      email
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
  const ALLOWED = ['business_name', 'contact_phone', 'business_number', 'is_active']
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
  const since = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()

  const { data } = await supabase
    .from('fitter_earnings')
    .select('amount, created_at')
    .eq('fitment_centre_id', id)
    .gte('created_at', since)
    .order('created_at', { ascending: true })

  const byMonth: Record<string, number> = {}
  for (const row of data ?? []) {
    const month = (row.created_at as string).slice(0, 7)
    byMonth[month] = (byMonth[month] ?? 0) + (row.amount ?? 0)
  }

  return {
    purchase12Months: Object.entries(byMonth).map(([month, amount]) => ({ month, amount })),
    loginHistory:     [],
  }
}
