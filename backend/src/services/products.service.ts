import { supabase } from './supabase.service'
import { redis, TTL } from './redis.service'
import { catalogueSyncQueue } from '../queues'
import { normalizeTyreSize } from '../utils/size-normalizer'

// ============================================================
// Types
// ============================================================
export type CreateProductPayload = {
  // Basic Info
  brandId: string
  patternName: string
  patternSlug: string
  shortDescription?: string
  galleryImages?: string[]
  tyreOverview?: string
  features?: string
  warrantyInformation?: string
  tyreSpecSheet?: string
  faqList?: { question: string; answer: string }[]

  // Categories
  discountable: boolean
  applicationType: 'PCR' | '4x4' | 'TBR'
  categoryIds?: string[]
  performanceCategory?: string
  seasonType?: string
  collectionId?: string
  tags?: string[]

  // Variants
  variants: VariantPayload[]

  // Pricing (parallel array to variants, same index)
  pricing: PricingPayload[]
}

export type VariantPayload = {
  sku: string
  tyreSizeDisplay: string
  width?: number
  profile?: number
  rimSize: number
  constructionType?: string
  loadIndex?: string
  speedRating?: string
  fuelRating?: string
  wetGrip?: string
  noiseDb?: string
  noiseClass?: string
  runflat: boolean
  xlReinforced?: boolean
  plyRating?: string
  loadRange?: string
  countryOfOrigin?: string
  variantImages?: string[]
}

export type PricingPayload = {
  priceIncGst: number
  compareAtPrice?: number
  costPrice?: number
  inventory?: number
  lowStockAlert?: number
  warehouseId?: string
}

export type ProductListFilters = {
  search?: string
  brandId?: string
  status?: string
  page?: number
  limit?: number
  sortBy?: 'updated_at' | 'created_at'
}

// ============================================================
// LIST
// ============================================================
export async function listProducts(filters: ProductListFilters) {
  const {
    search, brandId, status = 'active',
    page = 1, limit = 20, sortBy = 'updated_at',
  } = filters

  // Fetch at pattern level — each pattern = one "product" in admin
  let query = supabase
    .from('patterns')
    .select(`
      pattern_id,
      pattern_name,
      pattern_slug,
      is_active,
      show_on_website,
      on_sale,
      collection_id,
      updated_at,
      created_at,
      brands!inner ( brand_id, brand_name, brand_slug ),
      collections ( collection_name ),
      skus ( product_id, status )
    `, { count: 'exact' })
    .order(sortBy, { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (search) {
    query = query.ilike('pattern_name', `%${search}%`)
  }
  if (brandId) {
    query = query.eq('brand_id', brandId)
  }

  const { data, error, count } = await query
  if (error) throw error

  return {
    data: (data ?? []).map(row => ({
      id: row.pattern_id,
      name: row.pattern_name,
      slug: row.pattern_slug,
      brand: (row.brands as unknown as { brand_name: string; brand_slug: string } | null),
      collection: (row.collections as unknown as { collection_name: string } | null),
      variantCount: Array.isArray(row.skus) ? row.skus.length : 0,
      activeVariantCount: Array.isArray(row.skus)
        ? (row.skus as { status: string }[]).filter(s => s.status === 'active').length
        : 0,
      isActive: row.is_active,
      showOnWebsite: row.show_on_website,
      updatedAt: row.updated_at,
      createdAt: row.created_at,
    })),
    total: count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((count ?? 0) / limit),
  }
}

// ============================================================
// GET SINGLE PRODUCT (pattern + all SKUs + prices + stock)
// ============================================================
export async function getProduct(patternId: string) {
  const { data: pattern, error } = await supabase
    .from('patterns')
    .select(`
      *,
      brands!inner ( brand_id, brand_name, brand_slug, brand_logo ),
      collections ( collection_id, collection_name ),
      pattern_categories ( categories ( category_id, category_name, category_type ) )
    `)
    .eq('pattern_id', patternId)
    .single()

  if (error) throw error

  // Fetch SKUs with prices and stock
  const { data: skus } = await supabase
    .from('skus')
    .select(`
      *,
      product_prices ( price_id, price_type, price_inc_gst, price_ex_gst, is_active, customer_group_id ),
      product_stock ( stock_id, warehouse_id, available_stock, reserved_stock, minimum_stock_level, warehouses ( warehouse_name ) )
    `)
    .eq('pattern_id', patternId)
    .order('rim_size', { ascending: true })

  return { pattern, skus: skus ?? [] }
}

// ============================================================
// CREATE PRODUCT
// Creates pattern + N SKUs + prices + initial stock rows
// ============================================================
export async function createProduct(payload: CreateProductPayload) {
  // 1. Create pattern
  const { data: pattern, error: patternErr } = await supabase
    .from('patterns')
    .insert({
      brand_id: payload.brandId,
      pattern_name: payload.patternName,
      pattern_slug: payload.patternSlug,
      pattern_short_description: payload.shortDescription,
      gallery_images: payload.galleryImages ?? [],
      tyre_overview: payload.tyreOverview,
      features: payload.features,
      warranty_information: payload.warrantyInformation,
      tyre_spec_sheet: payload.tyreSpecSheet,
      faq_list: payload.faqList ?? [],
      discountable: payload.discountable,
      application_type: payload.applicationType,
      performance_category: payload.performanceCategory ?? null,
      season_type: payload.seasonType ?? null,
      collection_id: payload.collectionId ?? null,
      tags: payload.tags ?? [],
      is_active: true,
      show_on_website: false, // not public until published
    })
    .select('pattern_id')
    .single()

  if (patternErr) throw patternErr

  const patternId = pattern.pattern_id

  // 2. Assign categories (pattern_categories junction)
  if (payload.categoryIds && payload.categoryIds.length > 0) {
    await supabase.from('pattern_categories').insert(
      payload.categoryIds.map(cid => ({ pattern_id: patternId, category_id: cid }))
    )
  }

  // 3. Create SKUs + prices in parallel batches
  const createdSkus: string[] = []

  for (let i = 0; i < payload.variants.length; i++) {
    const v = payload.variants[i]
    const p = payload.pricing[i] ?? {}

    const normalizedSize = normalizeTyreSize(v.tyreSizeDisplay)

    const { data: sku, error: skuErr } = await supabase
      .from('skus')
      .insert({
        brand_id: payload.brandId,
        pattern_id: patternId,
        sku: v.sku,
        tyre_size_display: v.tyreSizeDisplay,
        normalized_size_code: normalizedSize,
        width: v.width ?? null,
        profile: v.profile ?? null,
        rim_size: v.rimSize,
        construction_type: v.constructionType ?? null,
        load_index: v.loadIndex ?? null,
        speed_rating: v.speedRating ?? null,
        fuel_rating: v.fuelRating ?? null,
        wet_grip: v.wetGrip ?? null,
        noise_db: v.noiseDb ?? null,
        noise_class: v.noiseClass ?? null,
        runflat: v.runflat,
        xl_reinforced: v.xlReinforced ?? false,
        ply_rating: v.plyRating ?? null,
        load_range: v.loadRange ?? null,
        country_of_origin: v.countryOfOrigin ?? 'Unknown',
        variant_images: v.variantImages ?? [],
        compare_at_price: p.compareAtPrice ?? null,
        cost_price: p.costPrice ?? null,
        low_stock_alert: p.lowStockAlert ?? 10,
        status: 'active',
        total_available_stock: 0,
      })
      .select('product_id')
      .single()

    if (skuErr) throw skuErr
    createdSkus.push(sku.product_id)

    // 4a. Create retail price record
    if (p.priceIncGst) {
      const gstRate = 0.1
      await supabase.from('product_prices').insert({
        product_id: sku.product_id,
        price_type: 'retail',
        price_inc_gst: p.priceIncGst,
        price_ex_gst: parseFloat((p.priceIncGst / (1 + gstRate)).toFixed(2)),
        is_active: true,
      })
    }

    // 4b. Create initial stock row (if warehouse provided)
    if (p.warehouseId && (p.inventory ?? 0) > 0) {
      await supabase.from('product_stock').insert({
        product_id: sku.product_id,
        warehouse_id: p.warehouseId,
        available_stock: p.inventory ?? 0,
        reserved_stock: 0,
        minimum_stock_level: p.lowStockAlert ?? 10,
      })
    }
  }

  // 5. Enqueue Typesense sync for all created SKUs
  await catalogueSyncQueue?.add('bulk_sync', {
    type: 'bulk_sync',
    product_ids: createdSkus,
  })

  return { patternId, skuIds: createdSkus }
}

// ============================================================
// UPDATE PRODUCT (pattern fields only)
// ============================================================
export async function updateProduct(patternId: string, payload: Partial<CreateProductPayload>) {
  const updates: Record<string, unknown> = {}

  if (payload.patternName !== undefined) updates.pattern_name = payload.patternName
  if (payload.patternSlug !== undefined) updates.pattern_slug = payload.patternSlug
  if (payload.shortDescription !== undefined) updates.pattern_short_description = payload.shortDescription
  if (payload.galleryImages !== undefined) updates.gallery_images = payload.galleryImages
  if (payload.tyreOverview !== undefined) updates.tyre_overview = payload.tyreOverview
  if (payload.features !== undefined) updates.features = payload.features
  if (payload.warrantyInformation !== undefined) updates.warranty_information = payload.warrantyInformation
  if (payload.tyreSpecSheet !== undefined) updates.tyre_spec_sheet = payload.tyreSpecSheet
  if (payload.faqList !== undefined) updates.faq_list = payload.faqList
  if (payload.discountable !== undefined) updates.discountable = payload.discountable
  if (payload.applicationType !== undefined) updates.application_type = payload.applicationType
  if (payload.performanceCategory !== undefined) updates.performance_category = payload.performanceCategory
  if (payload.seasonType !== undefined) updates.season_type = payload.seasonType
  if (payload.collectionId !== undefined) updates.collection_id = payload.collectionId
  if (payload.tags !== undefined) updates.tags = payload.tags

  const { error } = await supabase.from('patterns').update(updates).eq('pattern_id', patternId)
  if (error) throw error

  // Update categories if provided
  if (payload.categoryIds !== undefined) {
    await supabase.from('pattern_categories').delete().eq('pattern_id', patternId)
    if (payload.categoryIds.length > 0) {
      await supabase.from('pattern_categories').insert(
        payload.categoryIds.map(cid => ({ pattern_id: patternId, category_id: cid }))
      )
    }
  }

  // Sync all SKUs of this pattern to Typesense
  const { data: skus } = await supabase
    .from('skus').select('product_id').eq('pattern_id', patternId)
  if (skus && skus.length > 0) {
    await catalogueSyncQueue?.add('bulk_sync', {
      type: 'bulk_sync',
      product_ids: skus.map(s => s.product_id),
    })
  }
}

// ============================================================
// PUBLISH / UNPUBLISH
// ============================================================
export async function publishProduct(patternId: string, publish: boolean) {
  await supabase.from('patterns').update({ show_on_website: publish }).eq('pattern_id', patternId)

  // Active all/none SKUs accordingly
  await supabase.from('skus')
    .update({ status: publish ? 'active' : 'inactive' })
    .eq('pattern_id', patternId)

  const { data: skus } = await supabase.from('skus').select('product_id').eq('pattern_id', patternId)
  if (skus && skus.length > 0) {
    await catalogueSyncQueue?.add('bulk_sync', {
      type: 'bulk_sync',
      product_ids: skus.map(s => s.product_id),
    })
  }
}

// ============================================================
// VARIANT — add single SKU to existing pattern
// ============================================================
export async function addVariant(patternId: string, variant: VariantPayload, pricing: PricingPayload) {
  const { data: pattern } = await supabase
    .from('patterns').select('brand_id').eq('pattern_id', patternId).single()
  if (!pattern) throw new Error('Pattern not found')

  const normalizedSize = normalizeTyreSize(variant.tyreSizeDisplay)

  const { data: sku, error } = await supabase.from('skus').insert({
    brand_id: pattern.brand_id,
    pattern_id: patternId,
    sku: variant.sku,
    tyre_size_display: variant.tyreSizeDisplay,
    normalized_size_code: normalizedSize,
    width: variant.width ?? null,
    profile: variant.profile ?? null,
    rim_size: variant.rimSize,
    load_index: variant.loadIndex ?? null,
    speed_rating: variant.speedRating ?? null,
    fuel_rating: variant.fuelRating ?? null,
    wet_grip: variant.wetGrip ?? null,
    noise_db: variant.noiseDb ?? null,
    runflat: variant.runflat,
    country_of_origin: variant.countryOfOrigin ?? 'Unknown',
    compare_at_price: pricing.compareAtPrice ?? null,
    cost_price: pricing.costPrice ?? null,
    low_stock_alert: pricing.lowStockAlert ?? 10,
    status: 'active',
    total_available_stock: 0,
  }).select('product_id').single()

  if (error) throw error

  if (pricing.priceIncGst) {
    await supabase.from('product_prices').insert({
      product_id: sku.product_id,
      price_type: 'retail',
      price_inc_gst: pricing.priceIncGst,
      price_ex_gst: parseFloat((pricing.priceIncGst / 1.1).toFixed(2)),
      is_active: true,
    })
  }

  await catalogueSyncQueue?.add('upsert_sku', { type: 'upsert_sku', product_id: sku.product_id })
  return sku.product_id
}

// ============================================================
// VARIANT STOCK — update stock levels per warehouse
// ============================================================
export async function updateVariantStock(
  productId: string,
  warehouseId: string,
  availableStock: number,
  lowStockAlert?: number
) {
  const { error } = await supabase.from('product_stock').upsert(
    {
      product_id: productId,
      warehouse_id: warehouseId,
      available_stock: availableStock,
      minimum_stock_level: lowStockAlert ?? 10,
    },
    { onConflict: 'product_id,warehouse_id' }
  )
  if (error) throw error

  await redis?.del(`stock:${productId}`)
  await catalogueSyncQueue?.add('upsert_sku', { type: 'upsert_sku', product_id: productId })
}

// ============================================================
// DELETE PRODUCT (pattern + all child rows)
// ============================================================
export async function deleteProduct(patternId: string) {
  // Get all SKU ids first
  const { data: skus } = await supabase
    .from('skus').select('product_id').eq('pattern_id', patternId)
  const skuIds = (skus ?? []).map(s => s.product_id)

  if (skuIds.length > 0) {
    await supabase.from('product_prices').delete().in('product_id', skuIds)
    await supabase.from('product_stock').delete().in('product_id', skuIds)
    await supabase.from('skus').delete().in('product_id', skuIds)
  }

  await supabase.from('pattern_categories').delete().eq('pattern_id', patternId)

  const { error } = await supabase.from('patterns').delete().eq('pattern_id', patternId)
  if (error) throw error

  // Invalidate cache
  await redis?.del('admin:brands')
}

// ============================================================
// DELETE VARIANT (sku + prices + stock)
// ============================================================
export async function deleteVariant(productId: string) {
  await supabase.from('product_prices').delete().eq('product_id', productId)
  await supabase.from('product_stock').delete().eq('product_id', productId)

  const { error } = await supabase.from('skus').delete().eq('product_id', productId)
  if (error) throw error

  await redis?.del(`stock:${productId}`)
}

// ============================================================
// UPDATE VARIANT PRICES — upsert by (product_id, customer_group_id)
// prices is a map of { 'Retail': 199.99, ... }  (group_name → price_inc_gst)
// ============================================================
export async function updateVariantPrices(
  productId: string,
  prices: Record<string, number>
) {
  // Fetch existing price rows so we can match by price_id
  const { data: existing } = await supabase
    .from('product_prices')
    .select('price_id, customer_group_id, price_type')
    .eq('product_id', productId)

  const gstRate = 0.1

  for (const [groupName, priceIncGst] of Object.entries(prices)) {
    // Find matching existing row (null customer_group_id = Retail)
    const row = (existing ?? []).find(p =>
      groupName === 'Retail' ? p.customer_group_id === null : false
    ) ?? (existing ?? [])[0]

    const priceExGst = parseFloat((priceIncGst / (1 + gstRate)).toFixed(2))

    if (row?.price_id) {
      await supabase
        .from('product_prices')
        .update({ price_inc_gst: priceIncGst, price_ex_gst: priceExGst })
        .eq('price_id', row.price_id)
    } else {
      await supabase.from('product_prices').insert({
        product_id: productId,
        price_type: 'retail',
        price_inc_gst: priceIncGst,
        price_ex_gst: priceExGst,
        is_active: true,
      })
    }
  }

  await catalogueSyncQueue?.add('upsert_sku', { type: 'upsert_sku', product_id: productId })
}

// ============================================================
// BRAND helpers (for dropdowns)
// ============================================================
export async function listBrands() {
  const cached = await redis?.get<{ brand_id: string; brand_name: string }[]>('admin:brands')
  if (cached) return cached

  const { data } = await supabase
    .from('brands').select('brand_id, brand_name, brand_slug').eq('is_active', true).order('brand_name')
  await redis?.set('admin:brands', data ?? [], { ex: TTL.SUPPLIER_MAP })
  return data ?? []
}

export async function listCollections() {
  const { data } = await supabase
    .from('collections').select('collection_id, collection_name').eq('is_active', true).order('collection_name')
  return data ?? []
}

export async function listCategories() {
  const { data } = await supabase
    .from('categories').select('category_id, category_name, category_type, parent_category_id').eq('is_active', true)
  return data ?? []
}
