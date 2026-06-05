'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Search } from 'lucide-react'
import { toast } from 'sonner'
import { toastError } from '@/lib/toast'
import InventoryProductRow from './InventoryProductRow'
import type { Supplier } from '@/types/admin.types'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

type StatusFilter = 'all' | 'mapped' | 'unmapped' | 'pending'

type SupplierMapping = {
  map_id:                string
  supplier_id:           string
  supplier_name:         string
  connection_type:       string
  supplier_sku:          string | null
  supplier_brand_name:   string | null
  supplier_pattern_name: string | null
  supplier_size_raw:     string | null
  supplier_price:        number | null
  supplier_stock:        number | null
  match_confidence:      number | null
  is_verified:           boolean
  synced_price:          number | null
  synced_qty:            number | null
  status:                'synced' | 'mapped' | 'pending_review'
}

type ProductRow = {
  product_id:        string
  sku:               string
  tyre_size_display: string
  brand_name:        string | null
  pattern_name:      string | null
  own_stock:         number
  supplier_mappings: SupplierMapping[]
}

interface Props {
  suppliers:   Supplier[]
  accessToken: string
}

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all',     label: 'All Products' },
  { key: 'mapped',  label: 'Mapped' },
  { key: 'pending', label: 'Pending Review' },
  { key: 'unmapped', label: 'Not Mapped' },
]

export default function InventoryInterface({ suppliers, accessToken }: Props) {
  const [rows, setRows]           = useState<ProductRow[]>([])
  const [total, setTotal]         = useState(0)
  const [page, setPage]           = useState(1)
  const [loading, setLoading]     = useState(true)
  const [status, setStatus]       = useState<StatusFilter>('all')
  const [supplierId, setSupplierId] = useState<string>('')
  const [q, setQ]                 = useState('')

  const PAGE_SIZE  = 20
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const load = useCallback(async (p: number, stat: StatusFilter, supId: string, search: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page:   String(p),
        limit:  String(PAGE_SIZE),
        status: stat,
        q:      search,
      })
      if (supId) params.set('supplier_id', supId)

      const res = await fetch(`${API}/api/admin/inventory?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) throw new Error(`API ${res.status}`)
      const body = await res.json()
      setRows(body.data ?? [])
      setTotal(body.total ?? 0)
      setPage(p)
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to load inventory')
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  // Initial load
  useEffect(() => { load(1, status, supplierId, q) }, [])

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => load(1, status, supplierId, q), 350)
    return () => clearTimeout(t)
  }, [q])

  function changeStatus(s: StatusFilter) {
    setStatus(s)
    load(1, s, supplierId, q)
  }

  function changeSupplier(id: string) {
    setSupplierId(id)
    load(1, status, id, q)
  }

  function onApproved(mapId: string) {
    toast.success('Mapping approved — stock sync queued')
    setRows(prev => prev.map(row => ({
      ...row,
      supplier_mappings: row.supplier_mappings.map(m =>
        m.map_id === mapId ? { ...m, is_verified: true, status: 'mapped' as const } : m
      ),
    })))
  }

  function onRemoved(mapId: string) {
    toast.success('Mapping removed')
    setRows(prev => prev.map(row => ({
      ...row,
      supplier_mappings: row.supplier_mappings.filter(m => m.map_id !== mapId),
    })))
  }

  return (
    <div className="space-y-4">
      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Status tabs */}
        <div className="flex gap-1 flex-wrap">
          {STATUS_TABS.map(t => (
            <button
              key={t.key}
              onClick={() => changeStatus(t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                status === t.key
                  ? 'bg-zinc-900 text-white'
                  : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Right: supplier filter + search + refresh */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Supplier filter */}
          <select
            value={supplierId}
            onChange={e => changeSupplier(e.target.value)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Suppliers</option>
            {suppliers.map(s => (
              <option key={s.supplier_id} value={s.supplier_id}>{s.supplier_name}</option>
            ))}
          </select>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
            <input
              type="search"
              placeholder="Size, SKU…"
              value={q}
              onChange={e => setQ(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg border border-zinc-200 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-40"
            />
          </div>

          <button
            onClick={() => load(page, status, supplierId, q)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Product rows ─────────────────────────────────────────── */}
      <div className="space-y-2">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-zinc-100 rounded-xl animate-pulse" />
          ))
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white py-16 text-center">
            <p className="text-sm font-medium text-zinc-700">No products found</p>
            <p className="text-xs text-zinc-400 mt-1">
              {status !== 'all'
                ? 'Try switching to "All Products"'
                : 'Add products to your catalogue first'}
            </p>
          </div>
        ) : (
          rows.map(row => (
            <InventoryProductRow
              key={row.product_id}
              row={row}
              accessToken={accessToken}
              onApproved={onApproved}
              onRemoved={onRemoved}
            />
          ))
        )}
      </div>

      {/* ── Pagination ───────────────────────────────────────────── */}
      {!loading && (
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span>Showing {rows.length} of {total} products</span>
          {totalPages > 1 && (
            <div className="flex gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => load(page - 1, status, supplierId, q)}
                className="px-2.5 py-1 rounded-lg border border-zinc-200 disabled:opacity-40 hover:bg-zinc-50"
              >
                ← Prev
              </button>
              <span className="px-2.5 py-1 text-zinc-500">{page} / {totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => load(page + 1, status, supplierId, q)}
                className="px-2.5 py-1 rounded-lg border border-zinc-200 disabled:opacity-40 hover:bg-zinc-50"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
