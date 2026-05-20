'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Copy, ChevronRight, MoreVertical } from 'lucide-react'
import type {
  OrderDetail, OrderItem, OrderShipment,
  PaymentStatus, OrderStatus, ShipmentStatus,
} from '@/types/admin.types'
import FulfillmentModal from './FulfillmentModal'
import MarkShippedModal from './MarkShippedModal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toastSuccess, toastError } from '@/lib/toast'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(d: string) {
  return new Date(d).toLocaleString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtRelative(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins} minute${mins > 1 ? 's' : ''} ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)   return `${hrs} hour${hrs > 1 ? 's' : ''} ago`
  return fmtDate(d)
}

function fmtCurrency(amount: number | null | undefined, currency = 'AUD') {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency }).format(amount ?? 0)
}

// ── Status dropdown ────────────────────────────────────────────────────────

type StatusOption = { value: string; label: string; cls: string }

function StatusDropdown({
  label, value, options, onChange, loading,
}: {
  label:    string
  value:    string
  options:  StatusOption[]
  onChange: (val: string) => void
  loading:  boolean
}) {
  const current = options.find(o => o.value === value) ?? options[0]
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-zinc-400">{label}</span>
      <Select value={value} onValueChange={onChange} disabled={loading}>
        <SelectTrigger className={`rounded-lg border px-3 py-1.5 text-sm font-medium h-auto w-auto ${current?.cls ?? 'border-zinc-300 bg-white text-zinc-700'}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(o => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

const PAYMENT_OPTIONS: StatusOption[] = [
  { value: 'unpaid',         label: 'Unpaid',   cls: 'border-amber-200 bg-amber-50 text-amber-700' },
  { value: 'paid',           label: 'Paid',     cls: 'border-green-200 bg-green-50 text-green-700' },
  { value: 'partially_paid', label: 'Partial',  cls: 'border-blue-200 bg-blue-50 text-blue-700' },
  { value: 'refunded',       label: 'Refunded', cls: 'border-zinc-200 bg-zinc-100 text-zinc-600' },
]

const ORDER_STATUS_OPTIONS: StatusOption[] = [
  { value: 'pending',    label: 'Pending',    cls: 'border-zinc-200 bg-zinc-100 text-zinc-600' },
  { value: 'paid',       label: 'Paid',       cls: 'border-blue-200 bg-blue-50 text-blue-700' },
  { value: 'processing', label: 'Processing', cls: 'border-amber-200 bg-amber-50 text-amber-700' },
  { value: 'fulfilled',  label: 'Fulfilled',  cls: 'border-green-200 bg-green-50 text-green-700' },
  { value: 'cancelled',  label: 'Cancelled',  cls: 'border-red-200 bg-red-50 text-red-700' },
  { value: 'refunded',   label: 'Refunded',   cls: 'border-zinc-200 bg-zinc-100 text-zinc-600' },
]

function deriveOrderStatus(orderStatus: string) {
  if (orderStatus === 'fulfilled')  return { value: 'complete',    label: 'Complete',          cls: 'border-green-200 bg-green-50 text-green-700' }
  if (orderStatus === 'processing') return { value: 'in_progress', label: 'In Progress',       cls: 'border-amber-200 bg-amber-50 text-amber-700' }
  if (orderStatus === 'unpaid' || orderStatus === 'pending') return { value: 'awaiting', label: 'Awaiting Payment', cls: 'border-amber-200 bg-amber-50 text-amber-700' }
  if (orderStatus === 'cancelled')  return { value: 'cancelled',   label: 'Cancelled',         cls: 'border-red-200 bg-red-50 text-red-700' }
  return { value: 'in_progress', label: 'In Progress', cls: 'border-amber-200 bg-amber-50 text-amber-700' }
}

// ── Fitment progress stepper ────────────────────────────────────────────────

const FITMENT_STEPS = [
  'Booking Created',
  'Customer Notified',
  'Tyres Dispatched',
  'Arrived at Center',
  'Fitment Complete',
]

function fitmentStepsDone(status: string | undefined) {
  switch (status) {
    case 'pending':     return 1
    case 'assigned':    return 1
    case 'accepted':    return 2
    case 'in_progress': return 2
    case 'completed':   return 5
    case 'cancelled':   return 0
    default:            return 1
  }
}

function FitmentProgressBar({ status }: { status: string | undefined }) {
  const done      = fitmentStepsDone(status)
  const cancelled = status === 'cancelled'

  return (
    <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-5">
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-4">Fitment Progress</p>
      <div className="flex items-center">
        {FITMENT_STEPS.map((step, idx) => {
          const stepNum  = idx + 1
          const complete = !cancelled && stepNum <= done
          const isLast   = idx === FITMENT_STEPS.length - 1
          return (
            <div key={step} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div className={`w-4 h-4 rounded-full border-2 shrink-0 ${
                  cancelled   ? 'border-zinc-300 bg-white' :
                  complete    ? 'border-green-500 bg-green-500' :
                               'border-zinc-300 bg-white'
                }`} />
                <p className={`mt-2 text-xs text-center whitespace-nowrap ${complete ? 'text-zinc-700 font-medium' : 'text-zinc-400'}`}>
                  {step}
                </p>
              </div>
              {!isLast && (
                <div className={`h-0.5 flex-1 mx-2 mb-5 ${!cancelled && stepNum < done ? 'bg-green-500' : 'bg-zinc-200'}`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Unfulfilled items ──────────────────────────────────────────────────────

function UnfulfilledItems({
  items, unfulfilledQty, onFulfill,
}: {
  items: OrderItem[]
  unfulfilledQty: Record<string, number>
  onFulfill: () => void
}) {
  const unfulfilled = items.filter(i => (unfulfilledQty[i.order_item_id] ?? 0) > 0)
  if (unfulfilled.length === 0) return null
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-amber-800">Unfulfilled Items</p>
        <Button
          type="button"
          onClick={onFulfill}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-primary/90 h-auto"
        >
          Fulfill items
        </Button>
      </div>
      <Table className="w-full text-sm">
        <TableHeader>
          <TableRow className="border-b border-amber-200 hover:bg-transparent">
            {['SKU', 'Size', 'Unfulfilled'].map(h => (
              <TableHead key={h} className="pb-2 text-left text-xs font-medium text-amber-700 h-auto px-0 py-2">{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-amber-100">
          {unfulfilled.map(item => (
            <TableRow key={item.order_item_id} className="hover:bg-transparent border-amber-100">
              <TableCell className="py-2 font-mono text-xs text-zinc-600 px-0">{item.skus?.sku ?? '—'}</TableCell>
              <TableCell className="py-2 text-zinc-700 text-xs px-0">{item.skus?.tyre_size_display ?? '—'}</TableCell>
              <TableCell className="py-2 text-zinc-600 px-0">{unfulfilledQty[item.order_item_id] ?? 0}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

// ── Shipment card ─────────────────────────────────────────────────────────

function ShipmentCard({ shipment, orderId, onMarkShipped, onMarkDelivered, token }: {
  shipment: OrderShipment; orderId: string
  onMarkShipped: (s: OrderShipment) => void
  onMarkDelivered: (id: string) => void
  token: string
}) {
  const [delivering, setDelivering] = useState(false)

  async function handleDeliver() {
    setDelivering(true)
    try {
      const res = await fetch(
        `${API}/api/admin/orders/${orderId}/shipments/${shipment.shipment_id}/delivered`,
        { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: '{}' }
      )
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Failed to mark delivered (${res.status})`)
      }
      toastSuccess('Shipment marked as delivered')
      onMarkDelivered(shipment.shipment_id)
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : 'Failed to mark as delivered')
    } finally { setDelivering(false) }
  }

  const statusCls: Record<ShipmentStatus, string> = {
    awaiting_shipping: 'bg-amber-50 text-amber-700 border-amber-200',
    shipped:           'bg-indigo-50 text-indigo-700 border-indigo-200',
    delivered:         'bg-green-50 text-green-700 border-green-200',
    cancelled:         'bg-zinc-100 text-zinc-600 border-zinc-200',
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-100">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-zinc-900">Shipment #{shipment.shipment_number}</span>
          <Badge
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium h-auto ${statusCls[shipment.status] ?? 'bg-zinc-100 text-zinc-600 border-zinc-200'}`}
          >
            {shipment.status.replace(/_/g, ' ')}
          </Badge>
          {shipment.warehouses && <span className="text-xs text-zinc-500">{shipment.warehouses.warehouse_name}</span>}
        </div>
        <div className="flex gap-2">
          {shipment.status === 'awaiting_shipping' && (
            <Button
              type="button"
              onClick={() => onMarkShipped(shipment)}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 h-auto"
            >
              Mark as shipped
            </Button>
          )}
          {shipment.status === 'shipped' && (
            <Button
              type="button"
              onClick={handleDeliver}
              disabled={delivering}
              className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 h-auto"
            >
              {delivering ? 'Marking...' : 'Mark as delivered'}
            </Button>
          )}
        </div>
      </div>
      <div className="p-4 space-y-3">
        {shipment.order_shipment_items.length > 0 && (
          <div className="rounded-lg border border-zinc-100 divide-y divide-zinc-100">
            {shipment.order_shipment_items.map(item => (
              <div key={item.id || item.order_item_id} className="flex items-center justify-between px-3 py-2">
                <div>
                  <p className="text-xs font-medium text-zinc-800">{item.skus?.tyre_size_display ?? '—'}</p>
                  {item.skus?.sku && <p className="text-xs text-zinc-400 font-mono">{item.skus.sku}</p>}
                </div>
                <span className="text-xs text-zinc-500">{item.quantity}×</span>
              </div>
            ))}
          </div>
        )}
        {(shipment.tracking_number || shipment.shipped_at) && (
          <div className="flex gap-6 text-xs text-zinc-500">
            {shipment.tracking_number && (
              <span>
                Tracking:{' '}
                {shipment.tracking_uri
                  ? <a href={shipment.tracking_uri} target="_blank" rel="noopener noreferrer" className="font-mono text-primary hover:underline">{shipment.tracking_number}</a>
                  : <span className="font-mono text-zinc-700">{shipment.tracking_number}</span>
                }
              </span>
            )}
            {shipment.shipped_at && <span>Shipped {fmtDate(shipment.shipped_at)}</span>}
            {shipment.delivered_at && <span>Delivered {fmtDate(shipment.delivered_at)}</span>}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export default function OrderDetailClient({
  order: initialOrder, accessToken,
}: {
  order: OrderDetail; accessToken: string
}) {
  const router      = useRouter()
  const searchParams = useSearchParams()
  const pathname    = usePathname()

  const [order, setOrder]             = useState<OrderDetail>(initialOrder)
  const [statusSaving, setStatusSaving] = useState(false)

  const [notesValue,   setNotesValue]   = useState(initialOrder.notes ?? '')
  const [notesDirty,   setNotesDirty]   = useState(false)
  const [notesSaving,  setNotesSaving]  = useState(false)

  const modal       = searchParams.get('modal')
  const shipmentIdParam = searchParams.get('shipment')

  const showFulfill = modal === 'fulfill'
  const shipToMark  = modal === 'shipped' && shipmentIdParam
    ? order.order_shipments.find(s => s.shipment_id === shipmentIdParam) ?? null
    : null

  function closeModal() { router.replace(pathname) }

  async function patchStatus(patch: { paymentStatus?: string; orderStatus?: string }) {
    setStatusSaving(true)
    try {
      const res = await fetch(`${API}/api/admin/orders/${order.order_id}/status`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body:    JSON.stringify({ paymentStatus: patch.paymentStatus, fulfillmentStatus: patch.orderStatus }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Status update failed (${res.status})`)
      }
      if (patch.paymentStatus) setOrder(p => ({ ...p, payment_status: patch.paymentStatus as PaymentStatus }))
      if (patch.orderStatus)   setOrder(p => ({ ...p, order_status:   patch.orderStatus   as OrderStatus }))
      toastSuccess('Status updated')
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : 'Failed to update status')
    } finally { setStatusSaving(false) }
  }

  function handleMarkDelivered(shipmentId: string) {
    setOrder(prev => ({
      ...prev,
      order_shipments: prev.order_shipments.map(s =>
        s.shipment_id === shipmentId
          ? { ...s, status: 'delivered' as ShipmentStatus, delivered_at: new Date().toISOString() }
          : s
      ),
      order_status: 'fulfilled' as OrderStatus,
    }))
  }

  async function saveNotes() {
    setNotesSaving(true)
    try {
      const res = await fetch(`${API}/api/admin/orders/${order.order_id}/status`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body:    JSON.stringify({ notes: notesValue }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Failed to save notes')
      }
      setOrder(p => ({ ...p, notes: notesValue }))
      setNotesDirty(false)
      toastSuccess('Notes saved')
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : 'Failed to save notes')
    } finally { setNotesSaving(false) }
  }

  // Compute unfulfilled qty per order_item_id
  const fulfilledQtyMap = new Map<string, number>()
  for (const shipment of order.order_shipments) {
    if (shipment.status === 'cancelled') continue
    for (const si of shipment.order_shipment_items) {
      fulfilledQtyMap.set(si.order_item_id, (fulfilledQtyMap.get(si.order_item_id) ?? 0) + si.quantity)
    }
  }
  const unfulfilledQty: Record<string, number> = Object.fromEntries(
    order.order_items.map(item => [
      item.order_item_id,
      Math.max(0, item.quantity - (fulfilledQtyMap.get(item.order_item_id) ?? 0)),
    ])
  )

  const c       = order.customers
  const addr    = order.shipping_address_snapshot
  const billing = order.billing_address_snapshot
  const isFitment   = !!order.fitment_id
  const orderStatus = deriveOrderStatus(order.order_status)

  const fullName = c ? [c.first_name, c.last_name].filter(Boolean).join(' ') || c.email : '—'

  function copyOrderNumber() {
    navigator.clipboard.writeText(order.order_number)
  }

  return (
    <div>
      {/* Order header */}
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <h1 className="text-xl font-bold text-zinc-900">#{order.order_number}</h1>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={copyOrderNumber}
              title="Copy order number"
              className="text-zinc-400 hover:text-zinc-600"
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-zinc-500">{fmt(order.created_at)}</p>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <StatusDropdown
            label="Payment Status"
            value={order.payment_status}
            options={PAYMENT_OPTIONS}
            onChange={val => patchStatus({ paymentStatus: val })}
            loading={statusSaving}
          />
          <StatusDropdown
            label="Order Status"
            value={order.order_status}
            options={ORDER_STATUS_OPTIONS}
            onChange={val => patchStatus({ orderStatus: val })}
            loading={statusSaving}
          />
          <div className="flex flex-col gap-1">
            <span className="text-xs text-zinc-400">Order Status</span>
            <Badge className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-medium h-auto ${orderStatus.cls}`}>
              {orderStatus.label}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── Main content ────────────────────────────────────────────── */}
        <div className="space-y-5 lg:col-span-2">

          {/* Order Summary */}
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
              <h2 className="text-sm font-semibold text-zinc-900">Order Summary</h2>
              <Button type="button" variant="ghost" size="icon-sm" className="text-zinc-400 hover:text-zinc-700">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </div>

            <div className="overflow-x-auto">
              <Table className="w-full text-sm">
                <TableHeader>
                  <TableRow className="border-b border-zinc-100 bg-zinc-50 hover:bg-zinc-50">
                    {['Name', 'SKU', 'Quantity', 'Price', 'VAT', 'Order Total'].map(h => (
                      <TableHead key={h} className={`px-4 py-3 text-xs font-medium text-zinc-500 ${h === 'Order Total' ? 'text-right' : 'text-left'}`}>
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-zinc-100">
                  {order.order_items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="px-4 py-6 text-center text-sm text-zinc-400">No items.</TableCell>
                    </TableRow>
                  ) : (
                    order.order_items.map(item => {
                      const lineTotal = item.quantity * item.unit_price
                      return (
                        <TableRow key={item.order_item_id} className="hover:bg-zinc-50">
                          <TableCell className="px-4 py-3 text-zinc-800 font-medium">{item.skus?.tyre_size_display ?? 'Product'}</TableCell>
                          <TableCell className="px-4 py-3 font-mono text-xs text-zinc-500">#{item.skus?.sku ?? '—'}</TableCell>
                          <TableCell className="px-4 py-3 text-zinc-600">{item.quantity}x</TableCell>
                          <TableCell className="px-4 py-3 text-zinc-700">{fmtCurrency(item.unit_price, order.currency)}</TableCell>
                          <TableCell className="px-4 py-3 text-zinc-500">{fmtCurrency(lineTotal * 0.1, order.currency)}</TableCell>
                          <TableCell className="px-4 py-3 text-right font-medium text-zinc-900">{fmtCurrency(lineTotal, order.currency)}</TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="px-5 py-4 border-t border-zinc-100 space-y-2">
              <div className="flex justify-between text-sm text-zinc-500">
                <span>Item Subtotal</span>
                <span>{fmtCurrency(order.order_items.reduce((s, i) => s + i.quantity * i.unit_price, 0), order.currency)}</span>
              </div>
              <div className="flex justify-between text-sm text-zinc-500">
                <span className="flex items-center gap-1">
                  Shipping
                  <ChevronRight className="w-3 h-3" />
                </span>
                <span>{fmtCurrency(order.shipping_cost, order.currency)}</span>
              </div>
              <div className="flex justify-between text-sm text-zinc-500">
                <span>GST</span>
                <span>{fmtCurrency(order.gst_amount, order.currency)}</span>
              </div>
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-sm text-red-600">
                  <span>Discount</span>
                  <span>−{fmtCurrency(order.discount_amount, order.currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-semibold text-zinc-900 border-t border-zinc-100 pt-2">
                <span>Order Total</span>
                <span>{fmtCurrency(order.total_amount, order.currency)}</span>
              </div>
            </div>
          </div>

          {/* Unfulfilled items */}
          <UnfulfilledItems
            items={order.order_items}
            unfulfilledQty={unfulfilledQty}
            onFulfill={() => router.push(`${pathname}?modal=fulfill`)}
          />

          {/* Delivery Type section */}
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
              <h2 className="text-sm font-semibold text-zinc-900">Delivery Type</h2>
              {isFitment ? (
                <Badge className="rounded-lg bg-primary text-zinc-900 px-3 py-1 text-xs font-medium h-auto">
                  Fitment Center {order.fitment_job?.task_number ?? order.fitment_id?.slice(0, 8).toUpperCase()}
                </Badge>
              ) : (
                <Badge className="rounded-lg bg-zinc-100 text-zinc-700 px-3 py-1 text-xs font-medium h-auto">
                  Home Delivery
                </Badge>
              )}
            </div>

            <div className="p-5">
              {isFitment && order.fitment_job ? (
                <>
                  <div className="grid grid-cols-1 gap-4 mb-4 sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-zinc-400 mb-1">Fitment ID</p>
                      <p className="text-sm font-medium text-zinc-800">{order.fitment_job.task_number}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-400 mb-1">Center</p>
                      <p className="text-sm font-medium text-zinc-800">{order.fitment_job.fitment_centres?.business_name ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-400 mb-1">Scheduled Date</p>
                      <p className="text-sm font-medium text-zinc-800">
                        {order.fitment_job.scheduled_date
                          ? `${fmtDate(order.fitment_job.scheduled_date)}${order.fitment_job.scheduled_time ? ` — ${order.fitment_job.scheduled_time}` : ''}`
                          : '—'}
                      </p>
                    </div>
                  </div>
                  <FitmentProgressBar status={order.fitment_job.job_status} />
                </>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {order.order_shipments.slice(0, 1).map(s => (
                    <div key={s.shipment_id}>
                      <p className="text-xs text-zinc-400 mb-1">Warehouse</p>
                      <p className="text-sm font-medium text-zinc-800">{s.warehouses?.warehouse_name ?? '—'}</p>
                    </div>
                  ))}
                  {order.order_shipments[0]?.tracking_number && (
                    <div>
                      <p className="text-xs text-zinc-400 mb-1">Tracking</p>
                      <p className="text-sm font-medium text-zinc-800">{order.order_shipments[0].tracking_number}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Shipment cards */}
          {!isFitment && order.order_shipments.map(s => (
            <ShipmentCard
              key={s.shipment_id}
              shipment={s}
              orderId={order.order_id}
              onMarkShipped={ship => router.push(`${pathname}?modal=shipped&shipment=${ship.shipment_id}`)}
              onMarkDelivered={handleMarkDelivered}
              token={accessToken}
            />
          ))}

          {/* Payments */}
          {order.order_payments.length > 0 && (
            <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
                <h2 className="text-sm font-semibold text-zinc-900">Payments</h2>
                <span className="inline-flex items-center gap-1.5 text-xs text-green-700 font-medium">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  {order.payment_status === 'paid' ? 'Paid' : order.payment_status}
                </span>
              </div>
              <Table className="w-full text-sm">
                <TableBody className="divide-y divide-zinc-100">
                  {order.order_payments.map(p => (
                    <TableRow key={p.payment_id} className="hover:bg-zinc-50">
                      <TableCell className="px-4 py-3">
                        <p className="font-mono text-xs font-medium text-zinc-700">#{p.payment_reference ?? p.payment_id.slice(0, 8).toUpperCase()}</p>
                        <p className="text-xs text-zinc-400 mt-0.5">{fmt(p.created_at)}</p>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-xs text-zinc-600 capitalize">
                        {p.payment_method.replace(/_/g, ' ')}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                          p.status === 'paid' ? 'text-green-700' : p.status === 'failed' ? 'text-red-600' : 'text-amber-600'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            p.status === 'paid' ? 'bg-green-500' : p.status === 'failed' ? 'bg-red-500' : 'bg-amber-500'
                          }`} />
                          {p.status === 'paid' ? 'Paid' : p.status}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3 font-medium text-zinc-900">
                        {fmtCurrency(p.amount, p.currency)}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <Button type="button" variant="ghost" size="icon-sm" className="text-zinc-400 hover:text-zinc-700">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100 bg-zinc-50">
                <span className="text-xs text-zinc-500">Total paid by customer</span>
                <span className="text-sm font-semibold text-zinc-900">
                  {fmtCurrency(order.order_payments.reduce((s, p) => s + p.amount, 0), order.currency)} {order.currency}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── Right sidebar ────────────────────────────────────────────── */}
        <div className="space-y-5">
          {/* Customer profile card */}
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
              {c ? (
                <Link href={`/admin/customers/${c.customer_id}`} className="text-base font-bold text-primary hover:underline">
                  {fullName}
                </Link>
              ) : (
                <span className="text-base font-bold text-zinc-900">Guest</span>
              )}
              {c && (
                <Button asChild variant="outline" className="rounded-lg border-primary text-primary px-3 py-1.5 text-xs font-medium hover:bg-primary/10 h-auto">
                  <Link href={`/admin/customers/${c.customer_id}`}>Edit Profile</Link>
                </Button>
              )}
            </div>

            {c && (
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                  <div>
                    <p className="text-zinc-400 mb-0.5">ID</p>
                    <p className="font-mono font-medium text-zinc-800">CUST-{c.customer_id.slice(0, 8).toUpperCase()}</p>
                  </div>
                  <div>
                    <p className="text-zinc-400 mb-0.5">Email</p>
                    <p className="text-zinc-700 truncate">{c.email}</p>
                  </div>
                  <div>
                    <p className="text-zinc-400 mb-0.5">Name</p>
                    <p className="text-zinc-700">{fullName}</p>
                  </div>
                  <div>
                    <p className="text-zinc-400 mb-0.5">Member Since</p>
                    <p className="text-zinc-700">{c.created_at ? fmtDate(c.created_at) : '—'}</p>
                  </div>
                </div>
                {c.phone && (
                  <div className="text-xs">
                    <p className="text-zinc-400 mb-0.5">Phone Number</p>
                    <p className="text-zinc-700">{c.phone}</p>
                  </div>
                )}
                {addr && Object.keys(addr).length > 0 && (
                  <div className="text-xs border-t border-zinc-100 pt-3">
                    <p className="text-zinc-400 mb-1">Shipping Address</p>
                    <address className="not-italic text-zinc-700 space-y-0.5">
                      {addr.address_line1 && <p>{addr.address_line1}</p>}
                      {(addr.city || addr.postal_code || addr.state) && (
                        <p>{[addr.city, addr.state, addr.postal_code].filter(Boolean).join(' ')}</p>
                      )}
                      {addr.country && <p>{addr.country}</p>}
                    </address>
                  </div>
                )}
                {billing && (
                  <div className="text-xs">
                    <p className="text-zinc-400 mb-1">Billing Address</p>
                    <p className="text-zinc-700">
                      {Object.keys(billing).length === 0
                        ? 'Same as shipping address'
                        : [billing.address_line1, billing.city, billing.country].filter(Boolean).join(', ')}
                    </p>
                  </div>
                )}
                {!billing && (
                  <div className="text-xs">
                    <p className="text-zinc-400 mb-1">Billing Address</p>
                    <p className="text-zinc-500 italic">Same as shipping address</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Activity feed */}
          {order.order_activity.length > 0 && (
            <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-100">
                <h3 className="text-sm font-semibold text-zinc-900">Activity</h3>
              </div>
              <div className="p-4 space-y-3">
                {order.order_activity.map(a => (
                  <div key={a.activity_id} className="flex items-start gap-3">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-zinc-700">
                        {a.description ?? a.event_type.replace(/_/g, ' ')}
                      </p>
                      {a.amount != null && (
                        <p className="text-xs text-zinc-500">{fmtCurrency(a.amount, a.currency ?? 'AUD')} {a.currency ?? 'AUD'}</p>
                      )}
                    </div>
                    <time className="text-xs text-zinc-400 shrink-0 whitespace-nowrap">
                      {fmtRelative(a.created_at)}
                    </time>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-zinc-900">Notes</h3>
              {notesDirty && (
                <Button
                  type="button"
                  size="xs"
                  onClick={saveNotes}
                  disabled={notesSaving}
                >
                  {notesSaving ? 'Saving…' : 'Save'}
                </Button>
              )}
            </div>
            <textarea
              value={notesValue}
              onChange={e => { setNotesValue(e.target.value); setNotesDirty(true) }}
              rows={3}
              placeholder="Add internal notes…"
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700 resize-none focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      {showFulfill && (
        <FulfillmentModal
          orderId={order.order_id}
          items={order.order_items}
          unfulfilledQty={unfulfilledQty}
          token={accessToken}
          onClose={closeModal}
          onSuccess={newShipment => {
            closeModal()
            setOrder(prev => ({
              ...prev,
              order_shipments: [...prev.order_shipments, newShipment],
              order_status: 'processing' as OrderStatus,
            }))
          }}
        />
      )}

      {shipToMark && (
        <MarkShippedModal
          orderId={order.order_id}
          shipment={shipToMark}
          token={accessToken}
          onClose={closeModal}
          onSuccess={(shipmentId, trackingNumber, trackingUri) => {
            closeModal()
            setOrder(prev => ({
              ...prev,
              order_shipments: prev.order_shipments.map(s =>
                s.shipment_id === shipmentId
                  ? { ...s, status: 'shipped' as ShipmentStatus, tracking_number: trackingNumber ?? null, tracking_uri: trackingUri ?? null, shipped_at: new Date().toISOString() }
                  : s
              ),
              order_status: 'processing' as OrderStatus,
            }))
          }}
        />
      )}
    </div>
  )
}
