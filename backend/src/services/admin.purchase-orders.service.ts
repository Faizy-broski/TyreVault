import { supabase } from './supabase.service'

export type PoStatus = 'draft' | 'ordered' | 'shipped' | 'arrived' | 'received' | 'cancelled'

export interface CreatePoPayload {
  supplier_id:      string
  warehouse_id:     string
  order_date:       string        // ISO date
  shipment_date?:   string | null
  eta_date?:        string | null
  currency?:        string
  exchange_rate?:   number | null
  freight_cost?:    number | null
  clearance_cost?:  number | null
  notes?:           string | null
}

export interface PoItemPayload {
  product_id:            string
  quantity_ordered:      number
  quantity_received?:    number
  unit_cost:             number
  landed_cost_per_unit?: number | null
  cbm_per_unit?:         number | null
}

// ── Generate PO number: PO-YYYYMM-XXXX ──────────────────────────────────────
async function generatePoNumber(): Promise<string> {
  const prefix = `PO-${new Date().toISOString().slice(0, 7).replace('-', '')}`
  const { count } = await supabase
    .from('purchase_orders')
    .select('po_id', { count: 'exact', head: true })
    .like('po_number', `${prefix}%`)
  const seq = String((count ?? 0) + 1).padStart(4, '0')
  return `${prefix}-${seq}`
}

// ── LIST ─────────────────────────────────────────────────────────────────────
export async function listPurchaseOrders(opts: {
  status?:      string
  supplierId?:  string
  page?:        number
  limit?:       number
}) {
  const { status, supplierId, page = 1, limit = 20 } = opts
  const from = (page - 1) * limit
  const to   = from + limit - 1

  let q = supabase
    .from('purchase_orders')
    .select(`
      po_id, po_number, po_status, order_date, shipment_date, eta_date,
      currency, total_cost, freight_cost, clearance_cost, created_at,
      suppliers ( supplier_id, supplier_name ),
      warehouses ( warehouse_id, warehouse_name ),
      purchase_order_items ( po_item_id )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (status && status !== 'all') q = q.eq('po_status', status)
  if (supplierId)                 q = q.eq('supplier_id', supplierId)

  const { data, count, error } = await q
  if (error) throw error
  return { data: data ?? [], total: count ?? 0 }
}

// ── GET SINGLE ────────────────────────────────────────────────────────────────
export async function getPurchaseOrder(id: string) {
  const { data, error } = await supabase
    .from('purchase_orders')
    .select(`
      po_id, po_number, po_status, order_date, shipment_date, eta_date,
      currency, exchange_rate, freight_cost, clearance_cost, total_cost,
      notes, created_at, updated_at,
      suppliers ( supplier_id, supplier_name, contact_email, contact_phone ),
      warehouses ( warehouse_id, warehouse_name ),
      purchase_order_items (
        po_item_id, product_id, quantity_ordered, quantity_received,
        unit_cost, landed_cost_per_unit, cbm_per_unit,
        skus:product_id ( sku, tyre_size_display )
      )
    `)
    .eq('po_id', id)
    .single()

  if (error) throw error
  return data
}

// ── CREATE ────────────────────────────────────────────────────────────────────
export async function createPurchaseOrder(payload: CreatePoPayload, items: PoItemPayload[]) {
  const po_number = await generatePoNumber()

  const totalCost = items.reduce((sum, i) => sum + i.unit_cost * i.quantity_ordered, 0)
    + (payload.freight_cost ?? 0)
    + (payload.clearance_cost ?? 0)

  const { data: po, error: poErr } = await supabase
    .from('purchase_orders')
    .insert({
      po_number,
      supplier_id:     payload.supplier_id,
      warehouse_id:    payload.warehouse_id,
      po_status:       'draft',
      order_date:      payload.order_date,
      shipment_date:   payload.shipment_date ?? null,
      eta_date:        payload.eta_date ?? null,
      currency:        payload.currency ?? 'AUD',
      exchange_rate:   payload.exchange_rate ?? null,
      freight_cost:    payload.freight_cost ?? null,
      clearance_cost:  payload.clearance_cost ?? null,
      total_cost:      parseFloat(totalCost.toFixed(2)),
      notes:           payload.notes ?? null,
    })
    .select('po_id, po_number')
    .single()

  if (poErr) throw poErr

  if (items.length > 0) {
    const { error: itemErr } = await supabase.from('purchase_order_items').insert(
      items.map(i => ({
        po_id:                 po.po_id,
        product_id:            i.product_id,
        quantity_ordered:      i.quantity_ordered,
        quantity_received:     i.quantity_received ?? 0,
        unit_cost:             i.unit_cost,
        landed_cost_per_unit:  i.landed_cost_per_unit ?? null,
        cbm_per_unit:          i.cbm_per_unit ?? null,
      }))
    )
    if (itemErr) throw itemErr
  }

  return po
}

// ── UPDATE PO (header) ────────────────────────────────────────────────────────
export async function updatePurchaseOrder(id: string, patch: {
  po_status?:     PoStatus
  order_date?:    string
  shipment_date?: string | null
  eta_date?:      string | null
  currency?:      string
  exchange_rate?: number | null
  freight_cost?:  number | null
  clearance_cost?: number | null
  notes?:         string | null
}) {
  const update: Record<string, unknown> = { ...patch, updated_at: new Date().toISOString() }

  // Recompute total_cost if costs changed
  if (patch.freight_cost !== undefined || patch.clearance_cost !== undefined) {
    const [{ data: po }, { data: items }] = await Promise.all([
      supabase.from('purchase_orders').select('freight_cost, clearance_cost').eq('po_id', id).single(),
      supabase.from('purchase_order_items').select('unit_cost, quantity_ordered').eq('po_id', id),
    ])
    const itemsTotal = (items ?? []).reduce((s, r) => s + r.unit_cost * r.quantity_ordered, 0)
    const freight   = patch.freight_cost   ?? po?.freight_cost   ?? 0
    const clearance = patch.clearance_cost ?? po?.clearance_cost ?? 0
    update.total_cost = parseFloat((itemsTotal + freight + clearance).toFixed(2))
  }

  const { error } = await supabase.from('purchase_orders').update(update).eq('po_id', id)
  if (error) throw error
}

// ── DELETE PO ─────────────────────────────────────────────────────────────────
export async function deletePurchaseOrder(id: string) {
  await supabase.from('purchase_order_items').delete().eq('po_id', id)
  const { error } = await supabase.from('purchase_orders').delete().eq('po_id', id)
  if (error) throw error
}

// ── ADD ITEM ──────────────────────────────────────────────────────────────────
export async function addPoItem(poId: string, item: PoItemPayload) {
  const { data, error } = await supabase
    .from('purchase_order_items')
    .insert({
      po_id:                poId,
      product_id:           item.product_id,
      quantity_ordered:     item.quantity_ordered,
      quantity_received:    item.quantity_received ?? 0,
      unit_cost:            item.unit_cost,
      landed_cost_per_unit: item.landed_cost_per_unit ?? null,
      cbm_per_unit:         item.cbm_per_unit ?? null,
    })
    .select()
    .single()

  if (error) throw error
  await recomputeTotal(poId)
  return data
}

// ── UPDATE ITEM ───────────────────────────────────────────────────────────────
export async function updatePoItem(poItemId: string, patch: {
  quantity_ordered?:     number
  quantity_received?:    number
  unit_cost?:            number
  landed_cost_per_unit?: number | null
  cbm_per_unit?:         number | null
}) {
  const { data, error } = await supabase
    .from('purchase_order_items')
    .update(patch)
    .eq('po_item_id', poItemId)
    .select('po_id')
    .single()

  if (error) throw error
  await recomputeTotal(data.po_id)
}

// ── DELETE ITEM ───────────────────────────────────────────────────────────────
export async function deletePoItem(poItemId: string) {
  const { data, error } = await supabase
    .from('purchase_order_items')
    .delete()
    .eq('po_item_id', poItemId)
    .select('po_id')
    .single()

  if (error) throw error
  await recomputeTotal(data.po_id)
}

// ── RECOMPUTE total_cost ──────────────────────────────────────────────────────
async function recomputeTotal(poId: string) {
  const [{ data: po }, { data: items }] = await Promise.all([
    supabase.from('purchase_orders').select('freight_cost, clearance_cost').eq('po_id', poId).single(),
    supabase.from('purchase_order_items').select('unit_cost, quantity_ordered').eq('po_id', poId),
  ])
  const itemsTotal = (items ?? []).reduce((s, r) => s + r.unit_cost * r.quantity_ordered, 0)
  const total = itemsTotal + (po?.freight_cost ?? 0) + (po?.clearance_cost ?? 0)
  await supabase.from('purchase_orders').update({ total_cost: parseFloat(total.toFixed(2)) }).eq('po_id', poId)
}
