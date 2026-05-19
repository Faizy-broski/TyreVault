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

  // SEO + Visibility
  defaultCountryOfOrigin?: string
  showOnWebsite?: boolean
  seoTitle?: string
  seoDescription?: string
  treadImage?: string

  // Categories
  discountable: boolean
  applicationType: 'PCR' | '4x4' | 'TBR'
  categoryIds?: string[]
  performanceCategory?: string
  seasonType?: string
  collectionId?: string
  tags?: string[]
  positionCategory?: 'steer' | 'drive' | 'trailer' | 'all_position'
  shoulderType?: 'open_shoulder' | 'closed_shoulder' | 'block_drive'
  terrainType?: string
  warrantyKm?: number

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
  loadSpeedRating?: string
  speedRating?: string
  fuelRating?: string
  wetGrip?: string
  noiseDb?: string
  noiseClass?: string
  runflat: boolean
  xlReinforced?: boolean
  plyRating?: string
  loadRange?: string
  sidewall?: 'BSW' | 'OWL' | 'RWL'
  tubeType?: 'tubeless' | 'tube_type'
  countryOfOrigin: string
  manufacturerName?: string
  factoryName?: string
  factoryCountry?: string
  sectionWidth?: number
  treadDepth?: number
  tyreWeight?: number
  overallDiameter?: number
  maxLoad?: string
  maxPressure?: string
  eMark?: string
  dotCode?: string
  utqg?: string
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
  sortBy?: 'updated_at' | 'created_at' | 'pattern_name' | 'show_on_website' | 'brand_name' | 'variant_count'
  sortOrder?: 'asc' | 'desc'
}

// ============================================================
// LIST
// ============================================================
export async function listProducts(filters: ProductListFilters) {
  const {
    search, brandId, status = 'active',
    page = 1, limit = 20, sortBy = 'updated_at', sortOrder = 'desc',
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

  // brand_name and variant_count are computed/joined — sort client-side; fall back to updated_at
  const DB_SORT_COLUMNS = ['updated_at', 'created_at', 'pattern_name', 'show_on_website'] as const
  type DbSortCol = typeof DB_SORT_COLUMNS[number]
  const dbSortBy: DbSortCol = (DB_SORT_COLUMNS as readonly string[]).includes(sortBy ?? '')
    ? (sortBy as DbSortCol)
    : 'updated_at'

  query = query.order(dbSortBy, { ascending: sortOrder === 'asc' })

  query = query.range((page - 1) * limit, page * limit - 1)

  if (search) query = query.ilike('pattern_name', `%${search}%`)
  if (brandId) query = query.eq('brand_id', brandId)
  if (status === 'published') query = query.eq('show_on_website', true)
  if (status === 'draft')     query = query.eq('show_on_website', false)

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
      main_image:     payload.galleryImages?.[0] ?? null,
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
      position_category: payload.positionCategory ?? null,
      shoulder_type: payload.shoulderType ?? null,
      terrain_type: payload.terrainType ?? null,
      warranty_km: payload.warrantyKm ?? null,
      seo_title: payload.seoTitle ?? null,
      seo_description: payload.seoDescription ?? null,
      tread_image: payload.treadImage ?? null,
      default_country_of_origin: payload.defaultCountryOfOrigin ?? null,
      is_active: true,
      show_on_website: payload.showOnWebsite ?? false,
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
        load_speed_rating: v.loadSpeedRating ?? null,
        speed_rating: v.speedRating ?? null,
        fuel_rating: v.fuelRating ?? null,
        wet_grip: v.wetGrip ?? null,
        noise_db: v.noiseDb ?? null,
        noise_class: v.noiseClass ?? null,
        runflat: v.runflat,
        xl_reinforced: v.xlReinforced ?? false,
        ply_rating: v.plyRating ?? null,
        load_range: v.loadRange ?? null,
        sidewall: v.sidewall ?? null,
        tube_type: v.tubeType ?? null,
        country_of_origin: v.countryOfOrigin,
        manufacturer_name: v.manufacturerName ?? null,
        factory_name: v.factoryName ?? null,
        factory_country: v.factoryCountry ?? null,
        section_width: v.sectionWidth ?? null,
        tread_depth: v.treadDepth ?? null,
        tyre_weight: v.tyreWeight ?? null,
        overall_diameter: v.overallDiameter ?? null,
        max_load: v.maxLoad ?? null,
        max_pressure: v.maxPressure ?? null,
        e_mark: v.eMark ?? null,
        dot_code: v.dotCode ?? null,
        utqg: v.utqg ?? null,
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
  console.log('[updateProduct service] patternId:', patternId)
  console.log('[updateProduct service] payload keys:', Object.keys(payload))

  const updates: Record<string, unknown> = {}

  if (payload.brandId !== undefined) updates.brand_id = payload.brandId
  if (payload.patternName !== undefined) updates.pattern_name = payload.patternName
  if (payload.patternSlug !== undefined) updates.pattern_slug = payload.patternSlug
  if (payload.shortDescription !== undefined) updates.pattern_short_description = payload.shortDescription
  if (payload.galleryImages !== undefined) {
    updates.gallery_images = payload.galleryImages
    updates.main_image     = payload.galleryImages[0] ?? null
  }
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
  if (payload.positionCategory !== undefined) updates.position_category = payload.positionCategory
  if (payload.shoulderType !== undefined) updates.shoulder_type = payload.shoulderType
  if (payload.terrainType !== undefined) updates.terrain_type = payload.terrainType
  if (payload.warrantyKm !== undefined) updates.warranty_km = payload.warrantyKm
  if (payload.showOnWebsite !== undefined) updates.show_on_website = payload.showOnWebsite
  if (payload.seoTitle !== undefined) updates.seo_title = payload.seoTitle
  if (payload.seoDescription !== undefined) updates.seo_description = payload.seoDescription
  if (payload.treadImage !== undefined) updates.tread_image = payload.treadImage
  if (payload.defaultCountryOfOrigin !== undefined) updates.default_country_of_origin = payload.defaultCountryOfOrigin

  console.log('[updateProduct service] supabase updates object:', updates)
  const { error, data } = await supabase
    .from('patterns')
    .update(updates)
    .eq('pattern_id', patternId)
    .select('pattern_id, pattern_name, brand_id')
  console.log('[updateProduct service] supabase result — error:', error, 'data:', data)
  console.log('[updateProduct service] brand_id in updates:', updates.brand_id, '| returned brand_id:', data?.[0]?.brand_id)
  if (error) throw error

  // Update categories if provided
  if (payload.categoryIds !== undefined) {
    console.log('[updateProduct service] updating categories:', payload.categoryIds)
    await supabase.from('pattern_categories').delete().eq('pattern_id', patternId)
    if (payload.categoryIds.length > 0) {
      const { error: catErr } = await supabase.from('pattern_categories').insert(
        payload.categoryIds.map(cid => ({ pattern_id: patternId, category_id: cid }))
      )
      console.log('[updateProduct service] categories insert error:', catErr)
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
    construction_type: variant.constructionType ?? null,
    load_index: variant.loadIndex ?? null,
    load_speed_rating: variant.loadSpeedRating ?? null,
    speed_rating: variant.speedRating ?? null,
    fuel_rating: variant.fuelRating ?? null,
    wet_grip: variant.wetGrip ?? null,
    noise_db: variant.noiseDb ?? null,
    noise_class: variant.noiseClass ?? null,
    runflat: variant.runflat,
    xl_reinforced: variant.xlReinforced ?? false,
    ply_rating: variant.plyRating ?? null,
    load_range: variant.loadRange ?? null,
    sidewall: variant.sidewall ?? null,
    tube_type: variant.tubeType ?? null,
    country_of_origin: variant.countryOfOrigin,
    manufacturer_name: variant.manufacturerName ?? null,
    factory_name: variant.factoryName ?? null,
    factory_country: variant.factoryCountry ?? null,
    section_width: variant.sectionWidth ?? null,
    tread_depth: variant.treadDepth ?? null,
    tyre_weight: variant.tyreWeight ?? null,
    overall_diameter: variant.overallDiameter ?? null,
    max_load: variant.maxLoad ?? null,
    max_pressure: variant.maxPressure ?? null,
    e_mark: variant.eMark ?? null,
    dot_code: variant.dotCode ?? null,
    utqg: variant.utqg ?? null,
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
// PRODUCT STOCK — per-warehouse + supplier breakdown
// ============================================================
export async function getProductStock(productId: string) {
  // Warehouse stock
  const { data: warehouseRows, error: wErr } = await supabase
    .from('product_stock')
    .select(`
      warehouse_id,
      available_stock,
      reserved_stock,
      warehouses ( warehouse_name )
    `)
    .eq('product_id', productId)

  if (wErr) throw wErr

  // Supplier contributions: join supplier_product_map → supplier_product_stock → suppliers
  const { data: supplierRows } = await supabase
    .from('supplier_product_map')
    .select(`
      map_id,
      suppliers ( supplier_id, supplier_name ),
      supplier_product_stock ( stock_qty )
    `)
    .eq('product_id', productId)
    .eq('is_verified', true)

  const warehouses = (warehouseRows ?? []).map(r => ({
    warehouse_id: r.warehouse_id,
    warehouse_name: (r.warehouses as unknown as { warehouse_name: string } | null)?.warehouse_name ?? 'Unknown',
    available: r.available_stock,
    reserved: r.reserved_stock,
  }))

  const supplierContributions = (supplierRows ?? []).map(r => {
    const stockRows = Array.isArray(r.supplier_product_stock)
      ? (r.supplier_product_stock as { stock_qty: number }[])
      : []
    const stock = stockRows.reduce((sum, s) => sum + (s.stock_qty ?? 0), 0)
    const sup = r.suppliers as unknown as { supplier_id: string; supplier_name: string } | null
    return { supplier_id: sup?.supplier_id ?? '', supplier_name: sup?.supplier_name ?? '', stock }
  })

  const totalSupplierStock = supplierContributions.reduce((s, r) => s + r.stock, 0)

  const suppliers = supplierContributions.map(r => ({
    ...r,
    percentage: totalSupplierStock > 0 ? Math.round((r.stock / totalSupplierStock) * 100) : 0,
  }))

  return { warehouses, suppliers, total_supplier_stock: totalSupplierStock }
}

export async function updateProductStock(
  productId: string,
  allocations: { warehouse_id: string; available: number }[]
) {
  for (const alloc of allocations) {
    const { error } = await supabase.from('product_stock').upsert(
      {
        product_id: productId,
        warehouse_id: alloc.warehouse_id,
        available_stock: alloc.available,
      },
      { onConflict: 'product_id,warehouse_id' }
    )
    if (error) throw error
  }

  // Recompute total_available_stock on the SKU
  const { data: stockRows } = await supabase
    .from('product_stock')
    .select('available_stock')
    .eq('product_id', productId)

  const total = (stockRows ?? []).reduce((s, r) => s + (r.available_stock ?? 0), 0)
  await supabase.from('skus').update({ total_available_stock: total }).eq('product_id', productId)

  await redis?.del(`stock:${productId}`)
  await catalogueSyncQueue?.add('upsert_sku', { type: 'upsert_sku', product_id: productId })
}

// ============================================================
// BRAND helpers (for dropdowns + creation)
// ============================================================
export async function createBrand(payload: { brand_name: string; brand_slug: string; brand_logo?: string }) {
  await redis?.del('admin:brands')
  const { data, error } = await supabase.from('brands').insert({
    brand_name: payload.brand_name,
    brand_slug: payload.brand_slug,
    brand_logo: payload.brand_logo ?? null,
    is_active:  true,
  }).select('brand_id, brand_name, brand_slug').single()
  if (error) throw error
  return data
}

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
    .from('collections').select('collection_id, collection_name, collection_slug, description, is_active, created_at').order('collection_name')
  return data ?? []
}

export async function createCollection(payload: { collection_name: string; collection_slug: string; description?: string }) {
  const { data, error } = await supabase.from('collections').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function updateCollection(id: string, payload: { collection_name?: string; collection_slug?: string; description?: string; is_active?: boolean }) {
  const { error } = await supabase.from('collections').update(payload).eq('collection_id', id)
  if (error) throw error
}

export async function deleteCollection(id: string) {
  const { error } = await supabase.from('collections').delete().eq('collection_id', id)
  if (error) throw error
}

export async function listCategories() {
  const { data } = await supabase
    .from('categories').select('category_id, category_name, category_slug, category_type, description, is_active, sort_order, created_at').order('sort_order').order('category_name')
  return data ?? []
}

export async function createCategory(payload: { category_name: string; category_slug: string; category_type: string; description?: string; sort_order?: number }) {
  const { data, error } = await supabase.from('categories').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function updateCategory(id: string, payload: { category_name?: string; category_slug?: string; category_type?: string; description?: string; is_active?: boolean; sort_order?: number }) {
  const { error } = await supabase.from('categories').update(payload).eq('category_id', id)
  if (error) throw error
}

export async function deleteCategory(id: string) {
  const { error } = await supabase.from('categories').delete().eq('category_id', id)
  if (error) throw error
}
