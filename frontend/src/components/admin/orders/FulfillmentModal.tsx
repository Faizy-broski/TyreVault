'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toastSuccess, toastError, toastWarning } from '@/lib/toast'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import type { OrderItem, OrderShipment } from '@/types/admin.types'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

interface Warehouse      { warehouse_id: string; warehouse_name: string }
interface ShippingMethod { shipping_method_id: string; method_name: string }

interface Props {
  orderId:         string
  items:           OrderItem[]
  unfulfilledQty:  Record<string, number>
  token:           string
  onClose:         () => void
  onSuccess:       (shipment: OrderShipment) => void
}

export default function FulfillmentModal({ orderId, items, unfulfilledQty, token, onClose, onSuccess }: Props) {
  const fulfillableItems = items.filter(i => (unfulfilledQty[i.order_item_id] ?? 0) > 0)

  const [warehouses,      setWarehouses]      = useState<Warehouse[]>([])
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([])
  const [warehouseId,     setWarehouseId]     = useState('')
  const [shippingMethod,  setShippingMethod]  = useState('')
  const [sendNotification, setSendNotification] = useState(true)
  const [quantities, setQuantities]           = useState<Record<string, number>>(
    Object.fromEntries(fulfillableItems.map(i => [i.order_item_id, unfulfilledQty[i.order_item_id] ?? 0]))
  )
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const authHeaders = { Authorization: `Bearer ${token}` }
    Promise.all([
      fetch(`${API}/api/admin/orders/warehouses`,       { headers: authHeaders }).then(r => r.json()).catch(() => []),
      fetch(`${API}/api/admin/orders/shipping-methods`, { headers: authHeaders }).then(r => r.json()).catch(() => []),
    ]).then(([wh, sm]) => {
      setWarehouses(Array.isArray(wh) ? wh : [])
      setShippingMethods(Array.isArray(sm) ? sm : [])
      if (wh[0]) setWarehouseId(wh[0].warehouse_id)
    })
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!warehouseId) { toastWarning('Please select a location'); return }

    const selectedItems = items
      .map(i => ({
        orderItemId: i.order_item_id,
        productId:   i.product_id,
        quantity:    quantities[i.order_item_id] ?? 0,
      }))
      .filter(i => i.quantity > 0)

    if (selectedItems.length === 0) { toastWarning('Enter at least one item quantity'); return }

    setSubmitting(true)
    try {
      const res = await fetch(`${API}/api/admin/orders/${orderId}/fulfillments`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ warehouseId, shippingMethod: shippingMethod || undefined, sendNotification, items: selectedItems }),
      })
      if (!res.ok) { const j = await res.json(); toastError(j.message ?? 'Failed to create fulfillment'); return }
      toastSuccess('Fulfillment created')
      const { shipment_id } = await res.json()
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

  const maxQty = (item: OrderItem) => unfulfilledQty[item.order_item_id] ?? 0

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent
        className="p-0 gap-0 rounded-2xl shadow-xl ring-0 bg-white sm:max-w-lg max-h-[90vh] flex flex-col"
        showCloseButton={false}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 shrink-0">
          <DialogTitle className="text-base font-semibold text-zinc-900">Fulfill Items</DialogTitle>
          <DialogClose asChild>
            <Button type="button" variant="ghost" size="icon-sm" className="text-zinc-400 hover:text-zinc-700">
              <X className="w-5 h-5" />
            </Button>
          </DialogClose>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* Location */}
            <div>
              <Label htmlFor="warehouseId" className="block text-xs font-medium text-zinc-700 mb-1.5">
                Location *
              </Label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger id="warehouseId" className="w-full rounded-lg border-zinc-300">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map(w => (
                    <SelectItem key={w.warehouse_id} value={w.warehouse_id}>
                      {w.warehouse_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Shipping method */}
            <div>
              <Label htmlFor="shippingMethod" className="block text-xs font-medium text-zinc-700 mb-1.5">
                Shipping Method
              </Label>
              <Select value={shippingMethod || '_none'} onValueChange={v => setShippingMethod(v === '_none' ? '' : v)}>
                <SelectTrigger id="shippingMethod" className="w-full rounded-lg border-zinc-300">
                  <SelectValue placeholder="None / manual" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">None / manual</SelectItem>
                  {shippingMethods.map(m => (
                    <SelectItem key={m.shipping_method_id} value={m.method_name}>
                      {m.method_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Items to fulfill */}
            <div>
              <p className="text-xs font-medium text-zinc-700 mb-2">Items to Fulfill</p>
              <div className="rounded-lg border border-zinc-200 divide-y divide-zinc-100">
                {fulfillableItems.map(item => (
                  <div key={item.order_item_id} className="flex items-center justify-between px-3 py-2.5 gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-800 truncate">
                        {item.skus?.tyre_size_display ?? '—'}
                      </p>
                      <p className="text-xs text-zinc-500 font-mono">{item.skus?.sku ?? '—'}</p>
                      <p className="text-xs text-zinc-400">Unfulfilled: {maxQty(item)}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-7 h-7 rounded-full border-zinc-300 flex items-center justify-center text-zinc-600 hover:bg-zinc-50 p-0"
                        onClick={() => setQuantities(prev => ({ ...prev, [item.order_item_id]: Math.max(0, (prev[item.order_item_id] ?? 0) - 1) }))}
                      >
                        −
                      </Button>
                      <Input
                        type="number"
                        min={0}
                        max={maxQty(item)}
                        value={quantities[item.order_item_id] ?? 0}
                        onChange={e => setQuantities(prev => ({
                          ...prev,
                          [item.order_item_id]: Math.min(maxQty(item), Math.max(0, Number(e.target.value))),
                        }))}
                        aria-label={`Quantity for ${item.skus?.sku ?? item.order_item_id}`}
                        className="w-12 text-center rounded-lg border-zinc-300"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="w-7 h-7 rounded-full border-zinc-300 flex items-center justify-center text-zinc-600 hover:bg-zinc-50 p-0"
                        onClick={() => setQuantities(prev => ({ ...prev, [item.order_item_id]: Math.min(maxQty(item), (prev[item.order_item_id] ?? 0) + 1) }))}
                      >
                        +
                      </Button>
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
                aria-label={sendNotification ? 'Disable notification' : 'Enable notification'}
                onClick={() => setSendNotification(v => !v)}
                className={`relative w-10 h-6 rounded-full transition-colors ${sendNotification ? 'bg-primary' : 'bg-zinc-300'}`}
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${sendNotification ? 'translate-x-5' : 'translate-x-1'}`} />
              </button>
            </div>

          </div>

          <div className="flex justify-end gap-3 px-6 py-4 border-t border-zinc-200 shrink-0">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="rounded-lg border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-primary px-4 py-2 text-sm text-zinc-900 hover:bg-primary/90"
            >
              {submitting ? 'Creating...' : 'Create fulfillment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
