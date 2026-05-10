'use client'

import { useEffect, useRef, useState } from 'react'
import type { OrderItem, OrderShipment } from '@/types/admin.types'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

interface Warehouse      { warehouse_id: string; warehouse_name: string }
interface ShippingMethod { shipping_method_id: string; method_name: string }

interface Props {
  orderId: string
  items:   OrderItem[]
  onClose: () => void
  onSuccess: (shipment: OrderShipment) => void
}

export default function FulfillmentModal({ orderId, items, onClose, onSuccess }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null)

  const [warehouses,      setWarehouses]      = useState<Warehouse[]>([])
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([])
  const [warehouseId,     setWarehouseId]     = useState('')
  const [shippingMethod,  setShippingMethod]  = useState('')
  const [sendNotification, setSendNotification] = useState(true)
  const [quantities, setQuantities]           = useState<Record<string, number>>(
    Object.fromEntries(items.map(i => [i.order_item_id, i.quantity - (i.fulfilled_quantity ?? 0)]))
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState('')

  // Load dropdowns
  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/admin/orders/warehouses`).then(r => r.json()).catch(() => []),
      fetch(`${API}/api/admin/orders/shipping-methods`).then(r => r.json()).catch(() => []),
    ]).then(([wh, sm]) => {
      setWarehouses(wh)
      setShippingMethods(sm)
      if (wh[0]) setWarehouseId(wh[0].warehouse_id)
    })
  }, [])

  // Close on overlay click / Escape
  function handleOverlay(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose()
  }
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!warehouseId) { setError('Please select a location.'); return }

    const selectedItems = items
      .map(i => ({
        orderItemId: i.order_item_id,
        productId:   i.product_id,
        quantity:    quantities[i.order_item_id] ?? 0,
      }))
      .filter(i => i.quantity > 0)

    if (selectedItems.length === 0) { setError('Enter at least one item quantity.'); return }

    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(`${API}/api/admin/orders/${orderId}/fulfillments`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ warehouseId, shippingMethod: shippingMethod || undefined, sendNotification, items: selectedItems }),
      })
      if (!res.ok) { const j = await res.json(); setError(j.message ?? 'Failed to create fulfillment.'); return }
      const { shipment_id } = await res.json()
      // Return a partial shipment to update local state (full refetch would require router.refresh)
      const newShipment: OrderShipment = {
        shipment_id,
        order_id:       orderId,
        warehouse_id:   warehouseId,
        shipment_number: 0,
        status:          'awaiting_shipping',
        tracking_number: null,
        tracking_uri:    null,
        shipping_method: shippingMethod || null,
        created_at:      new Date().toISOString(),
        shipped_at:      null,
        delivered_at:    null,
        warehouses:      warehouses.find(w => w.warehouse_id === warehouseId)
          ? { warehouse_name: warehouses.find(w => w.warehouse_id === warehouseId)!.warehouse_name }
          : null,
        order_shipment_items: selectedItems.map(si => ({
          id:           '',
          order_item_id: si.orderItemId,
          product_id:   si.productId,
          quantity:     si.quantity,
          skus: items.find(i => i.order_item_id === si.orderItemId)?.skus ?? null,
        })),
      }
      onSuccess(newShipment)
    } finally { setSubmitting(false) }
  }

  const maxQty = (item: OrderItem) => item.quantity - (item.fulfilled_quantity ?? 0)

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlay}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 shrink-0">
          <h2 className="text-base font-semibold text-zinc-900">Fulfill Items</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Location */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1.5">Location *</label>
            <select
              value={warehouseId}
              onChange={e => setWarehouseId(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/20 focus:border-zinc-500"
            >
              <option value="">Select location</option>
              {warehouses.map(w => (
                <option key={w.warehouse_id} value={w.warehouse_id}>{w.warehouse_name}</option>
              ))}
            </select>
          </div>

          {/* Shipping method */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1.5">Shipping Method</label>
            <select
              value={shippingMethod}
              onChange={e => setShippingMethod(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/20 focus:border-zinc-500"
            >
              <option value="">None / manual</option>
              {shippingMethods.map(m => (
                <option key={m.shipping_method_id} value={m.method_name}>{m.method_name}</option>
              ))}
            </select>
          </div>

          {/* Items to fulfill */}
          <div>
            <p className="text-xs font-medium text-zinc-700 mb-2">Items to Fulfill</p>
            <div className="rounded-lg border border-zinc-200 divide-y divide-zinc-100">
              {items.map(item => (
                <div key={item.order_item_id} className="flex items-center justify-between px-3 py-2.5 gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-800 truncate">
                      {item.skus?.tyre_size_display ?? '—'}
                    </p>
                    <p className="text-xs text-zinc-500 font-mono">{item.skus?.sku ?? '—'}</p>
                    <p className="text-xs text-zinc-400">Available: {maxQty(item)}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setQuantities(prev => ({ ...prev, [item.order_item_id]: Math.max(0, (prev[item.order_item_id] ?? 0) - 1) }))}
                      className="w-7 h-7 rounded-full border border-zinc-300 flex items-center justify-center text-zinc-600 hover:bg-zinc-50 transition-colors"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={0}
                      max={maxQty(item)}
                      value={quantities[item.order_item_id] ?? 0}
                      onChange={e => setQuantities(prev => ({
                        ...prev,
                        [item.order_item_id]: Math.min(maxQty(item), Math.max(0, Number(e.target.value))),
                      }))}
                      className="w-12 text-center text-sm border border-zinc-300 rounded-lg py-1 focus:outline-none focus:ring-2 focus:ring-zinc-500/20"
                    />
                    <button
                      type="button"
                      onClick={() => setQuantities(prev => ({ ...prev, [item.order_item_id]: Math.min(maxQty(item), (prev[item.order_item_id] ?? 0) + 1) }))}
                      className="w-7 h-7 rounded-full border border-zinc-300 flex items-center justify-center text-zinc-600 hover:bg-zinc-50 transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notification toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-800">Send notification</p>
              <p className="text-xs text-zinc-500">Notify customer when fulfilled</p>
            </div>
            <button
              type="button"
              onClick={() => setSendNotification(v => !v)}
              className={`relative w-10 h-6 rounded-full transition-colors ${sendNotification ? 'bg-zinc-900' : 'bg-zinc-300'}`}
            >
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${sendNotification ? 'translate-x-5' : 'translate-x-1'}`} />
            </button>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-zinc-200 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={e => handleSubmit(e as unknown as React.FormEvent)}
            disabled={submitting}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create fulfillment'}
          </button>
        </div>
      </div>
    </div>
  )
}
