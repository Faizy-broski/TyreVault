import { Worker, type Job } from 'bullmq'
import { supabase } from '../services/supabase.service'
import { redis, TTL } from '../services/redis.service'
import { catalogueSyncQueue } from '../queues'

const connection = {
  url: process.env.UPSTASH_REDIS_URL!,
  maxRetriesPerRequest: null as null,
  enableReadyCheck: false,
}

export type StockSyncJobData =
  | { type: 'supplier_api_sync'; supplier_id: string }
  | { type: 'full_stock_refresh' }

// ============================================================
// Worker — concurrency: 3, repeatable (scheduled via pg_cron)
// Syncs stock levels from supplier APIs and updates Redis cache.
// ============================================================
export const stockSyncWorker = new Worker<StockSyncJobData>(
  'stock-sync',
  async (job: Job<StockSyncJobData>) => {
    const { data } = job

    if (data.type === 'supplier_api_sync') {
      await syncSupplierStock(data.supplier_id)
    }

    if (data.type === 'full_stock_refresh') {
      await refreshAllStockCache()
    }
  },
  { connection, concurrency: 3 }
)

stockSyncWorker.on('failed', (job, err) => {
  console.error(`[StockSync] Job ${job?.id} failed:`, err.message)
})

// ============================================================
// Sync supplier stock from external API (scaffolded)
// Real API integration per supplier added in Stage 6.
// ============================================================
async function syncSupplierStock(supplier_id: string): Promise<void> {
  console.log(`[StockSync] Syncing supplier ${supplier_id}`)

  // TODO Stage 6: call supplier API, diff against current stock,
  // update supplier_product_stock rows, invalidate Redis, push to Typesense

  // For now: refresh Redis cache for all SKUs this supplier covers
  const { data: stockRows } = await supabase
    .from('supplier_product_stock')
    .select('product_id, available_stock')
    .eq('supplier_id', supplier_id)
    .eq('selling_allowed', true)

  if (!stockRows) return

  // Invalidate stock cache (next read will re-query DB)
  await Promise.all(
    stockRows.map(row => redis?.del(`stock:${row.product_id}`))
  )

  // Trigger Typesense sync for affected SKUs
  const productIds = stockRows.map(r => r.product_id)
  if (productIds.length > 0) {
    await catalogueSyncQueue?.add('bulk_sync', { type: 'bulk_sync', product_ids: productIds })
  }

  console.log(`[StockSync] Invalidated ${productIds.length} stock cache entries for supplier ${supplier_id}`)
}

// ============================================================
// Warm up Redis stock cache for all active SKUs
// ============================================================
async function refreshAllStockCache(): Promise<void> {
  console.log('[StockSync] Refreshing all stock cache...')

  let offset = 0
  const batchSize = 500

  while (true) {
    const { data } = await supabase
      .from('skus')
      .select('product_id, total_available_stock')
      .eq('status', 'active')
      .range(offset, offset + batchSize - 1)

    if (!data || data.length === 0) break

    await Promise.all(
      data.map(row =>
        redis?.set(`stock:${row.product_id}`, row.total_available_stock, { ex: TTL.STOCK })
      )
    )

    console.log(`[StockSync] Warmed stock cache for ${data.length} SKUs (offset ${offset})`)
    offset += batchSize
    if (data.length < batchSize) break
  }

  console.log('[StockSync] Stock cache refresh complete.')
}
