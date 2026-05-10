'use client'

import { useEffect, useRef, useState } from 'react'
import type { OrderShipment } from '@/types/admin.types'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

interface Props {
  orderId:  string
  shipment: OrderShipment
  onClose:  () => void
  onSuccess: (shipmentId: string, trackingNumber?: string, trackingUri?: string) => void
}

export default function MarkShippedModal({ orderId, shipment, onClose, onSuccess }: Props) {
  const overlayRef      = useRef<HTMLDivElement>(null)
  const [trackingNumber,   setTrackingNumber]   = useState('')
  const [trackingUri,      setTrackingUri]      = useState('')
  const [sendNotification, setSendNotification] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState('')

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
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(
        `${API}/api/admin/orders/${orderId}/shipments/${shipment.shipment_id}/shipped`,
        {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            trackingNumber:   trackingNumber  || undefined,
            trackingUri:      trackingUri     || undefined,
            sendNotification,
          }),
        }
      )
      if (!res.ok) { const j = await res.json(); setError(j.message ?? 'Failed to mark as shipped.'); return }
      onSuccess(shipment.shipment_id, trackingNumber || undefined, trackingUri || undefined)
    } finally { setSubmitting(false) }
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlay}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
          <h2 className="text-base font-semibold text-zinc-900">Mark as Shipped</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          <p className="text-sm text-zinc-500">
            Shipment #{shipment.shipment_number}
            {shipment.warehouses && <> · {shipment.warehouses.warehouse_name}</>}
          </p>

          {/* Tracking fields side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">Tracking Number</label>
              <input
                type="text"
                value={trackingNumber}
                onChange={e => setTrackingNumber(e.target.value)}
                placeholder="e.g. 1Z999AA1..."
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/20 focus:border-zinc-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">Tracking URL</label>
              <input
                type="url"
                value={trackingUri}
                onChange={e => setTrackingUri(e.target.value)}
                placeholder="https://track.carrier.com/..."
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/20 focus:border-zinc-500"
              />
            </div>
          </div>

          {/* Notification toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-800">Send notification</p>
              <p className="text-xs text-zinc-500">Notify customer with tracking info</p>
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
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-zinc-200">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Marking...' : 'Mark as shipped'}
          </button>
        </div>
      </div>
    </div>
  )
}
