'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import ProductsTable from '@/components/admin/products/ProductsTable'
import { toastError } from '@/lib/toast'
import { AdminBreadcrumb } from '@/components/admin/AdminBreadcrumb'

const API   = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
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

const STATUS_FILTERS = [
  { value: '',          label: 'All'       },
  { value: 'published', label: 'Published' },
  { value: 'draft',     label: 'Draft'     },
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
  const status    = searchParams.get('status')    ?? ''

  const [products, setProducts] = useState<Product[]>([])
  const [brands, setBrands]     = useState<Brand[]>([])
  const [count, setCount]       = useState(0)
  const [loading, setLoading]   = useState(true)

  useEffect(() => { document.title = 'Products | Tyre Vault' }, [])

  // Fetch brands for filter dropdown once
  useEffect(() => {
    async function loadBrands() {
      try {
        const { data: { session } } = await createClient().auth.getSession()
        const tok = session?.access_token ?? ''
        const res = await fetch(`${API}/api/admin/products/meta`, {
          headers: { Authorization: `Bearer ${tok}` },
        })
        if (res.ok) {
          const json = await res.json()
          setBrands(json.brands ?? [])
        }
      } catch { /* non-fatal */ }
    }
    loadBrands()
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const { data: { session } } = await createClient().auth.getSession()
        const tok = session?.access_token ?? ''

        const qs = new URLSearchParams({ page: String(page), sortBy, sortOrder })
        if (search)  qs.set('search',  search)
        if (brandId) qs.set('brandId', brandId)
        if (status)  qs.set('status',  status)

        const res = await fetch(`${API}/api/admin/products?${qs}`, {
          headers: { Authorization: `Bearer ${tok}` },
          cache: 'no-store',
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error ?? `API returned ${res.status}`)
        }
        const json = await res.json()
        if (!cancelled) {
          setCount(json.total ?? 0)
          setProducts((json.data ?? []).map((p: {
            id: string; name: string
            brand: { brand_id: string; brand_name: string } | null
            collection: { collection_name: string } | null
            variantCount: number; activeVariantCount: number
            isActive: boolean; showOnWebsite: boolean
            updatedAt: string; createdAt: string
          }) => ({
            id:             p.id,
            name:           p.name,
            brand:          p.brand?.brand_name ?? '—',
            brandId:        p.brand?.brand_id ?? '',
            collection:     p.collection?.collection_name ?? null,
            variantCount:   p.variantCount,
            activeVariants: p.activeVariantCount,
            isActive:       p.isActive,
            showOnWebsite:  p.showOnWebsite,
            updatedAt:      p.updatedAt,
            createdAt:      p.createdAt,
          })))
        }
      } catch (err) {
        if (!cancelled) toastError(err instanceof Error ? err.message : 'Failed to load products')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [search, page, sortBy, sortOrder, brandId, status])

  const totalPages = Math.ceil(count / LIMIT)

  const buildHref = useCallback((extra: Record<string, string>) => {
    const p = new URLSearchParams({ sortBy, sortOrder, search, page: String(page), brandId, status })
    Object.entries(extra).forEach(([k, v]) => v ? p.set(k, v) : p.delete(k))
    return `${pathname}?${p}`
  }, [sortBy, sortOrder, search, page, brandId, status, pathname])

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
        <div className="px-4 py-3 border-b border-zinc-200 space-y-2">
          {/* Row 1: status chips + sort + search */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            {/* Status filter chips */}
            <div className="flex items-center gap-1">
              {STATUS_FILTERS.map(f => (
                <Link
                  key={f.value}
                  href={buildHref({ status: f.value, page: '1' })}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    status === f.value
                      ? 'bg-primary text-black font-medium'
                      : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
                  }`}
                >
                  {f.label}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {/* Search */}
              <form onSubmit={e => {
                e.preventDefault()
                const q = (new FormData(e.currentTarget).get('search') as string) ?? ''
                router.push(buildHref({ search: q, page: '1' }))
              }} className="relative">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input type="text" name="search" defaultValue={search} placeholder="Search products…"
                  className="pl-8 pr-3 py-1.5 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary w-52"
                />
              </form>
            </div>
          </div>

          {/* Row 2: brand filter (visible when brands loaded) */}
          {brands.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-zinc-400 mr-1">Brand:</span>
              <Link
                href={buildHref({ brandId: '', page: '1' })}
                className={`px-2.5 py-0.5 rounded-full text-xs border transition-colors ${
                  !brandId ? 'bg-primary text-black font-medium' : 'border-zinc-300 text-zinc-600 hover:border-zinc-500'
                }`}
              >
                All
              </Link>
              {brands.map(b => (
                <Link
                  key={b.brand_id}
                  href={buildHref({ brandId: b.brand_id, page: '1' })}
                  className={`px-2.5 py-0.5 rounded-full text-xs border transition-colors ${
                    brandId === b.brand_id
                      ? 'bg-zinc-900 text-white border-zinc-900'
                      : 'border-zinc-300 text-zinc-600 hover:border-zinc-500'
                  }`}
                >
                  {b.brand_name}
                </Link>
              ))}
            </div>
          )}
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
              <tbody className="divide-y divide-zinc-100">
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
