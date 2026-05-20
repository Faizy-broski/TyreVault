'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { toastSuccess, toastError } from '@/lib/toast'

type WarehouseRow = {
  warehouse_id: string
  warehouse_name: string
  available: number
  reserved: number
}

type SupplierRow = {
  supplier_id: string
  supplier_name: string
  stock: number
  percentage: number
}

type StockDetail = {
  warehouses: WarehouseRow[]
  suppliers: SupplierRow[]
  total_supplier_stock: number
}

type Props = {
  productId: string
  patternId: string
}

export default function StockTab({ productId, patternId }: Props) {
  const [data, setData] = useState<StockDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Local editable copies of warehouse available stock
  const [localAvailable, setLocalAvailable] = useState<Record<string, number>>({})
  const [dirty, setDirty] = useState(false)

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

  const fetchStock = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { session } } = await createClient().auth.getSession()
      const tok = session?.access_token ?? ''
      const res = await fetch(`${apiBase}/api/admin/products/${patternId}/variants/${productId}/stock-detail`, {
        headers: { Authorization: `Bearer ${tok}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: StockDetail = await res.json()
      setData(json)
      const initial: Record<string, number> = {}
      json.warehouses.forEach(w => { initial[w.warehouse_id] = w.available })
      setLocalAvailable(initial)
      setDirty(false)
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Failed to load stock')
    } finally {
      setLoading(false)
    }
  }, [apiBase, patternId, productId])

  useEffect(() => { fetchStock() }, [fetchStock])

  function handleAvailableChange(warehouseId: string, value: number) {
    setLocalAvailable(prev => ({ ...prev, [warehouseId]: value }))
    setDirty(true)
  }

  async function handleSave() {
    setSaving(true)
    const snapshot = { ...localAvailable }
    const allocations = Object.entries(localAvailable).map(([warehouse_id, available]) => ({
      warehouse_id,
      available,
    }))
    try {
      const { data: { session } } = await createClient().auth.getSession()
      const tok = session?.access_token ?? ''
      const res = await fetch(`${apiBase}/api/admin/products/${patternId}/variants/${productId}/stock-detail`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify(allocations),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setDirty(false)
      toastSuccess('Stock updated successfully')
      await fetchStock()
    } catch (e) {
      setLocalAvailable(snapshot)
      toastError(e instanceof Error ? e.message : 'Failed to save stock')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-zinc-400">
        Loading stock...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Section 1: Supplier Contributions (read-only) ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-zinc-800">Supplier Stock Breakdown</h3>
          <span className="text-xs text-zinc-500">
            {data?.total_supplier_stock ?? 0} units expected
            {(data?.suppliers?.length ?? 0) > 0 && ` across ${data!.suppliers.length} supplier${data!.suppliers.length > 1 ? 's' : ''}`}
          </span>
        </div>

        {!data?.suppliers.length ? (
          <p className="rounded-lg border border-dashed border-zinc-200 py-6 text-center text-xs text-zinc-400">
            No supplier mappings approved yet
          </p>
        ) : (
          <div className="rounded-lg border border-zinc-200 overflow-x-auto">
            <table className="w-full text-sm min-w-64">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500">Supplier</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-zinc-500">Units</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-zinc-500">% of Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {data!.suppliers.map(s => (
                  <tr key={s.supplier_id} className="hover:bg-zinc-50">
                    <td className="px-4 py-2.5 text-sm text-zinc-700">{s.supplier_name}</td>
                    <td className="px-4 py-2.5 text-sm text-right text-zinc-700 tabular-nums">{s.stock}</td>
                    <td className="px-4 py-2.5 text-sm text-right text-zinc-500 tabular-nums">{s.percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Section 2: Warehouse Distribution (editable) ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-zinc-800">Warehouse Stock Allocation</h3>
          <Button
            type="button"
            size="xs"
            disabled={!dirty || saving}
            onClick={handleSave}
          >
            {saving ? (
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            ) : null}
            Save
          </Button>
        </div>

        {!data?.warehouses.length ? (
          <p className="rounded-lg border border-dashed border-zinc-200 py-6 text-center text-xs text-zinc-400">
            No warehouses configured
          </p>
        ) : (
          <div className="rounded-lg border border-zinc-200 overflow-x-auto">
            <table className="w-full text-sm min-w-64">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500">Warehouse</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-zinc-500">Available</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-zinc-500">Reserved</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {data!.warehouses.map(w => (
                  <tr key={w.warehouse_id} className="hover:bg-zinc-50">
                    <td className="px-4 py-2.5 text-sm text-zinc-700">{w.warehouse_name}</td>
                    <td className="px-4 py-2.5 text-right">
                      <input
                        type="number"
                        min={0}
                        aria-label={`Available stock for ${w.warehouse_name}`}
                        value={localAvailable[w.warehouse_id] ?? w.available}
                        onChange={e => handleAvailableChange(w.warehouse_id, Math.max(0, Number(e.target.value)))}
                        className="w-20 rounded border border-zinc-300 px-2 py-1 text-xs text-right focus:outline-none focus:ring-2 focus:ring-primary/30 tabular-nums"
                      />
                    </td>
                    <td className="px-4 py-2.5 text-sm text-right text-zinc-500 tabular-nums">{w.reserved}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
