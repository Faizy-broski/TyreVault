'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { OrderShipment } from '@/types/admin.types'
import { toastSuccess, toastError } from '@/lib/toast'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

interface Props {
  orderId:   string
  shipment:  OrderShipment
  token:     string
  onClose:   () => void
  onSuccess: (shipmentId: string, trackingNumber?: string, trackingUri?: string) => void
}

export default function MarkShippedModal({ orderId, shipment, token, onClose, onSuccess }: Props) {
  const [trackingNumber,   setTrackingNumber]   = useState('')
  const [trackingUri,      setTrackingUri]      = useState('')
  const [sendNotification, setSendNotification] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch(
        `${API}/api/admin/orders/${orderId}/shipments/${shipment.shipment_id}/shipped`,
        {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            trackingNumber:   trackingNumber  || undefined,
            trackingUri:      trackingUri     || undefined,
            sendNotification,
          }),
        }
      )
      if (!res.ok) { const j = await res.json(); toastError(j.message ?? 'Failed to mark as shipped'); return }
      toastSuccess('Shipment marked as shipped')
      onSuccess(shipment.shipment_id, trackingNumber || undefined, trackingUri || undefined)
    } finally { setSubmitting(false) }
  }

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="p-0 gap-0 rounded-2xl shadow-xl ring-0 bg-white sm:max-w-md" showCloseButton={false}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
          <DialogTitle className="text-base font-semibold text-zinc-900">Mark as Shipped</DialogTitle>
          <DialogClose asChild>
            <Button type="button" variant="ghost" size="icon-sm" className="text-zinc-400 hover:text-zinc-700">
              <X className="w-5 h-5" />
            </Button>
          </DialogClose>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="px-6 py-5 space-y-5">
            <p className="text-sm text-zinc-500">
              Shipment #{shipment.shipment_number}
              {shipment.warehouses && <> · {shipment.warehouses.warehouse_name}</>}
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="trackingNumber" className="block text-xs font-medium text-zinc-700 mb-1.5">
                  Tracking Number
                </Label>
                <Input
                  id="trackingNumber"
                  type="text"
                  value={trackingNumber}
                  onChange={e => setTrackingNumber(e.target.value)}
                  placeholder="e.g. 1Z999AA1..."
                  className="rounded-lg border-zinc-300 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <Label htmlFor="trackingUri" className="block text-xs font-medium text-zinc-700 mb-1.5">
                  Tracking URL
                </Label>
                <Input
                  id="trackingUri"
                  type="url"
                  value={trackingUri}
                  onChange={e => setTrackingUri(e.target.value)}
                  placeholder="https://track.carrier.com/..."
                  className="rounded-lg border-zinc-300 focus:ring-primary/30 focus:border-primary"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-800">Send notification</p>
                <p className="text-xs text-zinc-500">Notify customer with tracking info</p>
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

          <div className="flex justify-end gap-3 px-6 py-4 border-t border-zinc-200">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="rounded-lg border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
            >
              {submitting ? 'Marking...' : 'Mark as shipped'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
