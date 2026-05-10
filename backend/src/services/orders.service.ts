import { supabase as db } from './supabase.service'

const PAGE_SIZE = 20

// ── Stats ───────────────────────────────────────────────────────────────────

export async function getOrderStats() {
  const [totalRes, revenueRes, pendingRes] = await Promise.all([
    db.from('orders').select('order_id', { count: 'exact', head: true }),
    db.from('orders').select('total_amount').eq('payment_status', 'success'),
    db.from('orders').select('order_id', { count: 'exact', head: true }).eq('payment_status', 'pending'),
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
      payment_status, fulfillment_status, total_amount,
      delivery_method, fitment_centre_id,
      shipping_address_snapshot,
      customers ( customer_id, first_name, last_name, email ),
      order_items ( order_item_id )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (paymentStatus)     query = query.eq('payment_status', paymentStatus)
  if (fulfillmentStatus) query = query.eq('fulfillment_status', fulfillmentStatus)
  if (search) {
    // Search by order number — ilike across join columns is complex; filter order_number
    query = query.ilike('order_number', `%${search}%`)
  }

  return query
}

// ── Get single order ────────────────────────────────────────────────────────

export async function getOrder(orderId: string) {
  const { data, error } = await db
    .from('orders')
    .select(`
      order_id, order_number, created_at, currency, notes,
      subtotal_amount, shipping_amount, tax_amount, discount_amount,
      total_amount, paid_amount, outstanding_amount,
      payment_status, fulfillment_status,
      delivery_method, fitment_centre_id,
      shipping_address_snapshot, billing_address_snapshot,
      customers (
        customer_id, email, first_name, last_name, phone, created_at, profile_id
      ),
      order_items (
        order_item_id, product_id, quantity, unit_price, total_price, fulfilled_quantity,
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

  // Attach fitment job if this is a fitment-centre delivery
  let fitmentJob: any = null
  if ((data as any).fitment_centre_id) {
    const { data: job } = await db
      .from('fitment_jobs')
      .select(`
        job_id, task_number, status, scheduled_date, scheduled_time,
        fitment_centres ( fitment_centre_id, centre_name )
      `)
      .eq('order_id', orderId)
      .maybeSingle()
    fitmentJob = job ?? null
  }

  return { data: { ...data, fitment_job: fitmentJob }, error: null }
}

// ── Update order status ─────────────────────────────────────────────────────

export async function updateOrderStatus(orderId: string, patch: {
  paymentStatus?:     string
  fulfillmentStatus?: string
}) {
  const update: Record<string, string> = {}
  if (patch.paymentStatus)     update.payment_status     = patch.paymentStatus
  if (patch.fulfillmentStatus) update.fulfillment_status = patch.fulfillmentStatus

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

  // 4. Update fulfilled_quantity on order_items
  for (const item of payload.items) {
    await db.rpc('increment_fulfilled_quantity', {
      p_order_item_id: item.orderItemId,
      p_quantity:      item.quantity,
    })
  }

  // 5. Recalculate order fulfillment_status
  await recalcFulfillmentStatus(orderId)

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

  await recalcFulfillmentStatus(orderId)

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

  await recalcFulfillmentStatus(orderId)

  await db.from('order_activity').insert({
    order_id:    orderId,
    event_type:  'items_delivered',
    description: 'Marked as delivered',
  })

  return { error: null }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

async function recalcFulfillmentStatus(orderId: string) {
  const { data: items } = await db
    .from('order_items')
    .select('quantity, fulfilled_quantity')
    .eq('order_id', orderId)

  const { data: shipments } = await db
    .from('order_shipments')
    .select('status')
    .eq('order_id', orderId)

  if (!items || items.length === 0) return

  const rows     = items as any[]
  const allFull  = rows.every((i: any) => i.fulfilled_quantity >= i.quantity)
  const anyFull  = rows.some((i: any)  => i.fulfilled_quantity > 0)
  const ships    = (shipments ?? []) as any[]
  const allShipped   = ships.length > 0 && ships.every((s: any)  => s.status === 'shipped' || s.status === 'delivered')
  const allDelivered = ships.length > 0 && ships.every((s: any)  => s.status === 'delivered')
  const anyAwaiting  = ships.some((s: any)  => s.status === 'awaiting_shipping')

  let fulfillmentStatus = 'unfulfilled'
  if (allDelivered)       fulfillmentStatus = 'delivered'
  else if (allShipped)    fulfillmentStatus = 'shipped'
  else if (anyAwaiting)   fulfillmentStatus = 'awaiting_shipping'
  else if (allFull)       fulfillmentStatus = 'fulfilled'
  else if (anyFull)       fulfillmentStatus = 'partially_fulfilled'

  await db.from('orders').update({ fulfillment_status: fulfillmentStatus }).eq('order_id', orderId)
}

// ── Warehouse list (for fulfillment dropdown) ────────────────────────────────

export async function listWarehouses() {
  return db.from('warehouses').select('warehouse_id, warehouse_name').eq('is_active', true)
}

export async function listShippingMethods() {
  return db.from('shipping_methods').select('shipping_method_id, method_name').limit(20)
}
