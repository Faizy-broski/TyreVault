import { Worker, type Job } from 'bullmq'
import { supabase } from '../services/supabase.service'
import { typesense, SKU_COLLECTION, buildSkuDocument } from '../services/typesense.service'

const connection = {
  url: process.env.UPSTASH_REDIS_URL!,
  maxRetriesPerRequest: null as null,
  enableReadyCheck: false,
}

// ============================================================
// Job payloads
// ============================================================
export type CatalogueSyncJobData =
  | { type: 'upsert_sku';  product_id: string }
  | { type: 'delete_sku';  product_id: string }
  | { type: 'bulk_sync';   product_ids: string[] }
  | { type: 'full_sync' }

// ============================================================
// Worker
// concurrency: 10 — can push 10 documents to Typesense in parallel
// ============================================================
export const catalogueSyncWorker = new Worker<CatalogueSyncJobData>(
  'catalogue-sync',
  async (job: Job<CatalogueSyncJobData>) => {
    const { data } = job

    if (data.type === 'upsert_sku') {
      await upsertSku(data.product_id)
    }

    if (data.type === 'delete_sku') {
      await typesense.collections(SKU_COLLECTION).documents(data.product_id).delete()
      console.log(`[CatalogueSync] Deleted SKU ${data.product_id} from Typesense`)
    }

    if (data.type === 'bulk_sync') {
      await Promise.all(data.product_ids.map(upsertSku))
    }

    if (data.type === 'full_sync') {
      await fullSync()
    }
  },
  { connection, concurrency: 10 }
)

catalogueSyncWorker.on('failed', (job, err) => {
  console.error(`[CatalogueSync] Job ${job?.id} failed:`, err.message)
})

// ============================================================
// Helpers
// ============================================================

async function upsertSku(product_id: string): Promise<void> {
  const row = await fetchSkuForTypesense(product_id)
  if (!row) return

  const doc = buildSkuDocument(row)
  await typesense.collections(SKU_COLLECTION).documents().upsert(doc)
  console.log(`[CatalogueSync] Upserted SKU ${product_id}`)
}

async function fullSync(): Promise<void> {
  console.log('[CatalogueSync] Starting full sync...')
  let offset = 0
  const batchSize = 250

  while (true) {
    const rows = await fetchSkuBatch(offset, batchSize)
    if (rows.length === 0) break

    const docs = rows.map(buildSkuDocument)
    await typesense
      .collections(SKU_COLLECTION)
      .documents()
      .import(docs, { action: 'upsert' })

    console.log(`[CatalogueSync] Synced batch offset=${offset} count=${rows.length}`)
    offset += batchSize

    if (rows.length < batchSize) break
  }

  console.log('[CatalogueSync] Full sync complete.')
}

// Joins SKU with brand, pattern and price snapshot for Typesense document
async function fetchSkuForTypesense(product_id: string) {
  const { data, error } = await supabase
    .from('skus')
    .select(`
      product_id,
      sku,
      product_slug,
      width,
      profile,
      rim_size,
      tyre_size_display,
      normalized_size_code,
      season_type,
      application_type:patterns!inner(application_type),
      performance_category:patterns!inner(performance_category),
      runflat,
      xl_reinforced,
      country_of_origin,
      brand_id,
      brand:brands!inner(brand_name, brand_slug),
      pattern_id,
      pattern:patterns!inner(pattern_name, main_image),
      total_available_stock,
      status
    `)
    .eq('product_id', product_id)
    .eq('status', 'active')
    .single()

  if (error || !data) return null
  return flattenSkuRow(data)
}

async function fetchSkuBatch(offset: number, limit: number) {
  const { data, error } = await supabase
    .from('skus')
    .select(`
      product_id,
      sku,
      product_slug,
      width,
      profile,
      rim_size,
      tyre_size_display,
      normalized_size_code,
      runflat,
      xl_reinforced,
      country_of_origin,
      brand_id,
      pattern_id,
      total_available_stock,
      status,
      brands!inner(brand_name, brand_slug),
      patterns!inner(pattern_name, main_image, application_type, performance_category, season_type)
    `)
    .eq('status', 'active')
    .range(offset, offset + limit - 1)

  if (error || !data) return []
  return data.map(flattenSkuRow)
}

function flattenSkuRow(row: Record<string, unknown>) {
  const brand = (row.brands ?? row.brand) as Record<string, unknown>
  const pattern = (row.patterns ?? row.pattern) as Record<string, unknown>

  return {
    product_id: row.product_id as string,
    sku: row.sku as string,
    product_slug: (row.product_slug as string | null) ?? null,
    width: (row.width as number | null) ?? null,
    profile: (row.profile as number | null) ?? null,
    rim_size: row.rim_size as number,
    tyre_size_display: row.tyre_size_display as string,
    normalized_size_code: row.normalized_size_code as string,
    season_type: (pattern?.season_type as string | null) ?? null,
    application_type: pattern?.application_type as string,
    performance_category: (pattern?.performance_category as string | null) ?? null,
    runflat: row.runflat as boolean,
    xl_reinforced: row.xl_reinforced as boolean,
    country_of_origin: row.country_of_origin as string,
    brand_id: row.brand_id as string,
    brand_name: brand?.brand_name as string,
    brand_slug: brand?.brand_slug as string,
    pattern_id: row.pattern_id as string,
    pattern_name: pattern?.pattern_name as string,
    total_available_stock: row.total_available_stock as number,
    effective_price_retail: null, // populated by price sync job in Stage 6
    main_image: (pattern?.main_image as string | null) ?? null,
    status: row.status as string,
  }
}
