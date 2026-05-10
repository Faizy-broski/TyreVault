import Typesense from 'typesense'
import type { CollectionCreateSchema } from 'typesense/lib/Typesense/Collections'

export const typesense = new Typesense.Client({
  nodes: [
    {
      host: process.env.TYPESENSE_HOST || 'localhost',
      port: Number(process.env.TYPESENSE_PORT || 8108),
      protocol: (process.env.TYPESENSE_PROTOCOL || 'http') as 'http' | 'https',
    },
  ],
  apiKey: process.env.TYPESENSE_API_KEY!,
  connectionTimeoutSeconds: 5,
})

// ============================================================
// SKU Collection Schema
// One document = one tyre SKU.
// Numeric fields stored as int32/float — exact equality filters,
// sub-millisecond for dimensions like width=225, profile=40, rim=18.
// ============================================================
export const SKU_COLLECTION = 'skus'

export const skuCollectionSchema: CollectionCreateSchema = {
  name: SKU_COLLECTION,
  fields: [
    // --- Identity ---
    { name: 'id',                   type: 'string' },
    { name: 'sku',                  type: 'string' },
    { name: 'product_slug',         type: 'string',  optional: true },

    // --- Tyre dimensions (primary filter axes) ---
    { name: 'width',                type: 'float',   facet: true  },
    { name: 'profile',              type: 'float',   facet: true  },
    { name: 'rim_size',             type: 'float',   facet: true  },
    { name: 'tyre_size_display',    type: 'string'               },
    { name: 'normalized_size_code', type: 'string',  index: true  },

    // --- Product classification (faceted filters) ---
    { name: 'season_type',          type: 'string',  facet: true,  optional: true },
    { name: 'application_type',     type: 'string',  facet: true  },
    { name: 'performance_category', type: 'string',  facet: true,  optional: true },
    { name: 'runflat',              type: 'bool',    facet: true  },
    { name: 'xl_reinforced',        type: 'bool',    facet: true  },
    { name: 'country_of_origin',    type: 'string',  facet: true  },

    // --- Brand & pattern (searchable + filterable) ---
    { name: 'brand_id',             type: 'string',  facet: true  },
    { name: 'brand_name',           type: 'string',  facet: true  },
    { name: 'brand_slug',           type: 'string'               },
    { name: 'pattern_id',           type: 'string',  facet: true  },
    { name: 'pattern_name',         type: 'string'               },

    // --- Stock & price snapshots (refreshed by background jobs) ---
    { name: 'total_available_stock', type: 'int32',  facet: false },
    { name: 'in_stock',              type: 'bool',   facet: true  },
    { name: 'effective_price_retail', type: 'float', optional: true, facet: false },

    // --- Display fields ---
    { name: 'main_image',           type: 'string',  optional: true, index: false },
    { name: 'status',               type: 'string',  facet: true  },
  ],
  default_sorting_field: 'total_available_stock',
  // Enable typo tolerance on brand/pattern name searches
  token_separators: ['-', '_', '.', '/'],
}

// ============================================================
// Ensure the SKU collection exists.
// Idempotent — safe to call on every server start.
// ============================================================
export async function ensureSkuCollection(): Promise<void> {
  try {
    await typesense.collections(SKU_COLLECTION).retrieve()
  } catch {
    await typesense.collections().create(skuCollectionSchema)
    console.log(`[Typesense] Created collection: ${SKU_COLLECTION}`)
  }
}

// ============================================================
// Build a Typesense document from a raw DB row (joined query).
// Called by the catalogue-sync worker.
// ============================================================
export function buildSkuDocument(row: {
  product_id: string
  sku: string
  product_slug: string | null
  width: number | null
  profile: number | null
  rim_size: number
  tyre_size_display: string
  normalized_size_code: string
  season_type: string | null
  application_type: string
  performance_category: string | null
  runflat: boolean
  xl_reinforced: boolean
  country_of_origin: string
  brand_id: string
  brand_name: string
  brand_slug: string
  pattern_id: string
  pattern_name: string
  total_available_stock: number
  effective_price_retail: number | null
  main_image: string | null
  status: string
}): Record<string, unknown> {
  return {
    id: row.product_id,
    sku: row.sku,
    product_slug: row.product_slug ?? undefined,
    width: row.width ?? 0,
    profile: row.profile ?? 0,
    rim_size: row.rim_size,
    tyre_size_display: row.tyre_size_display,
    normalized_size_code: row.normalized_size_code,
    season_type: row.season_type ?? undefined,
    application_type: row.application_type,
    performance_category: row.performance_category ?? undefined,
    runflat: row.runflat,
    xl_reinforced: row.xl_reinforced,
    country_of_origin: row.country_of_origin,
    brand_id: row.brand_id,
    brand_name: row.brand_name,
    brand_slug: row.brand_slug,
    pattern_id: row.pattern_id,
    pattern_name: row.pattern_name,
    total_available_stock: row.total_available_stock,
    in_stock: row.total_available_stock > 0,
    effective_price_retail: row.effective_price_retail ?? undefined,
    main_image: row.main_image ?? undefined,
    status: row.status,
  }
}
