import { supabase as db } from './supabase.service'
import { redis, TTL } from './redis.service'
import { notificationQueue } from '../queues'

const _statsCache = { entry: null as { data: Record<string, number>; exp: number } | null }
import { calcFittingCost } from '../routes/stripe.routes'
import { insertNotifications, getAdminUserIds } from './notifications.service'

const PAGE_SIZE = 20

// ── Stats ───────────────────────────────────────────────────────────────────

export async function getOrderStats() {
  const cacheKey = 'admin:order-stats'

  // Redis first, then process-local fallback (TTL.ADMIN_KPI = 300s)
  const redisCached = await redis?.get<Record<string, number>>(cacheKey)
  if (redisCached) return redisCached
  if (_statsCache.entry && _statsCache.entry.exp > Date.now()) return _statsCache.entry.data

  const { data, error } = await db.rpc('get_order_stats')
  if (error) throw error
  const d = data as any
  const stats = {
    totalOrders:    Number(d?.totalOrders   ?? 0),
    totalRevenue:   Number(d?.totalRevenue  ?? 0),
    avgOrderSize:   Number(d?.avgOrderSize  ?? 0),
    pendingPayment: Number(d?.pendingPayment ?? 0),
  }
  await redis?.set(cacheKey, stats, { ex: TTL.ADMIN_KPI })
  _statsCache.entry = { data: stats, exp: Date.now() + TTL.ADMIN_KPI * 1000 }
  return stats
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
      order_type, fulfilment_type, fitment_centre_id,
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
      shipping_cost, fitting_cost, gst_amount, discount_amount,
      total_amount,
      payment_status, order_status,
      order_type, fulfilment_type, fitment_centre_id,
      warehouse_id, shipping_address_id,
      shipping_address_snapshot, billing_address_snapshot,
      customers (
        customer_id, email, first_name, last_name, phone, created_at, profile_id
      ),
      order_items (
        order_item_id, product_id, product_type, quantity, unit_price,
        warehouse_id, supplier_id, fulfilment_source, reserved_qty,
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

// ── Delete order ────────────────────────────────────────────────────────────

export async function deleteOrder(orderId: string) {
  const { error } = await db.from('orders').delete().eq('order_id', orderId)
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

export async function listWarehouses(includeInactive = false) {
  let q = db.from('warehouses').select(
    'warehouse_id, warehouse_name, warehouse_type, state, suburb, postcode, address, ' +
    'contact_name, contact_phone, contact_email, is_own_warehouse, is_supplier_warehouse, is_active, created_at'
  ).order('created_at', { ascending: false })
  if (!includeInactive) q = q.eq('is_active', true)
  const { data, error } = await q
  return { data, error }
}

export type WarehouseType = 'own' | 'supplier' | '3pl'

export async function createWarehouse(payload: {
  warehouse_name:      string
  warehouse_type:      WarehouseType
  state:               string
  suburb?:             string | null
  postcode?:           string | null
  address?:            string | null
  contact_name?:       string | null
  contact_phone?:      string | null
  contact_email?:      string | null
  is_own_warehouse:    boolean
  is_supplier_warehouse: boolean
  is_active:           boolean
}) {
  const { data, error } = await db.from('warehouses').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function updateWarehouse(id: string, payload: {
  warehouse_name?:       string
  warehouse_type?:       WarehouseType
  state?:                string
  suburb?:               string | null
  postcode?:             string | null
  address?:              string | null
  contact_name?:         string | null
  contact_phone?:        string | null
  contact_email?:        string | null
  is_own_warehouse?:     boolean
  is_supplier_warehouse?: boolean
  is_active?:            boolean
}) {
  const { error } = await db.from('warehouses').update(payload).eq('warehouse_id', id)
  if (error) throw error
}

export async function deleteWarehouse(id: string) {
  const { error } = await db.from('warehouses').delete().eq('warehouse_id', id)
  if (error) throw error
}

export async function listShippingMethods() {
  const { data, error } = await db
    .from('shipping_methods')
    .select('shipping_method_id, method_name, method_type, api_provider, is_active')
    .eq('is_active', true)
    .order('method_name')
    .limit(50)
  return { data, error }
}

// ── Create order (storefront checkout) ──────────────────────────────────────

export interface CreateOrderPayload {
  customer: { email: string; first_name: string; last_name: string; phone?: string }
  items: Array<{ product_id: string; quantity: number; unit_price: number }>
  shipping_address: { line1: string; line2?: string; suburb: string; state: string; postcode: string }
  fitment_centre_id?:   string | null
  wheel_alignment_type?: string | null   // '2_wheel' | '4_wheel' | 'single' | null
  stripe_payment_intent_id: string
  total_amount: number                   // authoritative — set by backend via PaymentIntent
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
    // Keep phone up to date if customer provided one and we don't have it yet
    if (payload.customer.phone) {
      await db.from('customers')
        .update({ phone: payload.customer.phone })
        .eq('customer_id', customerId)
        .is('phone', null)
    }
  } else {
    const { data: newCust, error: custErr } = await db
      .from('customers')
      .insert({
        email:      payload.customer.email,
        first_name: payload.customer.first_name,
        last_name:  payload.customer.last_name,
        phone:      payload.customer.phone ?? null,
      })
      .select('customer_id')
      .single()
    if (custErr || !newCust) return { data: null, error: custErr ?? new Error('Failed to create customer') }
    customerId = newCust.customer_id
  }

  // 2. Validate all product_ids exist in skus (catches stale carts after SKU deletion)
  const requestedIds = payload.items.map(i => i.product_id)
  const { data: foundSkus } = await db
    .from('skus')
    .select('product_id')
    .in('product_id', requestedIds)

  const foundIds = new Set((foundSkus ?? []).map((s: { product_id: string }) => s.product_id))
  const missing  = requestedIds.filter(id => !foundIds.has(id))
  if (missing.length > 0) {
    return {
      data:  null,
      error: Object.assign(new Error('One or more products in your cart are no longer available. Please refresh and try again.'), { code: 'PRODUCT_NOT_FOUND', missing }),
    }
  }

  // 3. Generate order number TVT-YYYYMMDD-XXXX
  const datePart  = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const rand      = String(Math.floor(Math.random() * 9000) + 1000)
  const orderNumber = `TVT-${datePart}-${rand}`

  // 4. Server-side fitting cost calculation
  let fittingCost = 0
  if (payload.fitment_centre_id) {
    const { data: centre } = await db
      .from('fitment_centres')
      .select('fitting_price, wheel_alignment_price')
      .eq('fitment_centre_id', payload.fitment_centre_id)
      .eq('is_active', true)
      .maybeSingle()
    if (centre) {
      const totalQty = payload.items.reduce((s, i) => s + i.quantity, 0)
      fittingCost = calcFittingCost(
        centre as Parameters<typeof calcFittingCost>[0],
        totalQty,
        payload.wheel_alignment_type ?? null,
      )
    }
  }

  // 4. Insert order
  const { data: order, error: orderErr } = await db
    .from('orders')
    .insert({
      order_number:              orderNumber,
      customer_id:               customerId,
      payment_status:            'paid',
      order_status:              'processing',
      order_type:                payload.fitment_centre_id ? 'fitment_centre' : 'delivery',
      fulfilment_type:           'own_stock',
      fitment_centre_id:         payload.fitment_centre_id ?? null,
      wheel_alignment_type:      payload.wheel_alignment_type ?? null,
      currency:                  'AUD',
      total_amount:              payload.total_amount,
      shipping_cost:             0,
      fitting_cost:              fittingCost,
      gst_amount:                0,
      discount_amount:           0,
      shipping_address_snapshot: payload.shipping_address,
    })
    .select('order_id, order_number')
    .single()

  if (orderErr || !order) return { data: null, error: orderErr ?? new Error('Failed to create order') }

  // 5. Insert order items
  const { error: itemsErr } = await db.from('order_items').insert(
    payload.items.map(i => ({
      order_id:         order.order_id,
      product_id:       i.product_id,
      product_type:     'tyre' as const,
      quantity:         i.quantity,
      unit_price:       i.unit_price,
      total_price:      +(i.unit_price * i.quantity).toFixed(2),
      fulfilment_source: 'own_stock' as const,
    }))
  )
  if (itemsErr) return { data: null, error: itemsErr }

  // 6. Decrement stock — single batch UPDATE instead of N+1 read-modify-write loop
  await db.rpc('decrement_stock_batch', {
    p_items: payload.items.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
  })

  // 7. Payment record
  await db.from('order_payments').insert({
    order_id:          order.order_id,
    payment_reference: orderNumber,
    payment_method:    'stripe',
    amount:            payload.total_amount,
    currency:          'AUD',
    status:            'paid',
    stripe_payment_id: payload.stripe_payment_intent_id,
  })

  // 8. Fitment job (if fitment centre selected — fitter contacts customer to arrange time)
  if (payload.fitment_centre_id) {
    const jobNum   = `FJ-${orderNumber}`
    const totalQty = payload.items.reduce((s, i) => s + i.quantity, 0)

    // Fetch customer contact info and first SKU's tyre size for the job record
    const [custRes, skuRes, centreRes] = await Promise.all([
      db.from('customers')
        .select('first_name, last_name, phone')
        .eq('customer_id', customerId)
        .maybeSingle(),
      db.from('skus')
        .select('tyre_size_display, brands(brand_name), patterns(pattern_name)')
        .eq('product_id', payload.items[0]?.product_id ?? '')
        .maybeSingle(),
      db.from('fitment_centres')
        .select('email, fitting_price')
        .eq('fitment_centre_id', payload.fitment_centre_id)
        .maybeSingle(),
    ])

    const cust        = custRes.data
    const customerName  = cust ? `${cust.first_name} ${cust.last_name}`.trim() : payload.customer.first_name
    const customerPhone = cust?.phone ?? null
    const skuData       = skuRes.data as any
    const tyreSize      = skuData?.tyre_size_display ?? null
    const tyrePattern   = [skuData?.brands?.brand_name, skuData?.patterns?.pattern_name].filter(Boolean).join(' ') || null
    const fitterEmail   = centreRes.data?.email ?? null
    const fittingPrice  = Number(centreRes.data?.fitting_price ?? 0)
    const earningsAmt   = +(fittingPrice * totalQty).toFixed(2)

    const { data: newJob } = await db.from('fitment_jobs').insert({
      order_id:          order.order_id,
      fitment_centre_id: payload.fitment_centre_id,
      customer_id:       customerId,
      task_number:       jobNum,
      job_status:        'pending',
      customer_name:     customerName,
      customer_phone:    customerPhone,
      tyre_pattern:      tyrePattern,
      tyre_size:         tyreSize,
      quantity:          totalQty,
      earnings_amount:   earningsAmt > 0 ? earningsAmt : null,
    }).select('job_id').single()

    if (newJob) {
      // Job items — one row per order item
      await db.from('fitment_job_items').insert(
        payload.items.map(i => ({
          job_id:       newJob.job_id,
          product_id:   i.product_id,
          quantity:     i.quantity,
          service_type: 'supply_and_fit' as const,
          unit_price:   i.unit_price,
        }))
      )

      // Notify fitter by email (best-effort)
      if (fitterEmail) {
        notificationQueue?.add('fitment_job_assigned', {
          type:             'fitment_job_assigned',
          fitter_email:     fitterEmail,
          job_id:           newJob.job_id,
          job_number:       jobNum,
          customer_name:    customerName,
          customer_contact: customerPhone ?? payload.customer.email,
          scheduled_date:   'To be arranged — fitter will contact customer',
        }).catch(() => {})
      }

      // In-app notification → fitter (fire-and-forget)
      const { data: centre } = await db
        .from('fitment_centres')
        .select('user_id')
        .eq('fitment_centre_id', payload.fitment_centre_id!)
        .maybeSingle()
      if (centre?.user_id) {
        insertNotifications([{
          recipient_id: centre.user_id,
          type:         'job_assigned',
          title:        `New job ${jobNum}`,
          body:         `${customerName} · ${tyreSize ?? ''} · ${totalQty} tyre${totalQty !== 1 ? 's' : ''}`.trim(),
          metadata:     { order_id: order.order_id, order_number: orderNumber, job_id: newJob.job_id },
        }]).catch(() => {})
      }
    }
  }

  // 9. Activity log
  await db.from('order_activity').insert({
    order_id:    order.order_id,
    event_type:  'order_placed',
    description: `Order ${orderNumber} placed via storefront checkout`,
  })

  // 10. In-app notifications → all admins (fire-and-forget)
  const customerFull = `${payload.customer.first_name} ${payload.customer.last_name}`.trim()
  getAdminUserIds().then(adminIds =>
    insertNotifications(adminIds.map(id => ({
      recipient_id: id,
      type:         'new_order',
      title:        `New order ${orderNumber}`,
      body:         `${customerFull} · A$${payload.total_amount.toFixed(2)}`,
      metadata:     { order_id: order.order_id, order_number: orderNumber },
    })))
  ).catch(() => {})

  // 11. Fire order confirmation email (best-effort)
  notificationQueue?.add('order_confirmed', {
    type:           'order_confirmed',
    customer_email: payload.customer.email,
    order_number:   order.order_number,
    total_amount:   payload.total_amount,
    items:          payload.items.map(i => ({ name: i.product_id, qty: i.quantity, price: i.unit_price })),
    fitment_centre_id: payload.fitment_centre_id ?? undefined,
    fitting_cost:   fittingCost,
  }).catch(() => {})

  return { data: { order_id: order.order_id, order_number: order.order_number }, error: null }
}
