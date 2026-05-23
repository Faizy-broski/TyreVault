'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import { Search, SlidersHorizontal, X, ShoppingCart, ChevronDown } from 'lucide-react'
import { useCartStore } from '@/stores/cart.store'
import type { TyreSku, TyreFacets, TyreSearchFilters } from '@/lib/supabase/search.types'
import { PAGE_SIZE } from '@/lib/supabase/search.types'

type SortOption = 'price_asc' | 'price_desc' | 'stock_desc' | 'updated_at_desc'

interface InitialParams extends TyreSearchFilters {
  q:    string
  page: number
  sort: SortOption
}

interface Props {
  initialResult: { data: TyreSku[]; total: number } | null
  initialFacets: TyreFacets | null
  initialError:  string | null
  initialParams: InitialParams
}

function buildQuery(filters: InitialParams): string {
  const p = new URLSearchParams()
  if (filters.q)        p.set('q',        filters.q)
  if (filters.width)    p.set('width',    String(filters.width))
  if (filters.profile)  p.set('profile',  String(filters.profile))
  if (filters.rim_size) p.set('rim_size', String(filters.rim_size))
  if (filters.brand_id) p.set('brand_id', filters.brand_id)
  if (filters.runflat != null) p.set('runflat', String(filters.runflat))
  if (filters.xl != null)      p.set('xl',      String(filters.xl))
  if (filters.speed)    p.set('speed',    filters.speed)
  if (filters.sort !== 'updated_at_desc') p.set('sort', filters.sort)
  if (filters.page > 1) p.set('page',    String(filters.page))
  return p.toString()
}

function StockBadge({ stock }: { stock: number }) {
  if (stock === 0) return <span className="text-xs font-semibold text-red-500">Out of stock</span>
  if (stock <= 4)  return <span className="text-xs font-semibold text-amber-500">Low stock — {stock} left</span>
  return <span className="text-xs font-semibold text-emerald-500">In stock</span>
}

function TyreCard({ hit, onAddToCart }: { hit: TyreSku; onAddToCart: (hit: TyreSku) => void }) {
  return (
    <div className="group flex flex-col rounded-2xl border border-zinc-200 bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-200 overflow-hidden">
      <a href={hit.product_slug ? `/tyres/${hit.product_slug}` : `/tyres?brand_id=${hit.brand_id}`} className="block">
        <div className="aspect-[4/3] bg-zinc-50 relative overflow-hidden">
          {hit.main_image ? (
            <Image
              src={hit.main_image}
              alt={hit.tyre_size_display}
              fill
              className="object-contain p-4 group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full border-[3px] border-zinc-200 opacity-50" />
            </div>
          )}
        </div>
        <div className="px-4 pt-3 pb-2 space-y-1">
          <p className="text-[10px] font-bold text-primary uppercase tracking-[0.15em]">{hit.brand_name}</p>
          <p className="text-sm font-bold text-zinc-900 line-clamp-1 leading-snug font-oswald uppercase tracking-wide">{hit.pattern_name}</p>
          <p className="text-xs text-zinc-500 font-medium">{hit.tyre_size_display}</p>
          {(hit.runflat || hit.xl_reinforced) && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {hit.runflat       && <span className="text-[10px] bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full font-semibold">Runflat</span>}
              {hit.xl_reinforced && <span className="text-[10px] bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full font-semibold">XL</span>}
            </div>
          )}
        </div>
      </a>
      <div className="mt-auto border-t border-zinc-100 px-4 py-3 flex items-center justify-between gap-2">
        <div>
          {hit.price_inc_gst != null ? (
            <p className="text-base font-bold text-zinc-900">${hit.price_inc_gst.toFixed(2)}</p>
          ) : (
            <p className="text-xs text-zinc-400 italic">Price on request</p>
          )}
          <StockBadge stock={hit.total_stock} />
        </div>
        <button
          type="button"
          onClick={() => onAddToCart(hit)}
          disabled={hit.total_stock === 0}
          className="shrink-0 flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-zinc-900 hover:brightness-110 active:scale-95 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          Add
        </button>
      </div>
    </div>
  )
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-zinc-100 pb-4 last:border-0 last:pb-0">
      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.15em] mb-2.5">{title}</p>
      {children}
    </div>
  )
}

function DimensionSelect({ label, value, options, onChange }: {
  label:    string
  value:    number | undefined
  options:  number[]
  onChange: (v: number | undefined) => void
}) {
  return (
    <div className="relative">
      <select
        value={value ?? ''}
        onChange={e => onChange(e.target.value ? Number(e.target.value) : undefined)}
        className="w-full appearance-none rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary bg-white pr-8 cursor-pointer transition-colors"
      >
        <option value="">Any {label}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
    </div>
  )
}

export default function TyresListingClient({ initialResult, initialFacets, initialError, initialParams }: Props) {
  const router   = useRouter()
  const pathname = usePathname()
  const [pending, startTransition] = useTransition()

  const [filters, setFilters] = useState<InitialParams>(initialParams)
  const [searchInput, setSearchInput] = useState(initialParams.q)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const { addItem } = useCartStore()

  const result = initialResult
  const facets = initialFacets

  const brandSuggestions = searchInput.trim().length >= 2
    ? (facets?.brands ?? []).filter(b =>
        b.brand_name.toLowerCase().includes(searchInput.toLowerCase())
      ).slice(0, 6)
    : []

  function navigate(next: InitialParams) {
    const qs = buildQuery(next)
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname)
    })
  }

  function updateFilter<K extends keyof InitialParams>(key: K, value: InitialParams[K]) {
    const next = { ...filters, [key]: value, page: 1 } as InitialParams
    setFilters(next)
    navigate(next)
  }

  function clearAll() {
    const clean: InitialParams = { q: '', page: 1, sort: 'updated_at_desc' }
    setFilters(clean)
    setSearchInput('')
    startTransition(() => { router.push(pathname) })
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    updateFilter('q', searchInput)
  }

  async function handleAddToCart(hit: TyreSku) {
    const res = await addItem({
      id:    hit.product_id,
      sku:   hit.sku,
      name:  `${hit.brand_name} ${hit.pattern_name}`,
      size:  hit.tyre_size_display,
      price: hit.price_inc_gst ?? 0,
      image: hit.main_image,
      stock: hit.total_stock,
    }, 1)
    if (res.error === 'out_of_stock') {
      alert('Sorry, this item is out of stock.')
    } else if (res.error === 'insufficient_stock') {
      alert(`Only ${res.available} unit(s) available. Cart updated to maximum.`)
    }
  }

  const hasActiveFilters = !!(
    filters.width || filters.profile || filters.rim_size ||
    filters.brand_id || filters.runflat != null || filters.xl != null ||
    filters.speed || filters.q
  )

  const totalPages  = result ? Math.ceil(result.total / PAGE_SIZE) : 1
  const currentPage = filters.page

  const filterPanel = (
    <div className="space-y-4">
      <FilterSection title="Search">
        <form onSubmit={handleSearch}>
          <div className="relative" ref={searchRef}>
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
            <input
              value={searchInput}
              onChange={e => { setSearchInput(e.target.value); setShowSuggestions(true) }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="Brand, size, pattern..."
              className="w-full rounded-lg border border-zinc-200 pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary bg-white transition-colors"
            />
            {showSuggestions && brandSuggestions.length > 0 && (
              <ul className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border border-zinc-200 bg-white shadow-xl overflow-hidden">
                {brandSuggestions.map(b => (
                  <li key={b.brand_id}>
                    <button
                      type="button"
                      onMouseDown={() => {
                        updateFilter('brand_id', b.brand_id)
                        setSearchInput('')
                        setShowSuggestions(false)
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 flex items-center gap-2"
                    >
                      <span className="text-[10px] text-primary font-bold uppercase tracking-widest">Brand</span>
                      {b.brand_name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </form>
      </FilterSection>

      <FilterSection title="Tyre Size">
        <div className="space-y-2">
          <DimensionSelect label="Width"   value={filters.width}    options={facets?.widths    ?? []} onChange={v => updateFilter('width',    v)} />
          <DimensionSelect label="Profile" value={filters.profile}  options={facets?.profiles  ?? []} onChange={v => updateFilter('profile',  v)} />
          <DimensionSelect label="Rim"     value={filters.rim_size} options={facets?.rim_sizes ?? []} onChange={v => updateFilter('rim_size', v)} />
        </div>
      </FilterSection>

      {(facets?.brands?.length ?? 0) > 0 && (
        <FilterSection title="Brand">
          <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1 scrollbar-none">
            {facets!.brands.map(b => (
              <label key={b.brand_id} className="flex items-center gap-2.5 cursor-pointer group/check py-0.5">
                <input
                  type="checkbox"
                  checked={filters.brand_id === b.brand_id}
                  onChange={() => updateFilter('brand_id', filters.brand_id === b.brand_id ? undefined : b.brand_id)}
                  className="w-3.5 h-3.5 rounded accent-yellow-400"
                />
                <span className="text-sm text-zinc-600 group-hover/check:text-zinc-900 transition-colors">{b.brand_name}</span>
              </label>
            ))}
          </div>
        </FilterSection>
      )}

      <FilterSection title="Features">
        <div className="space-y-1.5">
          <label className="flex items-center gap-2.5 cursor-pointer group/check py-0.5">
            <input
              type="checkbox"
              checked={!!filters.runflat}
              onChange={e => updateFilter('runflat', e.target.checked ? true : undefined)}
              className="w-3.5 h-3.5 rounded accent-yellow-400"
            />
            <span className="text-sm text-zinc-600 group-hover/check:text-zinc-900 transition-colors">Runflat only</span>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer group/check py-0.5">
            <input
              type="checkbox"
              checked={!!filters.xl}
              onChange={e => updateFilter('xl', e.target.checked ? true : undefined)}
              className="w-3.5 h-3.5 rounded accent-yellow-400"
            />
            <span className="text-sm text-zinc-600 group-hover/check:text-zinc-900 transition-colors">XL reinforced</span>
          </label>
        </div>
      </FilterSection>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={clearAll}
          className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-primary transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          Clear all filters
        </button>
      )}
    </div>
  )

  return (
    <>
      {/* ── Hero banner (the Navbar floats over this) ── */}
      <section className="relative bg-zinc-900 overflow-hidden">
        {/* Subtle tyre watermark */}
        <div className="pointer-events-none absolute right-0 top-0 h-full w-[400px] opacity-[0.04]">
          <Image src="/tyre.svg" alt="" fill className="object-contain object-right" />
        </div>
        {/* Left vector accent */}
        <div className="pointer-events-none absolute inset-0 bg-[url('/leftvector.svg')] bg-[position:left_center] bg-no-repeat opacity-10" />

        <div className="relative mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-10 pt-32 pb-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-primary uppercase tracking-[0.2em] mb-2">Tyre Vault</p>
              <h1 className="font-oswald text-4xl sm:text-5xl font-bold text-white uppercase tracking-wide leading-none">
                Shop Tyres
              </h1>
              {result && (
                <p className="mt-2 text-sm text-zinc-400 font-medium">
                  {result.total.toLocaleString()} tyre{result.total !== 1 ? 's' : ''} found
                </p>
              )}
            </div>

            {/* Sort — desktop */}
            <div className="hidden sm:flex items-center gap-2 pb-1">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Sort by</span>
              <div className="relative">
                <select
                  value={filters.sort}
                  onChange={e => updateFilter('sort', e.target.value as SortOption)}
                  className="appearance-none rounded-lg border border-white/15 bg-white/5 text-zinc-200 px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer transition-colors"
                >
                  <option value="updated_at_desc">Newest</option>
                  <option value="stock_desc">In stock first</option>
                  <option value="price_asc">Price: low to high</option>
                  <option value="price_desc">Price: high to low</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom edge fade */}
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-b from-transparent to-zinc-50" />
      </section>

      {/* ── Main listing layout ── */}
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-10">

        {/* Mobile top bar */}
        <div className="flex items-center justify-between gap-3 mb-4 sm:hidden">
          <button
            type="button"
            onClick={() => setShowMobileFilters(v => !v)}
            className="flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors shadow-sm"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-primary" />}
          </button>
          <div className="relative">
            <select
              value={filters.sort}
              onChange={e => updateFilter('sort', e.target.value as SortOption)}
              className="appearance-none rounded-xl border border-zinc-300 bg-white text-zinc-700 px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer shadow-sm"
            >
              <option value="updated_at_desc">Newest</option>
              <option value="stock_desc">In stock first</option>
              <option value="price_asc">Price: low → high</option>
              <option value="price_desc">Price: high → low</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
          </div>
        </div>

        {/* Mobile filter drawer */}
        {showMobileFilters && (
          <div className="sm:hidden rounded-2xl border border-zinc-200 bg-white p-4 mb-4 shadow-lg">
            {filterPanel}
          </div>
        )}

        <div className="flex gap-6">
          {/* Desktop filter sidebar */}
          <aside className="hidden sm:block w-52 shrink-0">
            <div className="sticky top-24 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              {filterPanel}
            </div>
          </aside>

          {/* Results area */}
          <div className="flex-1 min-w-0">
            {initialError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 mb-4 text-sm text-red-700 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 shrink-0" />
                Search unavailable: {initialError}
              </div>
            )}

            {/* Loading skeletons */}
            {pending && (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="rounded-2xl border border-zinc-200 bg-white overflow-hidden animate-pulse">
                    <div className="aspect-[4/3] bg-zinc-100" />
                    <div className="p-4 space-y-2">
                      <div className="h-2 bg-zinc-100 rounded-full w-1/3" />
                      <div className="h-4 bg-zinc-100 rounded-full w-3/4" />
                      <div className="h-3 bg-zinc-100 rounded-full w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {!pending && result && result.data.length === 0 && (
              <div className="flex flex-col items-center justify-center py-28 text-center">
                <div className="w-20 h-20 rounded-full bg-zinc-100 flex items-center justify-center mb-5">
                  <Search className="w-8 h-8 text-zinc-300" />
                </div>
                <p className="font-oswald text-xl font-bold text-zinc-700 uppercase tracking-wide">No tyres found</p>
                <p className="text-sm text-zinc-400 mt-2">Try adjusting your size or removing some filters</p>
                <button
                  type="button"
                  onClick={clearAll}
                  className="mt-5 rounded-lg bg-primary px-5 py-2 text-sm font-bold text-zinc-900 hover:brightness-110 active:scale-95 transition-all"
                >
                  Clear all filters
                </button>
              </div>
            )}

            {/* Results grid */}
            {!pending && result && result.data.length > 0 && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {result.data.map(hit => (
                    <TyreCard key={hit.product_id} hit={hit} onAddToCart={handleAddToCart} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 mt-10">
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => updateFilter('page', currentPage - 1)}
                      className="rounded-xl border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                      ← Previous
                    </button>
                    <span className="text-sm font-medium text-zinc-500 min-w-[80px] text-center">
                      {currentPage} of {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={currentPage >= totalPages}
                      onClick={() => updateFilter('page', currentPage + 1)}
                      className="rounded-xl border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
