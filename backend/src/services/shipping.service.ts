import { supabase as db } from './supabase.service'

// ── Types ────────────────────────────────────────────────────────────────────

export type ShippingMethodType = 'own_fleet' | 'courier_api' | '3pl' | 'supplier_direct' | 'pickup'

export interface CreateShippingMethodPayload {
  method_name:  string
  method_type:  ShippingMethodType
  api_provider: string | null
  is_active:    boolean
}

export interface UpdateShippingMethodPayload extends Partial<CreateShippingMethodPayload> {}

export interface CreateShippingQuotePayload {
  order_id:                string | null
  warehouse_id:            string
  destination_postcode:    string
  shipping_method_id:      string
  courier_name:            string | null
  freight_cost:            number
  customer_charge:         number
  estimated_delivery_days: number | null
  api_response:            Record<string, unknown> | null
}

// ── Shipping Methods ──────────────────────────────────────────────────────────

export async function listShippingMethods(includeInactive = false) {
  let q = db
    .from('shipping_methods')
    .select('shipping_method_id, method_name, method_type, api_provider, is_active, created_at')
    .order('method_name')
  if (!includeInactive) q = q.eq('is_active', true)
  const { data, error } = await q
  if (error) throw error
  return data
}

export async function createShippingMethod(payload: CreateShippingMethodPayload) {
  const { data, error } = await db
    .from('shipping_methods')
    .insert({
      method_name:  payload.method_name.trim(),
      method_type:  payload.method_type,
      api_provider: payload.api_provider ?? null,
      is_active:    payload.is_active ?? true,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateShippingMethod(id: string, payload: UpdateShippingMethodPayload) {
  const allowed: Record<string, unknown> = {}
  if (payload.method_name  !== undefined) allowed.method_name  = payload.method_name.trim()
  if (payload.method_type  !== undefined) allowed.method_type  = payload.method_type
  if (payload.api_provider !== undefined) allowed.api_provider = payload.api_provider ?? null
  if (payload.is_active    !== undefined) allowed.is_active    = payload.is_active

  const { error } = await db
    .from('shipping_methods')
    .update(allowed)
    .eq('shipping_method_id', id)
  if (error) throw error
}

export async function deleteShippingMethod(id: string) {
  const { error } = await db
    .from('shipping_methods')
    .delete()
    .eq('shipping_method_id', id)
  if (error) throw error
}

// ── Shipping Quotes ───────────────────────────────────────────────────────────

export async function listShippingQuotes(filters: {
  orderId?:    string
  warehouseId?: string
  page?:       number
}) {
  const page     = Math.max(1, filters.page ?? 1)
  const pageSize = 50
  const from     = (page - 1) * pageSize
  const to       = from + pageSize - 1

  let q = db
    .from('shipping_quotes')
    .select(
      `quote_id, order_id, warehouse_id, destination_postcode,
       shipping_method_id, courier_name, freight_cost, customer_charge,
       estimated_delivery_days, api_response, created_at,
       shipping_methods ( method_name, method_type ),
       warehouses ( warehouse_name )`,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(from, to)

  if (filters.orderId)     q = q.eq('order_id',     filters.orderId)
  if (filters.warehouseId) q = q.eq('warehouse_id', filters.warehouseId)

  const { data, error, count } = await q
  if (error) throw error
  return { data, count }
}

export async function createShippingQuote(payload: CreateShippingQuotePayload) {
  const { data, error } = await db
    .from('shipping_quotes')
    .insert({
      order_id:                payload.order_id ?? null,
      warehouse_id:            payload.warehouse_id,
      destination_postcode:    payload.destination_postcode.trim(),
      shipping_method_id:      payload.shipping_method_id,
      courier_name:            payload.courier_name ?? null,
      freight_cost:            payload.freight_cost,
      customer_charge:         payload.customer_charge,
      estimated_delivery_days: payload.estimated_delivery_days ?? null,
      api_response:            payload.api_response ?? null,
    })
    .select()
    .single()
  if (error) throw error
  return data
}
