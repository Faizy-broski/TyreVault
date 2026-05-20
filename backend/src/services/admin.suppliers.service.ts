import { supabase } from './supabase.service'
import { supplierImportQueue } from '../queues'
import type { SupplierImportJobData } from '../workers/supplier-import.worker'

// ============================================================
// Types
// ============================================================
export type SupplierRow = {
  supplier_sku?: string
  supplier_product_name?: string
  supplier_brand_name?: string
  supplier_pattern_name?: string
  supplier_size_raw?: string
  load_index?: string
  speed_rating?: string
  ply_rating?: string
  supplier_price?: number
  supplier_stock?: number
  lead_time_days?: number
}

export type CreateSupplierPayload = {
  supplier_name: string
  supplier_type?: 'factory' | 'wholesaler' | 'marketplace_partner' | '3pl'
  contact_name?: string
  email?: string
  phone?: string
  state?: string
  country?: string
  payment_terms?: string
  stock_access_type?: 'owned_after_purchase' | 'consignment' | 'live_supplier_stock'
}

export type MappingFilter = 'pending' | 'verified' | 'all'

const ALLOWED_SUPPLIER_FIELDS = new Set([
  'supplier_name', 'supplier_type', 'contact_name', 'email', 'phone',
  'state', 'country', 'payment_terms', 'stock_access_type', 'api_connected', 'is_active',
])

// ============================================================
// LIST
// ============================================================
export async function listSuppliers() {
  const { data, error } = await supabase
    .from('suppliers')
    .select('supplier_id, supplier_name, supplier_type, stock_access_type, api_connected, is_active, created_at')
    .order('supplier_name')

  if (error) throw error
  return data ?? []
}

// ============================================================
// GET SINGLE — with mapping stats
// ============================================================
export async function getSupplier(id: string) {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('supplier_id', id)
    .single()

  if (error) throw error

  // Mapping counts
  const [{ count: autoMapped }, { count: pendingReview }] = await Promise.all([
    supabase.from('supplier_product_map')
      .select('id', { count: 'exact', head: true })
      .eq('supplier_id', id)
      .eq('is_verified', true),
    supabase.from('supplier_product_map')
      .select('id', { count: 'exact', head: true })
      .eq('supplier_id', id)
      .eq('is_verified', false),
  ])

  return { ...data, stats: { auto_mapped: autoMapped ?? 0, pending_review: pendingReview ?? 0 } }
}

// ============================================================
// CREATE
// ============================================================
export async function createSupplier(payload: CreateSupplierPayload) {
  const { data, error } = await supabase
    .from('suppliers')
    .insert({
      supplier_name:     payload.supplier_name,
      supplier_type:     payload.supplier_type ?? 'wholesaler',
      contact_name:      payload.contact_name,
      email:             payload.email,
      phone:             payload.phone,
      state:             payload.state,
      country:           payload.country ?? 'Australia',
      payment_terms:     payload.payment_terms,
      stock_access_type: payload.stock_access_type ?? 'owned_after_purchase',
      is_active:         true,
    })
    .select('supplier_id')
    .single()

  if (error) throw error
  return data
}

// ============================================================
// UPDATE
// ============================================================
export async function updateSupplier(id: string, body: Record<string, unknown>) {
  const patch: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(body)) {
    if (ALLOWED_SUPPLIER_FIELDS.has(k)) patch[k] = v
  }

  const { error } = await supabase
    .from('suppliers')
    .update(patch)
    .eq('supplier_id', id)

  if (error) throw error
}

// ============================================================
// GET MAPPINGS — for review dashboard
// ============================================================
export async function getSupplierMappings(
  supplierId: string,
  { page = 1, filter = 'pending' as MappingFilter, limit = 30 } = {}
) {
  const from = (page - 1) * limit
  const to   = from + limit - 1

  let query = supabase
    .from('supplier_product_map')
    .select(`
      id,
      supplier_sku,
      supplier_product_name,
      supplier_brand_name,
      supplier_pattern_name,
      supplier_size_raw,
      normalized_size_code,
      load_index,
      speed_rating,
      supplier_price,
      supplier_stock,
      match_confidence,
      is_verified,
      last_updated,
      product_id,
      skus:product_id (
        sku,
        tyre_size_display,
        brands:brand_id ( brand_name ),
        patterns:pattern_id ( pattern_name )
      )
    `, { count: 'exact' })
    .eq('supplier_id', supplierId)
    .order('match_confidence', { ascending: false })
    .range(from, to)

  if (filter === 'pending')  query = query.eq('is_verified', false).not('product_id', 'is', null)
  if (filter === 'verified') query = query.eq('is_verified', true)

  const { data, count, error } = await query
  if (error) throw error

  return { data: data ?? [], total: count ?? 0 }
}

// ============================================================
// APPROVE — set is_verified = true
// ============================================================
export async function approveMapping(mapId: string) {
  const { error } = await supabase
    .from('supplier_product_map')
    .update({ is_verified: true })
    .eq('id', mapId)

  if (error) throw error
}

// ============================================================
// REJECT — delete the row
// ============================================================
export async function rejectMapping(mapId: string) {
  const { error } = await supabase
    .from('supplier_product_map')
    .delete()
    .eq('id', mapId)

  if (error) throw error
}

// ============================================================
// MANUAL MAP — admin picks the correct product
// ============================================================
export async function manualMap(mapId: string, productId: string) {
  const { error } = await supabase
    .from('supplier_product_map')
    .update({ product_id: productId, is_verified: true })
    .eq('id', mapId)

  if (error) throw error
}

// ============================================================
// ENQUEUE CSV IMPORT
// ============================================================
export async function enqueueImport(supplierId: string, rows: SupplierRow[], sessionId: string) {
  if (!supplierImportQueue) {
    throw new Error('BullMQ not configured — set UPSTASH_REDIS_URL')
  }

  const jobData: SupplierImportJobData = {
    supplier_id:       supplierId,
    rows,
    import_session_id: sessionId,
  }

  const job = await supplierImportQueue.add('import', jobData, {
    jobId: `import:${supplierId}:${sessionId}`,
  })

  return job.id
}

// ============================================================
// GET IMPORT JOB STATUS
// ============================================================
export async function getImportJobStatus(jobId: string) {
  if (!supplierImportQueue) {
    return { state: 'unknown', progress: 0 }
  }

  const job = await supplierImportQueue.getJob(jobId)
  if (!job) return { state: 'not_found', progress: 0 }

  const state    = await job.getState()
  const progress = typeof job.progress === 'number' ? job.progress : 0

  return {
    state,
    progress,
    result:    state === 'completed' ? job.returnvalue : null,
    failReason: state === 'failed'   ? job.failedReason : null,
  }
}
