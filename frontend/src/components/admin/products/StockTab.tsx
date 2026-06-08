'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { toastSuccess, toastError } from '@/lib/toast'

type WarehouseRow = {
  stock_id:            string
  warehouse_id:        string
  warehouse_name:      string
  available:           number
  reserved:            number
  incoming:            number
  in_transit:          number
  damaged:             number
  minimum_stock_level: number
  last_purchase_price: number | null
  last_stock_update:   string | null
}

type SupplierRow = {
  supplier_id:   string
  supplier_name: string
  stock:         number
  percentage:    number
}

type StockDetail = {
  warehouses:           WarehouseRow[]
  suppliers:            SupplierRow[]
  total_supplier_stock: number
}

type LocalRow = {
  available:            number
  incoming:             number
  in_transit:           number
  damaged:              number
  minimum_stock_level:  number
}

type Props = {
  productId: string
  patternId: string
}

export default function StockTab({ productId, patternId }: Props) {
  const [data, setData]     = useState<StockDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [local, setLocal]     = useState<Record<string, LocalRow>>({})
  const [dirty, setDirty]     = useState(false)

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
      const init: Record<string, LocalRow> = {}
      json.warehouses.forEach(w => {
        init[w.warehouse_id] = {
          available:           w.available,
          incoming:            w.incoming,
          in_transit:          w.in_transit,
          damaged:             w.damaged,
          minimum_stock_level: w.minimum_stock_level,
        }
      })
      setLocal(init)
      setDirty(false)
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Failed to load stock')
    } finally {
      setLoading(false)
    }
  }, [apiBase, patternId, productId])

  useEffect(() => { fetchStock() }, [fetchStock])

  function update(warehouseId: string, field: keyof LocalRow, value: number) {
    setLocal(prev => ({ ...prev, [warehouseId]: { ...prev[warehouseId], [field]: Math.max(0, value) } }))
    setDirty(true)
  }

  async function handleSave() {
    setSaving(true)
    const snapshot = { ...local }
    const allocations = Object.entries(local).map(([warehouse_id, row]) => ({
      warehouse_id,
      ...row,
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
      setLocal(snapshot)
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
<<<<<<< Updated upstream
              <tbody className="divide-y divide-zinc-100 [&_tr:nth-child(even)]:bg-zinc-100 [&_tr:nth-child(odd)]:bg-white [&_tr:hover]:bg-amber-50 [&_tr]:transition-colors">
                {data!.suppliers.map(s => (
                  <tr key={s.supplier_id} className="even:bg-zinc-50/50 hover:bg-amber-50/40 transition-colors">
=======
              <tbody className="divide-y divide-zinc-200">
                {data!.suppliers.map(s => (
                  <tr key={s.supplier_id} className="odd:bg-white even:bg-zinc-50 hover:!bg-zinc-200 transition-colors">
>>>>>>> Stashed changes
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
          <Button type="button" size="xs" disabled={!dirty || saving} onClick={handleSave}>
            {saving && (
              <svg className="w-3.5 h-3.5 animate-spin mr-1" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            )}
            Save
          </Button>
        </div>

        {!data?.warehouses.length ? (
          <p className="rounded-lg border border-dashed border-zinc-200 py-6 text-center text-xs text-zinc-400">
            No warehouses configured
          </p>
        ) : (
          <div className="rounded-lg border border-zinc-200 overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500">Warehouse</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-zinc-500">Available</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-zinc-500">Reserved</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-zinc-500">Incoming</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-zinc-500">In Transit</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-zinc-500">Damaged</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-zinc-500">Min Level</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-zinc-500">Last Purchase ($)</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-zinc-500">Last Updated</th>
                </tr>
              </thead>
<<<<<<< Updated upstream
              <tbody className="divide-y divide-zinc-100 [&_tr:nth-child(even)]:bg-zinc-100 [&_tr:nth-child(odd)]:bg-white [&_tr:hover]:bg-amber-50 [&_tr]:transition-colors">
                {data!.warehouses.map(w => {
                  const row = local[w.warehouse_id]
                  return (
                    <tr key={w.warehouse_id} className="even:bg-zinc-50/50 hover:bg-amber-50/40 transition-colors">
=======
              <tbody className="divide-y divide-zinc-200">
                {data!.warehouses.map(w => {
                  const row = local[w.warehouse_id]
                  return (
                    <tr key={w.warehouse_id} className="odd:bg-white even:bg-zinc-50 hover:!bg-zinc-200 transition-colors">
>>>>>>> Stashed changes
                      <td className="px-4 py-2.5 text-sm text-zinc-700 font-medium">{w.warehouse_name}</td>

                      {/* Available — editable */}
                      <td className="px-4 py-2.5 text-right">
                        <StockInput
                          label={`Available for ${w.warehouse_name}`}
                          value={row?.available ?? w.available}
                          onChange={v => update(w.warehouse_id, 'available', v)}
                        />
                      </td>

                      {/* Reserved — read-only (managed by order system) */}
                      <td className="px-4 py-2.5 text-sm text-right text-zinc-500 tabular-nums">{w.reserved}</td>

                      {/* Incoming — editable */}
                      <td className="px-4 py-2.5 text-right">
                        <StockInput
                          label={`Incoming for ${w.warehouse_name}`}
                          value={row?.incoming ?? w.incoming}
                          onChange={v => update(w.warehouse_id, 'incoming', v)}
                        />
                      </td>

                      {/* In Transit — editable */}
                      <td className="px-4 py-2.5 text-right">
                        <StockInput
                          label={`In transit for ${w.warehouse_name}`}
                          value={row?.in_transit ?? w.in_transit}
                          onChange={v => update(w.warehouse_id, 'in_transit', v)}
                        />
                      </td>

                      {/* Damaged — editable */}
                      <td className="px-4 py-2.5 text-right">
                        <StockInput
                          label={`Damaged for ${w.warehouse_name}`}
                          value={row?.damaged ?? w.damaged}
                          onChange={v => update(w.warehouse_id, 'damaged', v)}
                        />
                      </td>

                      {/* Min stock level — editable */}
                      <td className="px-4 py-2.5 text-right">
                        <StockInput
                          label={`Min level for ${w.warehouse_name}`}
                          value={row?.minimum_stock_level ?? w.minimum_stock_level}
                          onChange={v => update(w.warehouse_id, 'minimum_stock_level', v)}
                        />
                      </td>

                      {/* Last Purchase Price — read-only */}
                      <td className="px-4 py-2.5 text-right text-xs text-zinc-500 tabular-nums bg-zinc-50/60">
                        {w.last_purchase_price != null ? `$${Number(w.last_purchase_price).toFixed(2)}` : '—'}
                      </td>

                      {/* Last updated — read-only */}
                      <td className="px-4 py-2.5 text-right text-xs text-zinc-400 tabular-nums whitespace-nowrap">
                        {w.last_stock_update
                          ? new Date(w.last_stock_update).toLocaleDateString()
                          : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function StockInput({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <input
      type="number"
      min={0}
      aria-label={label}
      value={value}
      onChange={e => onChange(Math.max(0, Number(e.target.value)))}
      className="w-20 rounded border border-zinc-300 px-2 py-1 text-xs text-right focus:outline-none focus:ring-2 focus:ring-primary/30 tabular-nums"
    />
  )
}

