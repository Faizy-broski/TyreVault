import { supabase } from './supabase.service'

export type ShipmentStatus    = 'planned' | 'shipped' | 'arrived' | 'received' | 'cancelled'
export type ClearanceStatus   = 'pending' | 'cleared' | 'delayed'

export interface CreateShipmentPayload {
  po_id?:              string | null
  warehouse_id:        string
  container_number?:   string | null
  vessel_name?:        string | null
  booking_reference?:  string | null
  etd?:                string | null
  eta?:                string | null
  arrival_date?:       string | null
  clearance_status?:   ClearanceStatus | null
  shipment_status?:    ShipmentStatus
}

// ── LIST ─────────────────────────────────────────────────────────────────────
export async function listShipments(opts: {
  status?:    string
  warehouseId?: string
  poId?:      string
  page?:      number
  limit?:     number
}) {
  const { status, warehouseId, poId, page = 1, limit = 20 } = opts
  const from = (page - 1) * limit
  const to   = from + limit - 1

  let q = supabase
    .from('shipments')
    .select(`
      shipment_id, shipment_status, clearance_status,
      container_number, vessel_name, booking_reference,
      etd, eta, arrival_date, created_at,
      purchase_orders ( po_id, po_number ),
      warehouses ( warehouse_id, warehouse_name )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (status && status !== 'all') q = q.eq('shipment_status', status)
  if (warehouseId)                q = q.eq('warehouse_id', warehouseId)
  if (poId)                       q = q.eq('po_id', poId)

  const { data, count, error } = await q
  if (error) throw error
  return { data: data ?? [], total: count ?? 0 }
}

// ── GET SINGLE ────────────────────────────────────────────────────────────────
export async function getShipment(id: string) {
  const { data, error } = await supabase
    .from('shipments')
    .select(`
      shipment_id, shipment_status, clearance_status,
      container_number, vessel_name, booking_reference,
      etd, eta, arrival_date, created_at, updated_at,
      purchase_orders (
        po_id, po_number, po_status, order_date,
        suppliers ( supplier_id, supplier_name )
      ),
      warehouses ( warehouse_id, warehouse_name )
    `)
    .eq('shipment_id', id)
    .single()

  if (error) throw error
  return data
}

// ── CREATE ────────────────────────────────────────────────────────────────────
export async function createShipment(payload: CreateShipmentPayload) {
  const { data, error } = await supabase
    .from('shipments')
    .insert({
      po_id:             payload.po_id            ?? null,
      warehouse_id:      payload.warehouse_id,
      container_number:  payload.container_number  ?? null,
      vessel_name:       payload.vessel_name       ?? null,
      booking_reference: payload.booking_reference ?? null,
      etd:               payload.etd               ?? null,
      eta:               payload.eta               ?? null,
      arrival_date:      payload.arrival_date       ?? null,
      clearance_status:  payload.clearance_status  ?? null,
      shipment_status:   payload.shipment_status   ?? 'planned',
    })
    .select('shipment_id')
    .single()

  if (error) throw error
  return data
}

// ── UPDATE ────────────────────────────────────────────────────────────────────
export async function updateShipment(id: string, patch: {
  po_id?:              string | null
  warehouse_id?:       string
  container_number?:   string | null
  vessel_name?:        string | null
  booking_reference?:  string | null
  etd?:                string | null
  eta?:                string | null
  arrival_date?:       string | null
  clearance_status?:   ClearanceStatus | null
  shipment_status?:    ShipmentStatus
}) {
  const { error } = await supabase
    .from('shipments')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('shipment_id', id)

  if (error) throw error
}

// ── DELETE ────────────────────────────────────────────────────────────────────
export async function deleteShipment(id: string) {
  const { error } = await supabase
    .from('shipments')
    .delete()
    .eq('shipment_id', id)

  if (error) throw error
}
