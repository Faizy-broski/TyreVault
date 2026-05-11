'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

interface ProductResult {
  sku_id:            string
  sku:               string
  tyre_size_display: string
  brand_name:        string | null
  pattern_name:      string | null
}

interface Props {
  mapId:       string
  accessToken: string
  onClose:     () => void
  onMapped:    () => void
}

export default function ManualMapModal({ mapId, accessToken, onClose, onMapped }: Props) {
  const [query, setQuery]         = useState('')
  const [results, setResults]     = useState<ProductResult[]>([])
  const [searching, setSearching] = useState(false)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return }
    setSearching(true)
    try {
      const res = await fetch(
        `${API}/api/admin/products?q=${encodeURIComponent(q)}&limit=10`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      if (res.ok) {
        const body = await res.json()
        // Support both { data: [...] } and [...] response shapes
        setResults(Array.isArray(body) ? body : (body.data ?? []))
      }
    } catch { /* ignore */ }
    finally { setSearching(false) }
  }, [accessToken])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(query), 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, search])

  async function handleSelect(productId: string) {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`${API}/api/admin/suppliers/mappings/${mapId}/manual`, {
        method:  'PATCH',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ product_id: productId }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Failed (${res.status})`)
      }
      onMapped()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to map')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">

        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900">Manual Map</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-xs text-zinc-500">
          Search for a product by SKU, size, brand, or pattern name.
        </p>

        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="e.g. 245/45R17 Michelin Pilot Sport"
            className="w-full pl-9 pr-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400/30 focus:border-yellow-400"
          />
          {searching && (
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          )}
        </div>

        {/* Results */}
        <div className="max-h-56 overflow-y-auto divide-y divide-zinc-100 rounded-lg border border-zinc-200">
          {results.length === 0 && query.trim() && !searching && (
            <p className="px-4 py-3 text-xs text-zinc-400 text-center">No products found</p>
          )}
          {results.length === 0 && !query.trim() && (
            <p className="px-4 py-3 text-xs text-zinc-400 text-center">Start typing to search products</p>
          )}
          {results.map(r => (
            <button
              key={r.sku_id}
              disabled={saving}
              onClick={() => handleSelect(r.sku_id)}
              className="w-full flex items-start gap-3 px-4 py-2.5 text-left hover:bg-zinc-50 transition-colors disabled:opacity-50"
            >
              <div className="flex-1">
                <p className="text-xs font-medium text-zinc-900">{r.tyre_size_display}</p>
                <p className="text-xs text-zinc-500">
                  {r.brand_name ?? '—'} · {r.pattern_name ?? '—'}
                </p>
              </div>
              <span className="text-xs text-zinc-400 font-mono shrink-0">{r.sku}</span>
            </button>
          ))}
        </div>

        {error && (
          <p className="text-xs text-red-600">{error}</p>
        )}
      </div>
    </div>
  )
}
