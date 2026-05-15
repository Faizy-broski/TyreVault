'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import ProductsTable from '@/components/admin/products/ProductsTable'
import { AdminBreadcrumb } from '@/components/admin/AdminBreadcrumb'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
const LIMIT = 20

type Product = {
  id: string
  name: string
  brand: string
  collection: string | null
  variantCount: number
  activeVariants: number
  isActive: boolean
  showOnWebsite: boolean
  updatedAt: string
  createdAt: string
}

export default function AdminProductsPage() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const pathname     = usePathname()

  const search = searchParams.get('search') ?? ''
  const page   = Number(searchParams.get('page') ?? 1)
  const sortBy = (searchParams.get('sortBy') as 'updated_at' | 'created_at') ?? 'updated_at'

  const [products, setProducts] = useState<Product[]>([])
  const [count, setCount]       = useState(0)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  useEffect(() => { document.title = 'Products | Tyre Vault' }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const { data: { session } } = await createClient().auth.getSession()
        const tok = session?.access_token ?? ''

        const qs = new URLSearchParams({ page: String(page), sortBy })
        if (search) qs.set('search', search)

        const res = await fetch(`${API}/api/admin/products?${qs}`, {
          headers: { Authorization: `Bearer ${tok}` },
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
            brand: { brand_name: string } | null
            collection: { collection_name: string } | null
            variantCount: number; activeVariantCount: number
            isActive: boolean; showOnWebsite: boolean
            updatedAt: string; createdAt: string
          }) => ({
            id: p.id,
            name: p.name,
            brand: p.brand?.brand_name ?? '—',
            collection: p.collection?.collection_name ?? null,
            variantCount: p.variantCount,
            activeVariants: p.activeVariantCount,
            isActive: p.isActive,
            showOnWebsite: p.showOnWebsite,
            updatedAt: p.updatedAt,
            createdAt: p.createdAt,
          })))
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load products')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [search, page, sortBy])

  const totalPages = Math.ceil(count / LIMIT)

  const buildHref = useCallback((extra: Record<string, string>) => {
    const p = new URLSearchParams({ sortBy, search, page: String(page) })
    Object.entries(extra).forEach(([k, v]) => p.set(k, v))
    return `${pathname}?${p}`
  }, [sortBy, search, page, pathname])

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-5">
        <AdminBreadcrumb crumbs={[{ label: 'Products' }]} />
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-zinc-900">Products</h1>
        <Link href="/admin/products/new" className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-primary/90 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Create Product
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-zinc-200">
          <div className="flex items-center gap-0.5">
            {(['updated_at', 'created_at'] as const).map(key => (
              <Link key={key} href={buildHref({ sortBy: key, page: '1' })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                  sortBy === key ? 'bg-zinc-100 text-zinc-900 font-medium' : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                <div className="w-3.5 h-3.5 rounded-full border border-current" />
                {key === 'updated_at' ? 'Updated' : 'Created'}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <form onSubmit={e => {
              e.preventDefault()
              const q = (new FormData(e.currentTarget).get('search') as string) ?? ''
              router.push(buildHref({ search: q, page: '1' }))
            }} className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input type="text" name="search" defaultValue={search} placeholder="Search products..."
                className="pl-8 pr-3 py-1.5 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary w-52"
              />
            </form>
            <button type="button" title="Filters" className="p-1.5 rounded-md border border-zinc-300 text-zinc-500 hover:bg-zinc-50">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
              </svg>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50">
                  {['Product', 'Brand', 'Collection', 'Variants', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-zinc-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {[1,2,3,4,5,6,7,8].map(i => (
                  <tr key={i}>
                    <td className="px-4 py-3.5"><div className="h-4 w-48 bg-zinc-100 rounded animate-pulse" /></td>
                    <td className="px-4 py-3.5"><div className="h-4 w-24 bg-zinc-100 rounded animate-pulse" /></td>
                    <td className="px-4 py-3.5"><div className="h-4 w-28 bg-zinc-100 rounded animate-pulse" /></td>
                    <td className="px-4 py-3.5"><div className="h-4 w-12 bg-zinc-100 rounded animate-pulse" /></td>
                    <td className="px-4 py-3.5"><div className="h-5 w-16 bg-zinc-100 rounded-full animate-pulse" /></td>
                    <td className="px-4 py-3.5" />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <ProductsTable products={products} />
        )}

        <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-200 text-sm text-zinc-500">
          {loading
            ? <div className="h-4 w-36 bg-zinc-100 rounded animate-pulse" />
            : <span>1 — {Math.min(page * LIMIT, count)} of {count} results</span>
          }
          <div className="flex items-center gap-3">
            <span>{loading ? '…' : `${page} of ${totalPages || 1} pages`}</span>
            <div className="flex gap-1">
              {page > 1 && (
                <Link href={buildHref({ page: String(page - 1) })} className="px-3 py-1 rounded border border-zinc-300 hover:bg-zinc-50">Prev</Link>
              )}
              {page < totalPages && (
                <Link href={buildHref({ page: String(page + 1) })} className="px-3 py-1 rounded border border-zinc-300 hover:bg-zinc-50">Next</Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
