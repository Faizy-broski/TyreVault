'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toastError } from '@/lib/toast'
import { toast } from 'sonner'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

interface WarehouseRow {
  stock_id:            string
  warehouse_id:        string
  warehouse_name:      string
  available:           number
  last_purchase_price: number | null
}

interface Props {
  variantId:   string
  patternId:   string
  retailPrice: number | null
  priceId:     string | null
}

// Read-only pink input used for auto-synced fields
function ReadonlyField({ value }: { value: string }) {
  return (
    <input
      readOnly
      value={value}
      className="w-full rounded border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm text-zinc-600 tabular-nums"
    />
  )
}

export default function InternalStockSection({ variantId, patternId, retailPrice: initialRetailPrice, priceId }: Props) {
  const [rows, setRows]         = useState<WarehouseRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [price, setPrice]       = useState<number>(initialRetailPrice ?? 0)
  const [saving, setSaving]     = useState(false)
  const [dirty, setDirty]       = useState(false)

  const fetchStock = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { session } } = await createClient().auth.getSession()
      const tok = session?.access_token ?? ''
      const res = await fetch(
        `${API}/api/admin/products/${patternId}/variants/${variantId}/stock-detail`,
        { headers: { Authorization: `Bearer ${tok}` } }
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      // Only show own-warehouse branches
      setRows((json.warehouses ?? []).filter((w: WarehouseRow & { is_own_warehouse?: boolean }) =>
        w.is_own_warehouse !== false
      ))
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to load stock')
    } finally {
      setLoading(false)
    }
  }, [patternId, variantId])

  useEffect(() => { fetchStock() }, [fetchStock])

  async function saveRetailPrice() {
    if (!priceId) {
      toastError('No retail price record found — create a price first')
      return
    }
    setSaving(true)
    try {
      const { data: { session } } = await createClient().auth.getSession()
      const tok = session?.access_token ?? ''
      const res = await fetch(
        `${API}/api/admin/products/${patternId}/variants/${variantId}/prices/${priceId}`,
        {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
          body:    JSON.stringify({ price_inc_gst: price }),
        }
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setDirty(false)
      toast.success('Retail price updated')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to save price')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2].map(i => <div key={i} className="h-10 bg-zinc-100 rounded animate-pulse" />)}
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-200 py-6 text-center text-xs text-zinc-400">
        No internal warehouses configured
      </p>
    )
  }

  return (
    <div>
      <div className="rounded-lg border border-zinc-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-100">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500 w-40">BRANCH</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500">STOCK QTY (READ ONLY)</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500">LAST PURCHASE PRICE (READ ONLY)</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500">RETAIL PRICE ($)</th>
            </tr>
          </thead>
<<<<<<< Updated upstream
          <tbody className="divide-y divide-zinc-100">
            {rows.map(row => (
              <tr key={row.warehouse_id} className="hover:bg-zinc-50 transition-colors">
=======
          <tbody className="divide-y divide-zinc-200">
            {rows.map(row => (
              <tr key={row.warehouse_id} className="odd:bg-white even:bg-zinc-50 hover:!bg-zinc-200 transition-colors">
>>>>>>> Stashed changes
                <td className="px-4 py-3">
                  <span className="text-sm font-semibold text-teal-600">{row.warehouse_name}</span>
                </td>
                <td className="px-4 py-3">
                  <ReadonlyField value={String(row.available)} />
                </td>
                <td className="px-4 py-3">
                  <ReadonlyField value={row.last_purchase_price != null ? String(row.last_purchase_price) : '0'} />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={price}
                    onChange={e => { setPrice(parseFloat(e.target.value) || 0); setDirty(true) }}
                    className="w-full rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {dirty && (
        <div className="mt-2 flex justify-end">
          <button
            onClick={saveRetailPrice}
            disabled={saving}
            className="rounded-lg bg-blue-600 text-white text-xs font-medium px-4 py-1.5 hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Save Retail Price'}
          </button>
        </div>
      )}
    </div>
  )
}
