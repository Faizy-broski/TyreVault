/**
 * Onyx Tyres — Catalogue Seeder
 *
 * Seeds brands, patterns and SKUs from two reference CSV datasets.
 * Safe to re-run: all upserts use ON CONFLICT DO NOTHING on the natural key.
 *
 * Usage:
 *   cd backend
 *   npx ts-node src/scripts/seed-catalogue.ts \
 *     --brands-csv "C:\path\to\csv.csv" \
 *     --skus-csv   "C:\path\to\csv_full.csv"
 *
 * Required env vars (loaded from .env automatically):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * CSV format: semicolon-delimited, UTF-8, first row = headers.
 *
 * What gets seeded:
 *   csv.csv      (8 k rows)  → brands + patterns
 *   csv_full.csv (216 k rows) → skus  (no prices / no stock — those come from supplier feeds)
 */

import 'dotenv/config'
import * as fs from 'fs'
import Papa from 'papaparse'
import { supabase } from '../services/supabase.service'

// ─── Config ───────────────────────────────────────────────────────────────────

const BATCH_SIZE = 500       // rows per Supabase upsert call
const LOG_EVERY  = 20        // log progress every N batches

// ─── CLI ──────────────────────────────────────────────────────────────────────

function arg(name: string): string {
  const i = process.argv.indexOf(`--${name}`)
  if (i === -1 || !process.argv[i + 1]) {
    console.error(`\nMissing required argument: --${name}\n`)
    console.error(`Usage:\n  npx ts-node src/scripts/seed-catalogue.ts \\`)
    console.error(`    --brands-csv "path/to/csv.csv" \\`)
    console.error(`    --skus-csv   "path/to/csv_full.csv" \\`)
    console.error(`    [--limit 20]\n`)
    process.exit(1)
  }
  return process.argv[i + 1]!
}

function optArg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`)
  return (i !== -1 && process.argv[i + 1]) ? process.argv[i + 1]! : fallback
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toSlug(s: string): string {
  return (s ?? '').trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function mapCarType(t: string): 'PCR' | '4x4' | 'TBR' {
  switch ((t ?? '').toLowerCase().trim()) {
    case 'truck': case 'tbr': case 'commercial': case 'van': case 'bus': return 'TBR'
    case 'suv':   case '4x4': case '4wd': case 'offroad': case 'lt':    return '4x4'
    default: return 'PCR'
  }
}

function mapSeason(s: string): 'summer' | 'winter' | 'all_season' | null {
  const lc = (s ?? '').toLowerCase().trim()
  if (lc === 'summer') return 'summer'
  if (lc === 'winter') return 'winter'
  if (lc.includes('all') || lc === 'four' || lc === '4season') return 'all_season'
  return null
}

function parseCsv<T extends Record<string, string>>(filePath: string): T[] {
  const content = fs.readFileSync(filePath, 'utf8')
  const result  = Papa.parse<T>(content, {
    header:        true,
    delimiter:     ';',
    skipEmptyLines: true,
    dynamicTyping: false,
  })
  if (result.errors.some(e => e.type === 'Delimiter')) {
    throw new Error(`CSV parse failed on ${filePath}: ${result.errors[0]?.message}`)
  }
  return result.data
}

function chunks<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

// ─── CSV row types ────────────────────────────────────────────────────────────

interface BrandsCsvRow {
  vendor_id:      string
  model_id:       string
  vendor_name:    string
  model_name:     string
  year:           string
  season:         string
  car_type:       string
  vendor_url:     string
  model_url:      string
  photo:          string
  description_en: string
  [key: string]: string
}

interface SkusCsvRow {
  vendor_id:       string
  model_id:        string
  ean:             string
  vendor_name:     string
  model_name:      string
  model_year:      string
  season:          string
  car_type:        string
  eu_label_fuel:   string
  eu_label_wet:    string
  eu_label_noise:  string
  width:           string
  profile:         string
  diameter:        string
  load_index:      string
  speed_index:     string
  rof_flag:        string   // run-flat: 'on' | 'off'
  xl_flag:         string   // XL reinforced
  c_flag:          string   // commercial
  vendor_url:      string
  model_url:       string
  photo_name:      string
  [key: string]: string
}

// ─── Phase 1: Brands ──────────────────────────────────────────────────────────

async function seedBrands(rows: BrandsCsvRow[]): Promise<Map<string, string>> {
  // Deduplicate by vendor_name — first occurrence wins
  const deduped = new Map<string, { brand_name: string; brand_slug: string; main_image: string | null }>()

  for (const row of rows) {
    const name = row.vendor_name?.trim()
    if (!name || deduped.has(name)) continue
    const slug = row.vendor_url?.trim() ? toSlug(row.vendor_url) : toSlug(name)
    deduped.set(name, { brand_name: name, brand_slug: slug, main_image: null })
  }

  const toInsert = [...deduped.values()]
  console.log(`  ${toInsert.length} distinct brands found`)

  let ok = 0
  for (const batch of chunks(toInsert, BATCH_SIZE)) {
    const { error } = await supabase.from('brands').upsert(batch, {
      onConflict:      'brand_slug',
      ignoreDuplicates: true,
    })
    if (error) console.warn(`  [brands] batch error: ${error.message}`)
    else ok += batch.length
  }
  console.log(`  ${ok} brand rows upserted`)

  // Reload from DB to get authoritative IDs (handles rows that already existed)
  const { data, error } = await supabase.from('brands').select('brand_id, brand_name, brand_slug')
  if (error) throw new Error(`Cannot load brands: ${error.message}`)

  const brandMap = new Map<string, string>() // brand_name → brand_id
  for (const b of (data ?? [])) brandMap.set(b.brand_name as string, b.brand_id as string)
  return brandMap
}

// ─── Phase 2: Patterns ────────────────────────────────────────────────────────

interface PatternInsert {
  brand_id:                  string
  pattern_name:              string
  pattern_slug:              string
  pattern_short_description: string | null
  main_image:                string | null
  application_type:          'PCR' | '4x4' | 'TBR'
  season_type:               'summer' | 'winter' | 'all_season' | null
  is_active:                 boolean
  show_on_website:           boolean
}

async function seedPatterns(
  rows:     BrandsCsvRow[],
  brandMap: Map<string, string>,
  limit:    number,
): Promise<Map<string, string>> {
  const deduped = new Map<string, PatternInsert>()

  for (const row of rows) {
    const brandId     = brandMap.get(row.vendor_name?.trim())
    const patternName = row.model_name?.trim()
    if (!brandId || !patternName) continue

    const slug = row.model_url?.trim() ? toSlug(row.model_url) : toSlug(patternName)
    const key  = `${brandId}:${slug}`
    if (deduped.has(key)) continue

    deduped.set(key, {
      brand_id:                  brandId,
      pattern_name:              patternName,
      pattern_slug:              slug,
      pattern_short_description: row.description_en?.trim() || null,
      main_image:                row.photo?.trim() || null,
      application_type:          mapCarType(row.car_type),
      season_type:               mapSeason(row.season),
      is_active:                 true,
      show_on_website:           true,
    })
  }

  const all      = [...deduped.values()]
  const toInsert = limit ? all.slice(0, limit) : all
  console.log(`  ${toInsert.length} distinct patterns found`)

  let ok = 0
  for (const batch of chunks(toInsert, BATCH_SIZE)) {
    const { error } = await supabase.from('patterns').upsert(batch, {
      onConflict:      'brand_id,pattern_slug',
      ignoreDuplicates: true,
    })
    if (error) console.warn(`  [patterns] batch error: ${error.message}`)
    else ok += batch.length
  }
  console.log(`  ${ok} pattern rows upserted`)

  // Reload from DB
  const { data, error } = await supabase
    .from('patterns')
    .select('pattern_id, brand_id, pattern_slug')
  if (error) throw new Error(`Cannot load patterns: ${error.message}`)

  const patternMap = new Map<string, string>() // `brandId:patternSlug` → pattern_id
  for (const p of (data ?? [])) {
    patternMap.set(`${p.brand_id as string}:${p.pattern_slug as string}`, p.pattern_id as string)
  }
  return patternMap
}

// ─── Phase 3: SKUs ────────────────────────────────────────────────────────────

async function seedSkus(
  csvPath:    string,
  brandMap:   Map<string, string>,
  patternMap: Map<string, string>,
  limit:      number,
): Promise<void> {
  console.log('  Parsing csv_full.csv...')
  const allRows = parseCsv<SkusCsvRow>(csvPath)
  const rows    = limit ? allRows.slice(0, limit) : allRows
  console.log(`  ${allRows.length.toLocaleString()} rows parsed${limit ? `, using first ${rows.length}` : ''}`)

  let inserted = 0, skipped = 0, errors = 0
  const batches = chunks(rows, BATCH_SIZE)

  for (let bi = 0; bi < batches.length; bi++) {
    const toInsert: Record<string, unknown>[] = []

    for (const row of batches[bi]!) {
      const brandName  = row.vendor_name?.trim()
      const modelName  = row.model_name?.trim()
      if (!brandName || !modelName) { skipped++; continue }

      const brandId = brandMap.get(brandName)
      if (!brandId) { skipped++; continue }

      const patternSlug = row.model_url?.trim() ? toSlug(row.model_url) : toSlug(modelName)
      const patternId   = patternMap.get(`${brandId}:${patternSlug}`)
      if (!patternId) { skipped++; continue }

      const w = parseFloat(row.width)
      const d = parseFloat(row.diameter)
      if (!w || !d) { skipped++; continue }

      const p  = parseFloat(row.profile) || null   // profile 0 → null (e.g. 155R13)
      const li = row.load_index?.trim()  || null
      const sr = row.speed_index?.trim() || null

      // Tyre size display: "205/55R16 91Y" or "155R13 91N"
      const sizePart    = p ? `${w}/${p}R${d}` : `${w}R${d}`
      const sizeDisplay = li && sr ? `${sizePart} ${li}${sr}` : sizePart

      // SKU: EAN when available; otherwise synthesised (stable across re-runs)
      const rawEan = row.ean?.trim()
      const sku    = rawEan && rawEan !== '0'
        ? rawEan
        : `${toSlug(brandName)}-${toSlug(modelName)}-${w}-${p ?? 0}-r${d}-${li ?? 'xx'}${sr ?? 'xx'}`

      // product_slug: human-readable, unique per tyre variant
      // Includes load+speed so 225/45R18 91Y ≠ 225/45R18 95W
      const productSlug = [
        toSlug(brandName),
        toSlug(modelName),
        `${w}-${p ?? 0}r${d}`,
        ((li ?? '') + (sr ?? '')).toLowerCase() || 'xx',
      ].join('-').replace(/[^a-z0-9-]/g, '')

      toInsert.push({
        brand_id:             brandId,
        pattern_id:           patternId,
        sku,
        tyre_size_display:    sizeDisplay,
        normalized_size_code: sizePart,
        width:                w,
        profile:              p,
        rim_size:             d,
        load_index:           li,
        speed_rating:         sr,
        runflat:              row.rof_flag === 'on',
        xl_reinforced:        row.xl_flag  === 'on',
        fuel_rating:          row.eu_label_fuel?.trim()  || null,
        wet_grip:             row.eu_label_wet?.trim()   || null,
        noise_db:             row.eu_label_noise?.trim() || null,
        country_of_origin:    'Unknown',
        status:               'active',
        total_available_stock: 0,
        product_slug:         productSlug,
      })
    }

    if (toInsert.length === 0) { skipped += batches[bi]!.length; continue }

    // Primary attempt: bulk upsert
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('skus')
      .upsert(toInsert, { onConflict: 'sku', ignoreDuplicates: true })

    if (error) {
      // Fall back to row-by-row so one bad row doesn't drop the whole batch
      for (const row of toInsert) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: rowErr } = await (supabase as any).from('skus')
          .upsert([row], { onConflict: 'sku', ignoreDuplicates: true })
        if (rowErr) errors++
        else inserted++
      }
    } else {
      inserted += toInsert.length
    }

    if ((bi + 1) % LOG_EVERY === 0 || bi === batches.length - 1) {
      const pct = Math.round(((bi + 1) / batches.length) * 100)
      process.stdout.write(
        `\r  [${String(pct).padStart(3)}%] batch ${bi + 1}/${batches.length} — ` +
        `${inserted.toLocaleString()} inserted, ${skipped} skipped, ${errors} errors   `
      )
    }
  }

  process.stdout.write('\n')
  console.log(`  Done — ${inserted.toLocaleString()} inserted | ${skipped} skipped | ${errors} errors`)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const brandsCsvPath = arg('brands-csv')
  const skusCsvPath   = arg('skus-csv')
  const limit         = parseInt(optArg('limit', '0'), 10) || 0  // 0 = no limit

  for (const p of [brandsCsvPath, skusCsvPath]) {
    if (!fs.existsSync(p)) {
      console.error(`File not found: ${p}`)
      process.exit(1)
    }
  }

  // Validate Supabase connection
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment')
    process.exit(1)
  }
  const { error: pingErr } = await supabase.from('brands').select('brand_id').limit(1)
  if (pingErr) {
    console.error(`Cannot connect to Supabase: ${pingErr.message}`)
    process.exit(1)
  }

  console.log('\n╔══════════════════════════════════════════╗')
  console.log('║   Onyx Tyres — Catalogue Seeder          ║')
  console.log('╚══════════════════════════════════════════╝\n')
  console.log(`brands CSV : ${brandsCsvPath}`)
  console.log(`skus CSV   : ${skusCsvPath}`)
  if (limit) console.log(`limit      : ${limit} patterns / ${limit} SKUs (test mode)`)
  console.log()

  console.time('Total elapsed')

  // ── Phase 1: Brands ─────────────────────────────────────────────────────────
  console.log('── Phase 1: Brands ──')
  const brandRows = parseCsv<BrandsCsvRow>(brandsCsvPath)
  console.log(`  ${brandRows.length.toLocaleString()} rows in brands CSV`)
  const brandMap = await seedBrands(brandRows)

  // ── Phase 2: Patterns ────────────────────────────────────────────────────────
  console.log('\n── Phase 2: Patterns ──')
  const patternMap = await seedPatterns(brandRows, brandMap, limit)

  // ── Phase 3: SKUs ────────────────────────────────────────────────────────────
  console.log('\n── Phase 3: SKUs ──')
  await seedSkus(skusCsvPath, brandMap, patternMap, limit)

  console.log('\n── Complete ──')
  console.timeEnd('Total elapsed')
  console.log()
}

main().catch(err => {
  console.error('\nFatal error:', err instanceof Error ? err.message : err)
  process.exit(1)
})
