'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Loader2, X } from 'lucide-react'
import { toastError } from '@/lib/toast'
import { Dialog, DialogContent, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

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
      toastError(err instanceof Error ? err.message : 'Failed to map product')
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="p-0 gap-0 rounded-2xl shadow-xl ring-0 bg-white sm:max-w-md" showCloseButton={false}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
          <DialogTitle className="text-base font-semibold text-zinc-900">Manual Map</DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Close">
              <X className="w-5 h-5" />
            </Button>
          </DialogClose>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-xs text-zinc-500">
            Search for a product by SKU, size, brand, or pattern name.
          </p>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
            <Input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="e.g. 245/45R17 Michelin Pilot Sport"
              aria-label="Search products"
              className="pl-9 pr-9"
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 animate-spin" />
            )}
          </div>

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
                type="button"
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

        </div>
      </DialogContent>
    </Dialog>
  )
}
