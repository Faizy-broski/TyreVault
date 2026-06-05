import { Worker, type Job } from 'bullmq'
import { supabase } from '../services/supabase.service'

const connection = {
  url: process.env.UPSTASH_REDIS_URL!,
  maxRetriesPerRequest: null as null,
  enableReadyCheck: false,
}

// ============================================================
// Job payloads
// ============================================================
export type CatalogueSyncJobData =
  | { type: 'publish_sku';         product_id: string }
  | { type: 'archive_sku';         product_id: string }
  | { type: 'bulk_archive';        product_ids: string[] }
  | { type: 'sync_supplier_stock'; supplier_id: string; product_id: string }

export const catalogueSyncWorker = new Worker<CatalogueSyncJobData>(
  'catalogue-sync',
  async (job: Job<CatalogueSyncJobData>) => {
    const { data } = job

    if (data.type === 'publish_sku') {
      await setSkuStatus(data.product_id, 'active')
    }

    if (data.type === 'archive_sku') {
      await setSkuStatus(data.product_id, 'inactive')
    }

    if (data.type === 'bulk_archive') {
      await Promise.all(data.product_ids.map(id => setSkuStatus(id, 'inactive')))
    }

    if (data.type === 'sync_supplier_stock') {
      await syncSupplierStock(data.supplier_id, data.product_id)
    }
  },
  { connection, concurrency: 20 }
)

catalogueSyncWorker.on('failed', (job, err) => {
  console.error(`[CatalogueSync] Job ${job?.id} failed:`, err.message)
})

// ============================================================
// SKU status helpers
// ============================================================
async function setSkuStatus(product_id: string, status: 'active' | 'inactive'): Promise<void> {
  const { error } = await supabase
    .from('skus')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('product_id', product_id)

  if (error) throw new Error(`setSkuStatus(${product_id}): ${error.message}`)
  console.log(`[CatalogueSync] ${product_id} → ${status}`)
}

// ============================================================
// Supplier stock sync
// Triggered whenever a supplier mapping is approved (is_verified → true).
// For csv/manual connection types: uses the price + qty from supplier_product_map.
// For api_link/edi: stubbed — logs and uses map values until API integration is wired.
// ============================================================
async function syncSupplierStock(supplier_id: string, product_id: string): Promise<void> {
  // Fetch the approved mapping row
  const { data: map, error: mapErr } = await supabase
    .from('supplier_product_map')
    .select('supplier_price, supplier_stock, lead_time_days')
    .eq('supplier_id', supplier_id)
    .eq('product_id', product_id)
    .eq('is_verified', true)
    .maybeSingle()

  if (mapErr) throw new Error(`syncSupplierStock map fetch: ${mapErr.message}`)
  if (!map) {
    console.warn(`[CatalogueSync] syncSupplierStock: no verified map for supplier=${supplier_id} product=${product_id}`)
    return
  }

  // Check connection type — stub API/EDI integrations for now
  const { data: supplier } = await supabase
    .from('suppliers')
    .select('connection_type, supplier_name')
    .eq('supplier_id', supplier_id)
    .maybeSingle()

  if (supplier?.connection_type === 'api_link' || supplier?.connection_type === 'edi') {
    console.log(`[CatalogueSync] ${supplier.supplier_name} uses ${supplier.connection_type} — live sync not yet wired, using map values`)
  }

  // Upsert supplier_product_stock with values from the map row
  const { error: upsertErr } = await supabase
    .from('supplier_product_stock')
    .upsert(
      {
        supplier_id,
        product_id,
        available_stock:    map.supplier_stock ?? 0,
        supplier_price:     map.supplier_price ?? null,
        selling_allowed:    true,
        lead_time_days:     map.lead_time_days ?? null,
        stock_last_updated: new Date().toISOString(),
      },
      { onConflict: 'supplier_id,product_id' }
    )

  if (upsertErr) throw new Error(`syncSupplierStock upsert: ${upsertErr.message}`)

  console.log(`[CatalogueSync] stock synced supplier=${supplier_id} product=${product_id} qty=${map.supplier_stock ?? 0}`)
}
