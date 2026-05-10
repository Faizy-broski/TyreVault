import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ProductsTable from '@/components/admin/products/ProductsTable'

interface PatternRow {
  pattern_id: string
  pattern_name: string
  is_active: boolean
  show_on_website: boolean
  updated_at: string
  created_at: string
  brands: { brand_name: string } | null
  collections: { collection_name: string } | null
  skus: { product_id: string; status: string }[]
}

export const metadata = { title: 'Products' }

interface Props {
  searchParams: Promise<{ search?: string; page?: string; sortBy?: string }>
}

export default async function AdminProductsPage({ searchParams }: Props) {
  const params = await searchParams
  const supabase = await createClient()

  const search   = params.search ?? ''
  const page     = Number(params.page ?? 1)
  const sortBy   = (params.sortBy as 'updated_at' | 'created_at') ?? 'updated_at'
  const limit    = 20

  // ── Fetch patterns with brand, collection, variant count ──────────────────
  let query = supabase
    .from('patterns')
    .select(`
      pattern_id,
      pattern_name,
      is_active,
      show_on_website,
      updated_at,
      created_at,
      brands ( brand_name ),
      collections ( collection_name ),
      skus ( product_id, status )
    `, { count: 'exact' })
    .order(sortBy, { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (search) query = query.ilike('pattern_name', `%${search}%`)

  const { data: rawPatterns, count } = await query

  const patterns = (rawPatterns ?? []) as unknown as PatternRow[]

  const products = patterns.map(p => ({
    id: p.pattern_id,
    name: p.pattern_name,
    brand: p.brands?.brand_name ?? '—',
    collection: p.collections?.collection_name ?? null,
    variantCount: Array.isArray(p.skus) ? p.skus.length : 0,
    activeVariants: Array.isArray(p.skus)
      ? p.skus.filter(s => s.status === 'active').length
      : 0,
    isActive: p.is_active,
    showOnWebsite: p.show_on_website,
    updatedAt: p.updated_at,
    createdAt: p.created_at,
  }))

  const totalPages = Math.ceil((count ?? 0) / limit)

  return (
    <div className="p-6">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-zinc-900">Products</h1>
        <Link
          href="/admin/products/new"
          className="flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Create Product
        </Link>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        {/* Table toolbar */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-zinc-200">
          {/* Sort tabs */}
          <div className="flex items-center gap-0.5">
            {(['updated_at', 'created_at'] as const).map(key => (
              <Link
                key={key}
                href={`?sortBy=${key}&search=${search}&page=1`}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                  sortBy === key
                    ? 'bg-zinc-100 text-zinc-900 font-medium'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                <div className="w-3.5 h-3.5 rounded-full border border-current" />
                {key === 'updated_at' ? 'Updated' : 'Created'}
              </Link>
            ))}
          </div>

          {/* Search */}
          <div className="flex items-center gap-2">
            <form method="GET" className="relative">
              <input type="hidden" name="sortBy" value={sortBy} />
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                name="search"
                defaultValue={search}
                placeholder="Search products..."
                className="pl-8 pr-3 py-1.5 text-sm border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-500/20 focus:border-zinc-500 w-52"
              />
            </form>
            <button className="p-1.5 rounded-md border border-zinc-300 text-zinc-500 hover:bg-zinc-50">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
              </svg>
            </button>
          </div>
        </div>

        {/* Table */}
        <ProductsTable products={products} />

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-200 text-sm text-zinc-500">
          <span>1 — {Math.min(page * limit, count ?? 0)} of {count ?? 0} results</span>
          <div className="flex items-center gap-3">
            <span>{page} of {totalPages} pages</span>
            <div className="flex gap-1">
              {page > 1 && (
                <Link href={`?sortBy=${sortBy}&search=${search}&page=${page - 1}`}
                  className="px-3 py-1 rounded border border-zinc-300 hover:bg-zinc-50">Prev</Link>
              )}
              {page < totalPages && (
                <Link href={`?sortBy=${sortBy}&search=${search}&page=${page + 1}`}
                  className="px-3 py-1 rounded border border-zinc-300 hover:bg-zinc-50">Next</Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
