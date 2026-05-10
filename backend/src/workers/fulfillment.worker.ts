import { Worker, type Job } from 'bullmq'
import { supabase } from '../services/supabase.service'
import { redis, TTL } from '../services/redis.service'

const connection = {
  url: process.env.UPSTASH_REDIS_URL!,
  maxRetriesPerRequest: null as null,
  enableReadyCheck: false,
}

export type FulfillmentJobData = {
  order_id: string
}

type FulfillmentPlan = {
  order_item_id: string
  product_id: string
  quantity: number
  source: 'own_stock' | 'supplier_stock' | '3pl_stock' | 'incoming_stock'
  warehouse_id: string | null
  supplier_id: string | null
}

// ============================================================
// Worker — concurrency: 5, priority: highest
// Runs for every new order placed. Routes each line item to
// the best stock source: own warehouse → local supplier → remote supplier
// ============================================================
export const fulfillmentWorker = new Worker<FulfillmentJobData>(
  'fulfillment',
  async (job: Job<FulfillmentJobData>) => {
    const { order_id } = job.data
    console.log(`[Fulfillment] Routing order ${order_id}`)

    // Fetch order items
    const { data: items, error } = await supabase
      .from('order_items')
      .select('order_item_id, product_id, quantity, warehouse_id, supplier_id')
      .eq('order_id', order_id)

    if (error || !items) {
      throw new Error(`Cannot fetch order items for ${order_id}: ${error?.message}`)
    }

    const plan: FulfillmentPlan[] = []

    for (const item of items) {
      const source = await routeItem(item.product_id, item.quantity)
      plan.push({
        order_item_id: item.order_item_id,
        product_id: item.product_id,
        quantity: item.quantity,
        ...source,
      })
    }

    // Write fulfillment plan back to order_items + reserve stock atomically
    await applyFulfillmentPlan(order_id, plan)

    // Invalidate stock cache for all affected SKUs
    await Promise.all(
      plan.map(p => redis?.del(`stock:${p.product_id}`))
    )

    console.log(`[Fulfillment] Order ${order_id} routed:`, plan.map(p => `${p.product_id}→${p.source}`))
    return plan
  },
  { connection, concurrency: 5 }
)

fulfillmentWorker.on('failed', (job, err) => {
  console.error(`[Fulfillment] Job ${job?.id} failed:`, err.message)
})

// ============================================================
// Routing logic
// Priority: own warehouse → local supplier → remote supplier
// ============================================================
async function routeItem(product_id: string, quantity: number): Promise<{
  source: FulfillmentPlan['source']
  warehouse_id: string | null
  supplier_id: string | null
}> {
  // 1. Check own warehouse stock (nearest / highest margin)
  const { data: ownStock } = await supabase
    .from('product_stock')
    .select('warehouse_id, available_stock, warehouses!inner(is_own_warehouse, state)')
    .eq('product_id', product_id)
    .gte('available_stock', quantity)
    .order('available_stock', { ascending: false })
    .limit(1)
    .single()

  if (ownStock) {
    return { source: 'own_stock', warehouse_id: ownStock.warehouse_id, supplier_id: null }
  }

  // 2. Check supplier stock (selling_allowed = true)
  const { data: supplierStock } = await supabase
    .from('supplier_product_stock')
    .select('supplier_id, supplier_warehouse_id, available_stock, lead_time_days, supplier_price')
    .eq('product_id', product_id)
    .eq('selling_allowed', true)
    .gte('available_stock', quantity)
    .order('lead_time_days', { ascending: true })
    .limit(1)
    .single()

  if (supplierStock) {
    return {
      source: 'supplier_stock',
      warehouse_id: supplierStock.supplier_warehouse_id ?? null,
      supplier_id: supplierStock.supplier_id,
    }
  }

  // 3. No stock available — flag as incoming_stock (backorder)
  return { source: 'incoming_stock', warehouse_id: null, supplier_id: null }
}

async function applyFulfillmentPlan(order_id: string, plan: FulfillmentPlan[]): Promise<void> {
  for (const item of plan) {
    // Update order_item with fulfillment source
    await supabase
      .from('order_items')
      .update({
        fulfilment_source: item.source,
        warehouse_id: item.warehouse_id,
        supplier_id: item.supplier_id,
        reserved_qty: item.quantity,
      })
      .eq('order_item_id', item.order_item_id)

    // Reserve stock from own warehouse
    if (item.source === 'own_stock' && item.warehouse_id) {
      await supabase.rpc('reserve_stock', {
        p_product_id: item.product_id,
        p_warehouse_id: item.warehouse_id,
        p_quantity: item.quantity,
      })
    }
  }
}
