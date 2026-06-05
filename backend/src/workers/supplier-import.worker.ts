import { Worker, type Job } from 'bullmq'
import { supabase } from '../services/supabase.service'
import { redis, TTL } from '../services/redis.service'
import { normalizeTyreSize } from '../utils/size-normalizer'
import { getSetting } from '../services/admin.settings.service'

const connection = {
  url: process.env.UPSTASH_REDIS_URL!,
  maxRetriesPerRequest: null as null,
  enableReadyCheck: false,
}

export type SupplierImportJobData = {
  supplier_id: string
  rows: SupplierRow[]
  import_session_id: string
}

type SupplierRow = {
  supplier_sku?: string
  supplier_product_name?: string
  supplier_brand_name?: string
  supplier_pattern_name?: string
  supplier_size_raw?: string
  load_index?: string
  speed_rating?: string
  ply_rating?: string
  supplier_price?: number
  supplier_stock?: number
  lead_time_days?: number
}

// ============================================================
// Mapping parameter defaults (overridden at runtime from system_settings)
// ============================================================
import { DEFAULT_MAPPING_PARAMS, type MappingParams } from '../services/admin.suppliers.service'

// ============================================================
// Worker — concurrency: 1 (never run two imports simultaneously)
// ============================================================
export const supplierImportWorker = new Worker<SupplierImportJobData>(
  'supplier-import',
  async (job: Job<SupplierImportJobData>) => {
    const { supplier_id, rows, import_session_id } = job.data
    console.log(`[SupplierImport] Processing ${rows.length} rows for supplier ${supplier_id}`)

    // Load brand normalization map from Redis (or DB if cache miss)
    const brandMap   = await getBrandMap()
    const patternMap = await getPatternMap()

    // Read toggle + configurable weights — both cached in Redis 60s
    const [autoMappingEnabled, params] = await Promise.all([
      getAutoMappingEnabled(),
      getMappingParams(),
    ])

    const results = { auto_mapped: 0, review_queue: 0, rejected: 0 }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      await job.updateProgress(Math.round((i / rows.length) * 100))

      try {
        const score = await scoreRow(row, brandMap, patternMap, params)

        const shouldAutoApprove = autoMappingEnabled && score.confidence >= params.auto_threshold
        const isAboveReview     = score.confidence >= params.review_threshold

        if (!isAboveReview) {
          results.rejected++
          // Save rejected rows so admin can see what the supplier sent but couldn't be matched
          await supabase.from('supplier_product_map').upsert({
            supplier_id,
            product_id:             null,
            supplier_sku:           row.supplier_sku,
            supplier_brand_name:    row.supplier_brand_name,
            supplier_pattern_name:  row.supplier_pattern_name,
            supplier_size_raw:      row.supplier_size_raw,
            normalized_size_code:   score.normalized_size,
            load_index:             row.load_index,
            speed_rating:           row.speed_rating,
            ply_rating:             row.ply_rating,
            supplier_price:         row.supplier_price,
            supplier_stock:         row.supplier_stock ?? 0,
            lead_time_days:         row.lead_time_days,
            is_verified:            false,
            match_confidence:       score.confidence,
            last_updated:           new Date().toISOString(),
          }, { onConflict: 'supplier_id,supplier_sku' })
          continue
        }

        await supabase.from('supplier_product_map').upsert({
          supplier_id,
          product_id:             score.product_id,
          supplier_sku:           row.supplier_sku,
          supplier_brand_name:    row.supplier_brand_name,
          supplier_pattern_name:  row.supplier_pattern_name,
          supplier_size_raw:      row.supplier_size_raw,
          normalized_size_code:   score.normalized_size,
          load_index:             row.load_index,
          speed_rating:           row.speed_rating,
          ply_rating:             row.ply_rating,
          supplier_price:         row.supplier_price,
          supplier_stock:         row.supplier_stock ?? 0,
          lead_time_days:         row.lead_time_days,
          is_verified:            shouldAutoApprove,
          match_confidence:       score.confidence,
          last_updated:           new Date().toISOString(),
        }, { onConflict: 'supplier_id,supplier_sku' })

        if (shouldAutoApprove) {
          results.auto_mapped++
        } else {
          results.review_queue++
        }
      } catch (err) {
        console.error(`[SupplierImport] Row ${i} failed:`, err)
      }
    }

    console.log(`[SupplierImport] Done — session ${import_session_id}:`, results)
    return results
  },
  { connection, concurrency: 1 }
)

supplierImportWorker.on('failed', (job, err) => {
  console.error(`[SupplierImport] Job ${job?.id} failed:`, err.message)
})

// ============================================================
// Scoring engine
// ============================================================
async function scoreRow(
  row: SupplierRow,
  brandMap: BrandMapEntry[],
  patternMap: PatternMapEntry[],
  params: MappingParams
): Promise<{ confidence: number; product_id: string | null; normalized_size: string }> {
  const normalizedSize = row.supplier_size_raw
    ? normalizeTyreSize(row.supplier_size_raw)
    : ''

  // Size match: find SKUs with this normalized_size_code
  const { data: sizeMatches } = await supabase
    .from('skus')
    .select('product_id, brand_id, pattern_id, load_index, speed_rating')
    .eq('normalized_size_code', normalizedSize)
    .eq('status', 'active')
    .limit(50)

  if (!sizeMatches || sizeMatches.length === 0) {
    return { confidence: 0, product_id: null, normalized_size: normalizedSize }
  }

  // Brand similarity (trigram scoring in memory from pre-loaded map)
  const brandSimilarity = row.supplier_brand_name
    ? bestSimilarity(row.supplier_brand_name, brandMap.map(b => b.name))
    : 0

  const matchedBrand = brandSimilarity > 0.4
    ? brandMap.find(b => similarity(row.supplier_brand_name!, b.name) === brandSimilarity)
    : null

  // Pattern similarity
  const patternSimilarity = row.supplier_pattern_name
    ? bestSimilarity(row.supplier_pattern_name, patternMap
        .filter(p => !matchedBrand || p.brand_id === matchedBrand.id)
        .map(p => p.name))
    : 0

  const matchedPattern = patternSimilarity > 0.4
    ? patternMap.find(p => similarity(row.supplier_pattern_name!, p.name) === patternSimilarity)
    : null

  // Narrow size matches by brand/pattern
  const candidates = sizeMatches.filter(s => {
    const brandOk = !matchedBrand || s.brand_id === matchedBrand.id
    const patternOk = !matchedPattern || s.pattern_id === matchedPattern.id
    return brandOk && patternOk
  })

  const best = candidates[0] ?? sizeMatches[0]

  // Load/speed match
  const loadSpeedMatch =
    row.load_index && row.speed_rating &&
    best.load_index === row.load_index && best.speed_rating === row.speed_rating

  const confidence =
    params.size +
    Math.round(brandSimilarity * params.brand) +
    Math.round(patternSimilarity * params.pattern) +
    (loadSpeedMatch ? params.load_speed : 0)

  return {
    confidence: Math.min(confidence, 100),
    product_id: best.product_id,
    normalized_size: normalizedSize,
  }
}

// ============================================================
// In-memory trigram similarity (simplified Jaccard on trigrams)
// ============================================================
function trigrams(s: string): Set<string> {
  const str = s.toLowerCase().replace(/\s+/g, '')
  const out = new Set<string>()
  for (let i = 0; i < str.length - 2; i++) out.add(str.slice(i, i + 3))
  return out
}

function similarity(a: string, b: string): number {
  const ta = trigrams(a)
  const tb = trigrams(b)
  let intersection = 0
  ta.forEach(t => { if (tb.has(t)) intersection++ })
  const union = ta.size + tb.size - intersection
  return union === 0 ? 0 : intersection / union
}

function bestSimilarity(query: string, candidates: string[]): number {
  return candidates.reduce((best, c) => Math.max(best, similarity(query, c)), 0)
}

// ============================================================
// Brand/pattern map cache (pre-loaded into memory from Redis)
// ============================================================
type BrandMapEntry   = { id: string; name: string }
type PatternMapEntry = { id: string; name: string; brand_id: string }

async function getBrandMap(): Promise<BrandMapEntry[]> {
  const cached = await redis?.get<BrandMapEntry[]>('supplier_brand_map')
  if (cached) return cached

  const { data } = await supabase.from('brands').select('brand_id, brand_name').eq('is_active', true)
  const map = (data ?? []).map(b => ({ id: b.brand_id, name: b.brand_name }))
  await redis?.set('supplier_brand_map', map, { ex: TTL.SUPPLIER_MAP })
  return map
}

async function getPatternMap(): Promise<PatternMapEntry[]> {
  const cached = await redis?.get<PatternMapEntry[]>('supplier_pattern_map')
  if (cached) return cached

  const { data } = await supabase.from('patterns').select('pattern_id, pattern_name, brand_id').eq('is_active', true)
  const map = (data ?? []).map(p => ({ id: p.pattern_id, name: p.pattern_name, brand_id: p.brand_id }))
  await redis?.set('supplier_pattern_map', map, { ex: TTL.SUPPLIER_MAP })
  return map
}

async function getAutoMappingEnabled(): Promise<boolean> {
  const CACHE_KEY = 'setting:auto_mapping_enabled'
  const cached = await redis?.get<boolean>(CACHE_KEY)
  if (cached !== null && cached !== undefined) return cached

  try {
    const row = await getSetting('auto_mapping_enabled')
    const value = row?.value ?? true
    await redis?.set(CACHE_KEY, value, { ex: 60 })
    return Boolean(value)
  } catch {
    return true
  }
}

async function getMappingParams(): Promise<MappingParams> {
  const CACHE_KEY = 'setting:mapping_parameters'
  const cached = await redis?.get<MappingParams>(CACHE_KEY)
  if (cached) return cached

  try {
    const row = await getSetting('mapping_parameters')
    const params = (row?.value ?? DEFAULT_MAPPING_PARAMS) as MappingParams
    await redis?.set(CACHE_KEY, params, { ex: 60 })
    return params
  } catch {
    return DEFAULT_MAPPING_PARAMS
  }
}
