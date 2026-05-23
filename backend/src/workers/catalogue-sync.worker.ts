import { Worker, type Job } from 'bullmq'
import { supabase } from '../services/supabase.service'

const connection = {
  url: process.env.UPSTASH_REDIS_URL!,
  maxRetriesPerRequest: null as null,
  enableReadyCheck: false,
}

// ============================================================
// Job payloads
// search_vector is a generated column — auto-updated on any row write.
// This worker only manages skus.status; the FTS RPC handles exclusion
// via WHERE status = 'active'.
// ============================================================
export type CatalogueSyncJobData =
  | { type: 'publish_sku';  product_id: string }
  | { type: 'archive_sku';  product_id: string }
  | { type: 'bulk_archive'; product_ids: string[] }

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
  },
  { connection, concurrency: 20 }
)

catalogueSyncWorker.on('failed', (job, err) => {
  console.error(`[CatalogueSync] Job ${job?.id} failed:`, err.message)
})

async function setSkuStatus(product_id: string, status: 'active' | 'inactive'): Promise<void> {
  const { error } = await supabase
    .from('skus')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('product_id', product_id)

  if (error) throw new Error(`setSkuStatus(${product_id}): ${error.message}`)
  console.log(`[CatalogueSync] ${product_id} → ${status}`)
}
