import { supabase as db } from './supabase.service'
import { notificationQueue } from '../queues'

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

// ── Create order (storefront checkout) ──────────────────────────────────────

export interface CreateOrderPayload {
  customer: { email: string; first_name: string; last_name: string }
  items: Array<{ product_id: string; quantity: number; unit_price: number }>
  shipping_address: { line1: string; line2?: string; suburb: string; state: string; postcode: string }
  fitment_centre_id?: string | null
  booking_slot?: { date: string; time: string } | null
  stripe_payment_intent_id: string
  total_amount: number
}

export async function createOrder(payload: CreateOrderPayload) {
  // 1. Find or create guest customer
  let customerId: string
  const { data: existing } = await db
    .from('customers')
    .select('customer_id')
    .eq('email', payload.customer.email)
    .maybeSingle()

  if (existing) {
    customerId = existing.customer_id
  } else {
    const { data: newCust, error: custErr } = await db
      .from('customers')
      .insert({
        email:      payload.customer.email,
        first_name: payload.customer.first_name,
        last_name:  payload.customer.last_name,
      })
      .select('customer_id')
      .single()
    if (custErr || !newCust) return { data: null, error: custErr ?? new Error('Failed to create customer') }
    customerId = newCust.customer_id
  }

  // 2. Generate order number ONX-YYYYMMDD-XXXX
  const datePart  = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const rand      = String(Math.floor(Math.random() * 9000) + 1000)
  const orderNumber = `ONX-${datePart}-${rand}`

  // 3. Insert order
  const { data: order, error: orderErr } = await db
    .from('orders')
    .insert({
      order_number:              orderNumber,
      customer_id:               customerId,
      payment_status:            'paid',
      order_status:              'processing',
      order_type:                payload.fitment_centre_id ? 'fitment' : 'delivery',
      fitment_centre_id:         payload.fitment_centre_id ?? null,
      currency:                  'AUD',
      total_amount:              payload.total_amount,
      shipping_cost:             0,
      gst_amount:                0,
      discount_amount:           0,
      shipping_address_snapshot: {
        ...payload.shipping_address,
        ...(payload.booking_slot ? { booking_slot: payload.booking_slot } : {}),
      },
    })
    .select('order_id, order_number')
    .single()

  if (orderErr || !order) return { data: null, error: orderErr ?? new Error('Failed to create order') }

  // 4. Insert order items
  const { error: itemsErr } = await db.from('order_items').insert(
    payload.items.map(i => ({
      order_id:    order.order_id,
      product_id:  i.product_id,
      quantity:    i.quantity,
      unit_price:  i.unit_price,
      total_price: +(i.unit_price * i.quantity).toFixed(2),
    }))
  )
  if (itemsErr) return { data: null, error: itemsErr }

  // 5. Decrement stock (read-modify-write; acceptable for MVP scale)
  for (const item of payload.items) {
    const { data: sku } = await db
      .from('skus')
      .select('total_available_stock')
      .eq('product_id', item.product_id)
      .maybeSingle()
    if (sku) {
      await db
        .from('skus')
        .update({ total_available_stock: Math.max(0, (sku.total_available_stock ?? 0) - item.quantity) })
        .eq('product_id', item.product_id)
    }
  }

  // 6. Payment record
  await db.from('order_payments').insert({
    order_id:          order.order_id,
    payment_reference: orderNumber,
    payment_method:    'stripe',
    amount:            payload.total_amount,
    currency:          'AUD',
    status:            'paid',
    stripe_payment_id: payload.stripe_payment_intent_id,
  })

  // 7. Fitment job (if applicable)
  if (payload.fitment_centre_id && payload.booking_slot) {
    const jobNum = `FJ-${orderNumber}`
    await db.from('fitment_jobs').insert({
      order_id:           order.order_id,
      fitment_centre_id:  payload.fitment_centre_id,
      task_number:        jobNum,
      job_status:         'scheduled',
      scheduled_date:     payload.booking_slot.date,
      scheduled_time:     payload.booking_slot.time,
    })
  }

  // 8. Activity log
  await db.from('order_activity').insert({
    order_id:    order.order_id,
    event_type:  'order_placed',
    description: `Order ${orderNumber} placed via storefront checkout`,
  })

  // 9. Fire order confirmation email (best-effort)
  notificationQueue?.add('order_confirmed', {
    type:           'order_confirmed',
    customer_email: payload.customer.email,
    order_number:   order.order_number,
    total_amount:   payload.total_amount,
    items:          payload.items.map(i => ({ name: i.product_id, qty: i.quantity, price: i.unit_price })),
    fitment_centre: undefined,
    scheduled_date: payload.booking_slot?.date,
  }).catch(() => {})

  return { data: { order_id: order.order_id, order_number: order.order_number }, error: null }
}
