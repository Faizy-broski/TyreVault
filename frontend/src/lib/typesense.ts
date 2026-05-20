import Typesense from 'typesense'
import type { SearchParams } from 'typesense/lib/Typesense/Documents'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySearchParams = SearchParams<any>

const typesense = new Typesense.Client({
  nodes: [
    {
      host:     process.env.NEXT_PUBLIC_TYPESENSE_HOST     || 'localhost',
      port:     Number(process.env.NEXT_PUBLIC_TYPESENSE_PORT || 8108),
      protocol: (process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL || 'http') as 'http' | 'https',
    },
  ],
  apiKey:                   process.env.NEXT_PUBLIC_TYPESENSE_SEARCH_KEY || '',
  connectionTimeoutSeconds: 2,
  numRetries:               0,
})

export const SKU_COLLECTION = 'skus'

export interface TyreSearchResult {
  id:                    string
  sku:                   string
  tyre_size_display:     string
  brand_name:            string
  pattern_name:          string
  width:                 number
  profile:               number
  rim_size:              number
  runflat:               boolean
  xl_reinforced:         boolean
  total_available_stock: number
  in_stock:              boolean
  effective_price_retail: number | null
  main_image:            string | null
  status:                string
  brand_id:              string
  pattern_id:            string
  product_slug:          string | null
  application_type:      string
  country_of_origin:     string
}

export interface TyreFacetCount {
  value: string
  count: number
}

export interface TyreSearchResponse {
  hits:   TyreSearchResult[]
  total:  number
  facets: {
    width:            TyreFacetCount[]
    profile:          TyreFacetCount[]
    rim_size:         TyreFacetCount[]
    brand_name:       TyreFacetCount[]
    runflat:          TyreFacetCount[]
    in_stock:         TyreFacetCount[]
    application_type: TyreFacetCount[]
  }
}

export interface TyreSearchFilters {
  width?:            number
  profile?:          number
  rim_size?:         number
  brand?:            string[]
  runflat?:          boolean
  in_stock?:         boolean
  application_type?: string
  q?:                string
  page?:             number
  sort?:             'price_asc' | 'price_desc' | 'stock_desc'
}

const PAGE_SIZE = 24

export async function searchTyres(filters: TyreSearchFilters): Promise<TyreSearchResponse> {
  const filterParts: string[] = ['status:=active']

  if (filters.width)            filterParts.push(`width:=${filters.width}`)
  if (filters.profile)          filterParts.push(`profile:=${filters.profile}`)
  if (filters.rim_size)         filterParts.push(`rim_size:=${filters.rim_size}`)
  if (filters.runflat != null)  filterParts.push(`runflat:=${filters.runflat}`)
  if (filters.in_stock)         filterParts.push(`in_stock:=true`)
  if (filters.application_type) filterParts.push(`application_type:=${filters.application_type}`)
  if (filters.brand?.length)    filterParts.push(`brand_name:[${filters.brand.map(b => `\`${b}\``).join(',')}]`)

  const sortBy =
    filters.sort === 'price_asc'  ? 'effective_price_retail:asc'  :
    filters.sort === 'price_desc' ? 'effective_price_retail:desc' :
    'total_available_stock:desc'

  const params: AnySearchParams = {
    q:              filters.q?.trim() || '*',
    query_by:       'tyre_size_display,brand_name,pattern_name',
    filter_by:      filterParts.join(' && '),
    facet_by:       'width,profile,rim_size,brand_name,runflat,in_stock,application_type',
    max_facet_values: 50,
    sort_by:        sortBy,
    page:           filters.page ?? 1,
    per_page:       PAGE_SIZE,
    num_typos:      1,
  }

  const result = await typesense
    .collections(SKU_COLLECTION)
    .documents()
    .search(params)

  const hits = (result.hits ?? []).map(h => h.document as TyreSearchResult)

  function getFacet(name: string): TyreFacetCount[] {
    const f = result.facet_counts?.find(fc => fc.field_name === name)
    if (!f) return []
    return (f.counts ?? []).map(c => ({ value: String(c.value), count: c.count }))
  }

  return {
    hits,
    total: result.found ?? 0,
    facets: {
      width:            getFacet('width'),
      profile:          getFacet('profile'),
      rim_size:         getFacet('rim_size'),
      brand_name:       getFacet('brand_name'),
      runflat:          getFacet('runflat'),
      in_stock:         getFacet('in_stock'),
      application_type: getFacet('application_type'),
    },
  }
}
