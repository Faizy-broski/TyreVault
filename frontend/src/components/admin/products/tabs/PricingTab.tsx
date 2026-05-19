'use client'

import { useFormContext, useWatch } from 'react-hook-form'
import type { CreateProductFormValues } from '../schema'

type Props = {
  warehouses: { warehouse_id: string; warehouse_name: string }[]
}

function calcMargin(price: number, cost: number): string {
  if (!price || !cost || cost >= price) return '—'
  return ((1 - cost / price) * 100).toFixed(2) + '%'
}

export default function PricingTab({ warehouses }: Props) {
  const { register, control, setValue } = useFormContext<CreateProductFormValues>()

  const variants = useWatch({ control, name: 'variants' }) ?? []
  const pricing  = useWatch({ control, name: 'pricing'  }) ?? []

  if (variants.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-zinc-400">
          No variants added yet. Go back to the Variants tab and add at least one variant.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-900">Pricing &amp; Inventory</h2>
          <p className="text-sm text-zinc-500 mt-0.5">
            Set prices and stock levels for each variant
          </p>
        </div>
      </div>

      <div className="border border-zinc-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50">
              {[
                'Tire Size', 'SKU', 'Price ($)', 'Compare at ($)', 'Cost', 'Margin', 'Inventory', 'Low Stock Alert'
              ].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-zinc-500 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {variants.map((variant, index) => {
              const p       = pricing[index]
              const price   = p?.priceIncGst ?? 0
              const cost    = p?.costPrice ?? 0
              const margin  = calcMargin(price, cost)
              const isGood  = margin !== '—' && parseFloat(margin) > 0

              return (
                <tr key={index} className="hover:bg-zinc-50">
                  {/* Tire Size */}
                  <td className="px-4 py-3 font-medium text-zinc-800">
                    {variant.tyreSizeDisplay || '—'}
                  </td>
                  {/* SKU */}
                  <td className="px-4 py-3 text-zinc-600 text-xs">{variant.sku || '—'}</td>

                  {/* Price */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <span className="text-zinc-400 text-xs">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        {...register(`pricing.${index}.priceIncGst`, { valueAsNumber: true })}
                        className="w-24 rounded border border-zinc-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        placeholder="0.00"
                      />
                    </div>
                  </td>

                  {/* Compare at */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <span className="text-zinc-400 text-xs">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        {...register(`pricing.${index}.compareAtPrice`, { valueAsNumber: true })}
                        className="w-24 rounded border border-zinc-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        placeholder="0.00"
                      />
                    </div>
                  </td>

                  {/* Cost */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <span className="text-zinc-400 text-xs">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        {...register(`pricing.${index}.costPrice`, { valueAsNumber: true })}
                        className="w-24 rounded border border-zinc-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        placeholder="0.00"
                      />
                    </div>
                  </td>

                  {/* Margin — calculated, read-only */}
                  <td className="px-4 py-3">
                    <span className={`text-sm font-medium ${isGood ? 'text-green-600' : 'text-zinc-400'}`}>
                      {margin}
                    </span>
                  </td>

                  {/* Inventory */}
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min="0"
                      {...register(`pricing.${index}.inventory`, { valueAsNumber: true })}
                      className="w-20 rounded border border-zinc-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="0"
                    />
                  </td>

                  {/* Low Stock Alert */}
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min="0"
                      {...register(`pricing.${index}.lowStockAlert`, { valueAsNumber: true })}
                      className="w-16 rounded border border-zinc-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="10"
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Warehouse selector for initial stock */}
      {warehouses.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="text-sm text-zinc-600">Assign inventory to warehouse:</label>
          <select
            onChange={(e) => {
              variants.forEach((_, i) => {
                setValue(`pricing.${i}.warehouseId`, e.target.value, { shouldDirty: true })
              })
            }}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          >
            <option value="">Select warehouse</option>
            {warehouses.map(w => (
              <option key={w.warehouse_id} value={w.warehouse_id}>{w.warehouse_name}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
