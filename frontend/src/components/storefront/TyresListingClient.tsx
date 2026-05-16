'use client'

import { useState, useTransition } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import { Search, SlidersHorizontal, X, ShoppingCart } from 'lucide-react'
import { useCartStore } from '@/stores/cart.store'
import type { TyreSearchResponse, TyreSearchFilters, TyreSearchResult } from '@/lib/typesense'

const PAGE_SIZE = 24

interface Props {
  initialResult:  TyreSearchResponse | null
  initialError:   string | null
  initialParams:  {
    q:                string
    width?:           number
    profile?:         number
    rim_size?:        number
    brand:            string[]
    runflat?:         boolean
    in_stock:         boolean
    application_type?: string
    page:             number
    sort:             'price_asc' | 'price_desc' | 'stock_desc'
  }
}

function buildQuery(filters: ReturnType<typeof normaliseFilters>): string {
  const p = new URLSearchParams()
  if (filters.q)                p.set('q', filters.q)
  if (filters.width)            p.set('width',    String(filters.width))
  if (filters.profile)          p.set('profile',  String(filters.profile))
  if (filters.rim_size)         p.set('rim_size', String(filters.rim_size))
  if (filters.brand?.length)    filters.brand.forEach(b => p.append('brand', b))
  if (filters.runflat != null)  p.set('runflat', String(filters.runflat))
  if (filters.in_stock)         p.set('in_stock', 'true')
  if (filters.application_type) p.set('application_type', filters.application_type)
  if (filters.sort !== 'stock_desc') p.set('sort', filters.sort)
  if (filters.page > 1)         p.set('page', String(filters.page))
  return p.toString()
}

function normaliseFilters(p: Props['initialParams']): TyreSearchFilters & { page: number; sort: 'price_asc' | 'price_desc' | 'stock_desc' } {
  return { ...p, brand: p.brand ?? [] }
}

function StockBadge({ stock }: { stock: number }) {
  if (stock === 0) return <span className="text-xs font-medium text-red-600">Out of stock</span>
  if (stock <= 4)  return <span className="text-xs font-medium text-amber-600">Low stock — {stock} left</span>
  return <span className="text-xs font-medium text-green-700">In stock</span>
}

function TyreCard({ hit, onAddToCart }: { hit: TyreSearchResult; onAddToCart: (hit: TyreSearchResult) => void }) {
  const imgSrc = hit.main_image ?? null
  return (
    <div className="group flex flex-col rounded-2xl border border-zinc-200 bg-white hover:shadow-md transition-shadow overflow-hidden">
      <a href={hit.product_slug ? `/tyres/${hit.product_slug}` : '#'} className="block">
        <div className="aspect-[4/3] bg-zinc-100 relative overflow-hidden">
          {imgSrc ? (
            <Image src={imgSrc} alt={hit.tyre_size_display} fill className="object-contain p-4 group-hover:scale-105 transition-transform" sizes="(max-width: 768px) 50vw, 25vw" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full border-4 border-zinc-300 opacity-30" />
            </div>
          )}
        </div>
        <div className="p-4 space-y-1.5">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">{hit.brand_name}</p>
          <p className="text-sm font-semibold text-zinc-900 line-clamp-2 leading-snug">{hit.pattern_name}</p>
          <p className="text-sm text-zinc-600">{hit.tyre_size_display}</p>
          <div className="flex flex-wrap gap-1 pt-0.5">
            {hit.runflat      && <span className="text-xs bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded-full">Runflat</span>}
            {hit.xl_reinforced && <span className="text-xs bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded-full">XL</span>}
          </div>
        </div>
      </a>
      <div className="mt-auto border-t border-zinc-100 px-4 py-3 flex items-center justify-between gap-2">
        <div>
          {hit.effective_price_retail != null ? (
            <p className="text-base font-bold text-zinc-900">${hit.effective_price_retail.toFixed(2)}</p>
          ) : (
            <p className="text-sm text-zinc-400">Price on request</p>
          )}
          <StockBadge stock={hit.total_available_stock} />
        </div>
        <button
          type="button"
          onClick={() => onAddToCart(hit)}
          disabled={hit.total_available_stock === 0}
          className="shrink-0 flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-zinc-900 hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          Add
        </button>
      </div>
    </div>
  )
}

function DimensionSelect({ label, value, options, onChange }: {
  label: string; value: number | undefined
  options: { value: string; count: number }[]
  onChange: (v: number | undefined) => void
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">{label}</label>
      <select
        value={value ?? ''}
        onChange={e => onChange(e.target.value ? Number(e.target.value) : undefined)}
        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
      >
        <option value="">Any {label}</option>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.value}{o.count ? ` (${o.count})` : ''}</option>
        ))}
      </select>
    </div>
  )
}

export default function TyresListingClient({ initialResult, initialError, initialParams }: Props) {
  const router     = useRouter()
  const pathname   = usePathname()
  const [pending, startTransition] = useTransition()

  const [filters, setFilters] = useState(normaliseFilters(initialParams))
  const [searchInput, setSearchInput] = useState(initialParams.q)

  const { addItem } = useCartStore()

  const result = initialResult
  const error  = initialError
  const facets = result?.facets

  function navigate(newFilters: typeof filters) {
    const qs = buildQuery(newFilters)
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname)
    })
  }

  function updateFilter<K extends keyof typeof filters>(key: K, value: (typeof filters)[K]) {
    const next = { ...filters, [key]: value, page: 1 }
    setFilters(next)
    navigate(next)
  }

  function toggleBrand(brand: string) {
    const current = filters.brand ?? []
    const next = current.includes(brand)
      ? current.filter(b => b !== brand)
      : [...current, brand]
    updateFilter('brand', next)
  }

  function clearAll() {
    const clean = { q: '', brand: [], page: 1, sort: 'stock_desc' as const, in_stock: false }
    setFilters(clean)
    setSearchInput('')
    startTransition(() => { router.push(pathname) })
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    updateFilter('q', searchInput)
  }

  async function handleAddToCart(hit: TyreSearchResult) {
    const result = await addItem({
      id:    hit.id,
      sku:   hit.sku,
      name:  `${hit.brand_name} ${hit.pattern_name}`,
      size:  hit.tyre_size_display,
      price: hit.effective_price_retail ?? 0,
      image: hit.main_image ?? null,
      stock: hit.total_available_stock,
    }, 1)
    if (result.error === 'out_of_stock') {
      alert('Sorry, this item is out of stock.')
    } else if (result.error === 'insufficient_stock') {
      alert(`Only ${result.available} unit(s) available. Cart updated to maximum.`)
    }
  }

  const hasActiveFilters = (filters.width || filters.profile || filters.rim_size ||
    (filters.brand?.length ?? 0) > 0 || filters.runflat != null || filters.in_stock ||
    filters.application_type || filters.q)

  const totalPages  = result ? Math.ceil(result.total / PAGE_SIZE) : 1
  const currentPage = filters.page ?? 1

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Shop Tyres</h1>
          {result && (
            <p className="text-sm text-zinc-500 mt-0.5">
              {result.total.toLocaleString()} tyre{result.total !== 1 ? 's' : ''} found
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-zinc-500">Sort by</label>
          <select
            value={filters.sort}
            onChange={e => updateFilter('sort', e.target.value as typeof filters.sort)}
            className="rounded-lg border border-zinc-300 px-2 py-1.5 text-xs text-zinc-700 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
          >
            <option value="stock_desc">In stock first</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
          </select>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Filter sidebar */}
        <aside className="w-56 shrink-0 space-y-5">
          {/* Search */}
          <form onSubmit={handleSearch}>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Search</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              <input
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Brand, size, pattern..."
                className="w-full rounded-lg border border-zinc-300 pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
          </form>

          {/* Dimensions */}
          <DimensionSelect label="Width"   value={filters.width}    options={facets?.width   ?? []} onChange={v => updateFilter('width', v)} />
          <DimensionSelect label="Profile" value={filters.profile}  options={facets?.profile ?? []} onChange={v => updateFilter('profile', v)} />
          <DimensionSelect label="Rim"     value={filters.rim_size} options={facets?.rim_size ?? []} onChange={v => updateFilter('rim_size', v)} />

          {/* Brand */}
          {(facets?.brand_name?.length ?? 0) > 0 && (
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Brand</label>
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {facets!.brand_name.map(b => (
                  <label key={b.value} className="flex items-center gap-2 cursor-pointer py-0.5">
                    <input
                      type="checkbox"
                      checked={(filters.brand ?? []).includes(b.value)}
                      onChange={() => toggleBrand(b.value)}
                      className="w-3.5 h-3.5 accent-yellow-400 rounded"
                    />
                    <span className="text-sm text-zinc-700">{b.value}</span>
                    <span className="ml-auto text-xs text-zinc-400">{b.count}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Toggles */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!filters.runflat}
                onChange={e => updateFilter('runflat', e.target.checked ? true : undefined)}
                className="w-3.5 h-3.5 accent-yellow-400"
              />
              <span className="text-sm text-zinc-700">Runflat only</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!filters.in_stock}
                onChange={e => updateFilter('in_stock', e.target.checked)}
                className="w-3.5 h-3.5 accent-yellow-400"
              />
              <span className="text-sm text-zinc-700">In stock only</span>
            </label>
          </div>

          {/* Application type */}
          {(facets?.application_type?.length ?? 0) > 0 && (
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Type</label>
              <div className="flex flex-wrap gap-1.5">
                {facets!.application_type.map(a => (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => updateFilter('application_type', filters.application_type === a.value ? undefined : a.value)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                      filters.application_type === a.value
                        ? 'bg-primary text-zinc-900'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                  >
                    {a.value} ({a.count})
                  </button>
                ))}
              </div>
            </div>
          )}

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAll}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800"
            >
              <X className="w-3.5 h-3.5" />
              Clear all filters
            </button>
          )}
        </aside>

        {/* Results */}
        <div className="flex-1 min-w-0">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 mb-4 text-sm text-red-700 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 shrink-0" />
              Search unavailable: {error}
            </div>
          )}

          {pending && (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-zinc-200 bg-white overflow-hidden animate-pulse">
                  <div className="aspect-[4/3] bg-zinc-100" />
                  <div className="p-4 space-y-2">
                    <div className="h-3 bg-zinc-100 rounded w-1/2" />
                    <div className="h-4 bg-zinc-100 rounded w-3/4" />
                    <div className="h-3 bg-zinc-100 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!pending && result && result.hits.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center mb-4">
                <Search className="w-7 h-7 text-zinc-400" />
              </div>
              <p className="text-zinc-600 font-medium">No tyres match your filters</p>
              <p className="text-sm text-zinc-400 mt-1">Try adjusting your size or removing filters</p>
              <button type="button" onClick={clearAll} className="mt-4 text-sm font-medium text-primary underline underline-offset-2">
                Clear all filters
              </button>
            </div>
          )}

          {!pending && result && result.hits.length > 0 && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {result.hits.map(hit => (
                  <TyreCard key={hit.id} hit={hit} onAddToCart={handleAddToCart} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-8">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => updateFilter('page', currentPage - 1)}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Prev
                  </button>
                  <span className="text-sm text-zinc-500">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => updateFilter('page', currentPage + 1)}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
