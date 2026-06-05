'use client'

import { useCallback } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import ProductsTable from '@/components/admin/products/ProductsTable'
import { AdminBreadcrumb } from '@/components/admin/AdminBreadcrumb'
import { useProductList, useProductMeta } from '@/lib/query/hooks'

const LIMIT = 20

type Product = {
  id: string
  name: string
  brand: string
  brandId: string
  collection: string | null
  variantCount: number
  activeVariants: number
  isActive: boolean
  showOnWebsite: boolean
  updatedAt: string
  createdAt: string
}

type Brand = { brand_id: string; brand_name: string }

const STOCK_FILTERS = [
  { value: '',         label: 'All Stock'     },
  { value: 'in_stock', label: 'In Stock'      },
  { value: 'no_stock', label: 'Out of Stock'  },
]

export default function AdminProductsPage() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const pathname     = usePathname()

  const search    = searchParams.get('search')    ?? ''
  const page      = Number(searchParams.get('page') ?? 1)
  const sortBy    = searchParams.get('sortBy')    ?? 'updated_at'
  const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') ?? 'desc'
  const brandId   = searchParams.get('brandId')   ?? ''
  const patternId = searchParams.get('patternId') ?? ''
  const status    = searchParams.get('status')    ?? ''
  const stock     = searchParams.get('stock')     ?? ''

  const metaQuery = useProductMeta()
  const listQuery = useProductList({ search, page, sortBy, sortOrder, brandId, patternId, status, stock })

  const loading   = listQuery.isPending
  const products  = listQuery.data?.data ?? []
  const brands    = metaQuery.data?.brands ?? []
  const allPatterns = metaQuery.data?.patterns ?? []
  const count     = listQuery.data?.total  ?? 0

  // Only show patterns belonging to the selected brand
  const brandPatterns = brandId
    ? allPatterns.filter((p: { brand_id: string }) => p.brand_id === brandId)
    : []

  const totalPages = Math.ceil(count / LIMIT)

  const buildHref = useCallback((extra: Record<string, string>) => {
    const p = new URLSearchParams({ sortBy, sortOrder, search, page: String(page), brandId, patternId, status, stock })
    Object.entries(extra).forEach(([k, v]) => v ? p.set(k, v) : p.delete(k))
    return `${pathname}?${p}`
  }, [sortBy, sortOrder, search, page, brandId, patternId, status, stock, pathname])

  function handleSort(col: string) {
    if (col === sortBy) {
      router.push(buildHref({ sortOrder: sortOrder === 'asc' ? 'desc' : 'asc', page: '1' }))
    } else {
      const defaultOrder = ['pattern_name', 'brand_name', 'variant_count'].includes(col) ? 'asc' : 'desc'
      router.push(buildHref({ sortBy: col, sortOrder: defaultOrder, page: '1' }))
    }
  }

  function onRefresh() {
    // bump page to force re-fetch while staying on current view
    router.refresh()
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-5">
        <AdminBreadcrumb crumbs={[{ label: 'Products' }]} />
      </div>

      <div className="flex flex-col gap-3 mb-5 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-zinc-900">Products</h1>
        <Link
          href="/admin/products/new"
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-primary/90 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Create Product
        </Link>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
        {/* ── Toolbar ── */}
        <div className="px-4 py-3 border-b border-zinc-200">
          <div className="flex flex-wrap items-center gap-2">

            {/* Brand dropdown */}
            <select
              value={brandId}
              onChange={e => router.push(buildHref({ brandId: e.target.value, patternId: '', page: '1' }))}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors ${
                brandId ? 'border-zinc-900 text-zinc-900 bg-zinc-50' : 'border-zinc-300 text-zinc-600'
              }`}
            >
              <option value="">All Brands</option>
              {brands.map(b => (
                <option key={b.brand_id} value={b.brand_id}>{b.brand_name}</option>
              ))}
            </select>

            {/* Pattern dropdown — only when brand selected and it has patterns */}
            {brandId && brandPatterns.length > 0 && (
              <select
                value={patternId}
                onChange={e => router.push(buildHref({ patternId: e.target.value, page: '1' }))}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors ${
                  patternId ? 'border-primary text-zinc-900 bg-primary/5' : 'border-zinc-300 text-zinc-600'
                }`}
              >
                <option value="">All Patterns</option>
                {brandPatterns.map((p: { pattern_id: string; pattern_name: string }) => (
                  <option key={p.pattern_id} value={p.pattern_id}>{p.pattern_name}</option>
                ))}
              </select>
            )}

            {/* Status dropdown */}
            <select
              value={status}
              onChange={e => router.push(buildHref({ status: e.target.value, page: '1' }))}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors ${
                status ? 'border-zinc-900 text-zinc-900 bg-zinc-50' : 'border-zinc-300 text-zinc-600'
              }`}
            >
              <option value="">All Status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>

            {/* Stock dropdown */}
            <select
              value={stock}
              onChange={e => router.push(buildHref({ stock: e.target.value, page: '1' }))}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors ${
                stock ? 'border-zinc-900 text-zinc-900 bg-zinc-50' : 'border-zinc-300 text-zinc-600'
              }`}
            >
              {STOCK_FILTERS.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>

            {/* Clear all filters */}
            {(brandId || patternId || status || stock || search) && (
              <button
                type="button"
                onClick={() => router.push(buildHref({ brandId: '', patternId: '', status: '', stock: '', search: '', page: '1' }))}
                className="text-xs text-zinc-400 hover:text-red-600 transition-colors ml-1"
              >
                ✕ Clear filters
              </button>
            )}

            {/* Search — pushed to the right */}
            <form
              onSubmit={e => {
                e.preventDefault()
                const q = (new FormData(e.currentTarget).get('search') as string) ?? ''
                router.push(buildHref({ search: q, page: '1' }))
              }}
              className="relative ml-auto"
            >
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text" name="search" defaultValue={search}
                placeholder="Search products…"
                className="pl-8 pr-3 py-1.5 text-xs border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary w-48"
              />
            </form>
          </div>
        </div>

        {/* ── Table ── */}
        {loading ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50">
                  {['Name', 'Brand', 'Collection', 'Variants', 'Status', 'Updated', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-300">
                {[1,2,3,4,5,6,7,8].map(i => (
                  <tr key={i}>
                    {[48, 24, 28, 12, 16, 20, 8].map((w, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div className={`h-4 w-${w} bg-zinc-100 rounded animate-pulse`} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <ProductsTable
            products={products}
            onPublishToggle={onRefresh}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
          />
          </div>
        )}

        {/* ── Pagination ── */}
        <div className="flex flex-col gap-2 px-4 py-3 border-t border-zinc-200 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          {loading
            ? <div className="h-4 w-36 bg-zinc-100 rounded animate-pulse" />
            : <span>{count === 0 ? '0 results' : `${(page - 1) * LIMIT + 1}–${Math.min(page * LIMIT, count)} of ${count} results`}</span>
          }
          <div className="flex items-center gap-3">
            <span>{loading ? '…' : `Page ${page} of ${totalPages || 1}`}</span>
            <div className="flex gap-1">
              {page > 1 && (
                <Link href={buildHref({ page: String(page - 1) })} className="px-3 py-1.5 rounded-lg border border-zinc-300 hover:bg-white hover:border-zinc-400 transition-colors text-xs font-medium">Prev</Link>
              )}
              {page < totalPages && (
                <Link href={buildHref({ page: String(page + 1) })} className="px-3 py-1.5 rounded-lg border border-zinc-300 hover:bg-white hover:border-zinc-400 transition-colors text-xs font-medium">Next</Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

