import { supabase as db } from './supabase.service'

const PAGE_SIZE = 20

// ── Stats ───────────────────────────────────────────────────────────────────

export async function getOrderStats() {
  const [totalRes, revenueRes, pendingRes] = await Promise.all([
    db.from('orders').select('order_id', { count: 'exact', head: true }),
    db.from('orders').select('total_amount').eq('payment_status', 'paid'),
    db.from('orders').select('order_id', { count: 'exact', head: true }).eq('payment_status', 'unpaid'),
  ])

  const totalOrders     = totalRes.count ?? 0
  const totalRevenue    = ((revenueRes.data ?? []) as any[]).reduce((s: number, o: any) => s + Number(o.total_amount ?? 0), 0)
  const avgOrderSize    = totalOrders > 0 ? totalRevenue / totalOrders : 0
  const pendingPayment  = pendingRes.count ?? 0

  return { totalOrders, totalRevenue, avgOrderSize, pendingPayment }
}

// ── List ────────────────────────────────────────────────────────────────────

export async function listOrders(opts: {
  search?:            string
  paymentStatus?:     string
  fulfillmentStatus?: string
  page?:              number
}) {
  const { search = '', paymentStatus, fulfillmentStatus, page = 1 } = opts
  const from = (page - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1

  let query = db
    .from('orders')
    .select(`
      order_id, order_number, created_at, currency,
      payment_status, order_status, total_amount,
      order_type, fitment_centre_id,
      shipping_address_snapshot,
      customers ( customer_id, first_name, last_name, email ),
      order_items ( order_item_id )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (paymentStatus)     query = query.eq('payment_status', paymentStatus)
  if (fulfillmentStatus) query = query.eq('order_status', fulfillmentStatus)
  if (search) {
    // Search by order number — ilike across join columns is complex; filter order_number
    query = query.ilike('order_number', `%${search}%`)
  }

  const { data, error, count } = await query
  // Map fitment_centre_id → fitment_id to match frontend types
  const mapped = (data ?? []).map((o: any) => ({ ...o, fitment_id: o.fitment_centre_id ?? null }))
  return { data: mapped, error, count }
}

// ── Get single order ────────────────────────────────────────────────────────

export async function getOrder(orderId: string) {
  const { data, error } = await db
    .from('orders')
    .select(`
      order_id, order_number, created_at, currency, notes,
      shipping_cost, gst_amount, discount_amount,
      total_amount,
      payment_status, order_status,
      order_type, fitment_centre_id,
      shipping_address_snapshot, billing_address_snapshot,
      customers (
        customer_id, email, first_name, last_name, phone, created_at, profile_id
      ),
      order_items (
        order_item_id, product_id, quantity, unit_price,
        skus ( sku, tyre_size_display )
      ),
      order_payments (
        payment_id, payment_reference, payment_method, amount, currency, status, created_at
      ),
      order_shipments (
        shipment_id, order_id, warehouse_id, shipment_number, status,
        tracking_number, tracking_uri, shipping_method,
        created_at, shipped_at, delivered_at,
        warehouses ( warehouse_name ),
        order_shipment_items (
          id, order_item_id, product_id, quantity,
          skus ( sku, tyre_size_display )
        )
      ),
      order_activity (
        activity_id, event_type, description, amount, currency, created_at
      )
    `)
    .eq('order_id', orderId)
    .order('created_at', { referencedTable: 'order_activity', ascending: false })
    .single()

  if (error || !data) return { data, error }

  // Map fitment_centre_id → fitment_id to match frontend types
  const fitmentCentreId = (data as any).fitment_centre_id ?? null

  // Attach fitment job if this is a fitment-centre delivery
  let fitmentJob: any = null
  if (fitmentCentreId) {
    const { data: job } = await db
      .from('fitment_jobs')
      .select(`
        job_id, task_number, job_status, scheduled_date, scheduled_time,
        fitment_centres ( fitment_centre_id, business_name )
      `)
      .eq('order_id', orderId)
      .maybeSingle()
    fitmentJob = job ?? null
  }

  return { data: { ...data, fitment_id: fitmentCentreId, fitment_job: fitmentJob }, error: null }
}

// ── Update order status ─────────────────────────────────────────────────────

export async function updateOrderStatus(orderId: string, patch: {
  paymentStatus?:     string
  fulfillmentStatus?: string
  notes?:             string | null
}) {
  const update: Record<string, any> = {}
  if (patch.paymentStatus)        update.payment_status = patch.paymentStatus
  if (patch.fulfillmentStatus)    update.order_status   = patch.fulfillmentStatus
  if (patch.notes !== undefined)  update.notes          = patch.notes

  if (Object.keys(update).length === 0) return { error: null }

  const { error } = await db.from('orders').update(update).eq('order_id', orderId)
  return { error }
}

// ── Create fulfillment ──────────────────────────────────────────────────────

export async function createFulfillment(
  orderId: string,
  payload: {
    warehouseId:      string
    shippingMethod?:  string
    sendNotification: boolean
    items: { orderItemId: string; productId: string; quantity: number }[]
  }
) {
  // 1. Count existing shipments for shipment_number
  const { count: existing } = await db
    .from('order_shipments')
    .select('shipment_id', { count: 'exact', head: true })
    .eq('order_id', orderId)

  const shipmentNumber = (existing ?? 0) + 1

  // 2. Create shipment
  const { data: shipment, error: shipErr } = await db
    .from('order_shipments')
    .insert({
      order_id:          orderId,
      warehouse_id:      payload.warehouseId,
      shipment_number:   shipmentNumber,
      shipping_method:   payload.shippingMethod ?? null,
      send_notification: payload.sendNotification,
      status:            'awaiting_shipping',
    })
    .select('shipment_id')
    .single()

  if (shipErr || !shipment) return { error: shipErr }

  // 3. Create shipment items
  const shipmentItems = payload.items.map(item => ({
    shipment_id:   (shipment as any).shipment_id,
    order_item_id: item.orderItemId,
    product_id:    item.productId,
    quantity:      item.quantity,
  }))

  const { error: itemsErr } = await db
    .from('order_shipment_items')
    .insert(shipmentItems)

  if (itemsErr) return { error: itemsErr }

  // 4. Recalculate order_status based on shipments
  await recalcOrderStatus(orderId)

  // 6. Log activity
  await db.from('order_activity').insert({
    order_id:    orderId,
    event_type:  'items_fulfilled',
    description: `${payload.items.length} item type(s) fulfilled`,
  })

  return { error: null, shipmentId: (shipment as any).shipment_id }
}

// ── Mark shipped ────────────────────────────────────────────────────────────

export async function markShipped(
  orderId:    string,
  shipmentId: string,
  payload: { trackingNumber?: string; trackingUri?: string; sendNotification: boolean }
) {
  const { error } = await db
    .from('order_shipments')
    .update({
      status:          'shipped',
      tracking_number: payload.trackingNumber ?? null,
      tracking_uri:    payload.trackingUri    ?? null,
      shipped_at:      new Date().toISOString(),
      send_notification: payload.sendNotification,
    })
    .eq('shipment_id', shipmentId)
    .eq('order_id', orderId)

  if (error) return { error }

  await recalcOrderStatus(orderId)

  await db.from('order_activity').insert({
    order_id:    orderId,
    event_type:  'items_shipped',
    description: payload.trackingNumber
      ? `Shipped — tracking ${payload.trackingNumber}`
      : 'Marked as shipped',
  })

  return { error: null }
}

// ── Mark delivered ──────────────────────────────────────────────────────────

export async function markDelivered(orderId: string, shipmentId: string) {
  const { error } = await db
    .from('order_shipments')
    .update({
      status:       'delivered',
      delivered_at: new Date().toISOString(),
    })
    .eq('shipment_id', shipmentId)
    .eq('order_id', orderId)

  if (error) return { error }

  await recalcOrderStatus(orderId)

  await db.from('order_activity').insert({
    order_id:    orderId,
    event_type:  'items_delivered',
    description: 'Marked as delivered',
  })

  return { error: null }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

async function recalcOrderStatus(orderId: string) {
  const { data: shipments } = await db
    .from('order_shipments')
    .select('status')
    .eq('order_id', orderId)

  const ships         = (shipments ?? []) as any[]
  const allDelivered  = ships.length > 0 && ships.every((s: any) => s.status === 'delivered')
  const anyShipped    = ships.some((s: any) => s.status === 'shipped' || s.status === 'delivered')
  const anyAwaiting   = ships.some((s: any) => s.status === 'awaiting_shipping')

  let orderStatus = 'processing'
  if (allDelivered)     orderStatus = 'fulfilled'
  else if (anyShipped)  orderStatus = 'processing'
  else if (anyAwaiting) orderStatus = 'processing'

  await db.from('orders').update({ order_status: orderStatus }).eq('order_id', orderId)
}

// ── Warehouse list (for fulfillment dropdown) ────────────────────────────────

export async function listWarehouses() {
  const { data, error } = await db.from('warehouses').select('warehouse_id, warehouse_name').eq('is_active', true)
  return { data, error }
}

export async function listShippingMethods() {
  const { data, error } = await db.from('shipping_methods').select('shipping_method_id, method_name').eq('is_active', true).limit(20)
  return { data, error }
}
