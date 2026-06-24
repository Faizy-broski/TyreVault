'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Search, Loader2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

interface SkuSearchResult {
  product_id: string
  sku: string
  tyre_size_display: string
  status: string
  patterns: {
    pattern_name: string
    brands: { brand_name: string } | null
  } | null
}

interface ProductSearchInputProps {
  value: string // the product_id UUID stored in the form
  onChange: (productId: string) => void
  disabled?: boolean
  className?: string
  placeholder?: string
}

export function ProductSearchInput({
  value,
  onChange,
  disabled,
  className = '',
  placeholder = 'Search by SKU or name...'
}: ProductSearchInputProps) {
  const [inputText, setInputText] = useState('')
  const [results, setResults] = useState<SkuSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  // Position for the portal dropdown
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})

  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // When value is cleared externally (e.g. form reset), clear the input too
  useEffect(() => {
    if (!value) {
      setInputText('')
      setResults([])
    }
  }, [value])

  // Close on outside click — but NOT when clicking inside the portal dropdown
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      const inContainer = containerRef.current?.contains(e.target as Node)
      const inDropdown = dropdownRef.current?.contains(e.target as Node)
      if (!inContainer && !inDropdown) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  // Compute dropdown position relative to the input so the portal renders in the right spot
  function updateDropdownPosition() {
    if (!inputRef.current) return
    const rect = inputRef.current.getBoundingClientRect()
    setDropdownStyle({
      position: 'fixed',
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
    })
  }

  const search = useCallback(async (q: string) => {
    console.log('[ProductSearch] search called with:', JSON.stringify(q))
    if (!q.trim()) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { session }, error: sessionErr } = await supabase.auth.getSession()
      console.log('[ProductSearch] session ok:', !!session?.access_token, 'sessionErr:', sessionErr?.message)
      const token = session?.access_token

      const url = `${API}/api/admin/products/skus/search?q=${encodeURIComponent(q.trim())}`
      console.log('[ProductSearch] fetching:', url)

      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      console.log('[ProductSearch] response status:', res.status)

      const json = await res.json()
      console.log('[ProductSearch] raw response:', JSON.stringify(json).slice(0, 300))

      if (!res.ok) throw new Error((json as { error?: string }).error ?? `HTTP ${res.status}`)

      const arr = Array.isArray(json) ? json : []
      console.log('[ProductSearch] setting', arr.length, 'results')
      setResults(arr)
    } catch (err) {
      console.error('[ProductSearch] fetch error:', err)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setInputText(val)
    setOpen(true)
    updateDropdownPosition()

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(val), 300)
  }

  function handleFocus() {
    if (!disabled) {
      setOpen(true)
      updateDropdownPosition()
    }
  }

  function selectOption(opt: SkuSearchResult) {
    const brand = opt.patterns?.brands?.brand_name ?? ''
    const pattern = opt.patterns?.pattern_name ?? ''
    const label = [brand, pattern, opt.tyre_size_display, `(${opt.sku})`].filter(Boolean).join(' ')
    setInputText(label)
    setOpen(false)
    setResults([])
    onChange(opt.product_id)
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    setInputText('')
    setResults([])
    onChange('')
  }

  const showDropdown = open && (loading || results.length > 0 || (inputText.trim().length > 0 && !loading))

  const dropdown = showDropdown ? (
    <div ref={dropdownRef} style={dropdownStyle} className="bg-white border border-zinc-200 rounded-md shadow-xl max-h-64 overflow-y-auto">
      {loading && (
        <div className="p-3 text-sm text-center text-zinc-400">Searching…</div>
      )}
      {!loading && results.length === 0 && inputText.trim() && (
        <div className="p-3 text-sm text-center text-zinc-400">No products found for &ldquo;{inputText}&rdquo;</div>
      )}
      {!loading && results.length > 0 && (
        <ul className="py-1">
          {results.map((r) => (
            <li key={r.product_id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()} // prevent blur before click
                onClick={() => selectOption(r)}
                className="w-full text-left px-4 py-2.5 hover:bg-zinc-50 transition-colors border-b border-zinc-50 last:border-0"
              >
                <div className="flex justify-between items-center gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-zinc-900 truncate">
                      {r.patterns?.brands?.brand_name} {r.patterns?.pattern_name}
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5">{r.tyre_size_display}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-mono text-zinc-600 bg-zinc-100 px-1.5 py-0.5 rounded">{r.sku}</div>
                    {r.status !== 'active' && (
                      <span className="block mt-1 text-[10px] font-semibold text-red-600 uppercase">{r.status}</span>
                    )}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  ) : null

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-zinc-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={handleInputChange}
          onFocus={handleFocus}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="new-password"
          name={`product-search-${Math.random()}`}
          className="w-full pl-9 pr-8 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:opacity-50 transition-colors bg-white"
        />
        <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
          {loading && <Loader2 className="h-4 w-4 text-zinc-400 animate-spin" />}
          {!loading && inputText && (
            <button type="button" onClick={handleClear} className="text-zinc-400 hover:text-zinc-600">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Render dropdown in a portal to escape overflow-hidden/overflow-y-auto parents */}
      {typeof document !== 'undefined' && dropdown && createPortal(dropdown, document.body)}
    </div>
  )
}
