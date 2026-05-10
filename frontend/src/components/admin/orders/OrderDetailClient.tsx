'use client'

import { useState } from 'react'
import Link from 'next/link'
import type {
  OrderDetail, OrderItem, OrderShipment,
  PaymentStatus, FulfillmentStatus, ShipmentStatus,
} from '@/types/admin.types'
import FulfillmentModal from './FulfillmentModal'
import MarkShippedModal from './MarkShippedModal'

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
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={loading}
          className={`appearance-none rounded-lg border px-3 py-1.5 pr-7 text-sm font-medium cursor-pointer focus:outline-none ${current?.cls ?? 'border-zinc-300 bg-white text-zinc-700'}`}
        >
          {options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-current opacity-60" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  )
}

const PAYMENT_OPTIONS: StatusOption[] = [
  { value: 'success',  label: 'Paid',      cls: 'border-green-200 bg-green-50 text-green-700' },
  { value: 'pending',  label: 'Pending',   cls: 'border-amber-200 bg-amber-50 text-amber-700' },
  { value: 'failed',   label: 'Failed',    cls: 'border-red-200 bg-red-50 text-red-700' },
  { value: 'refunded', label: 'Refunded',  cls: 'border-zinc-200 bg-zinc-100 text-zinc-600' },
]

const DELIVERY_OPTIONS: StatusOption[] = [
  { value: 'unfulfilled',        label: 'Unfulfilled',    cls: 'border-red-200 bg-red-50 text-red-700' },
  { value: 'awaiting_shipping',  label: 'Awaiting',       cls: 'border-amber-200 bg-amber-50 text-amber-700' },
  { value: 'shipped',            label: 'Shipped',        cls: 'border-amber-200 bg-amber-50 text-amber-700' },
  { value: 'delivered',          label: 'Delivered',      cls: 'border-green-200 bg-green-50 text-green-700' },
  { value: 'partially_fulfilled',label: 'Partial',        cls: 'border-amber-200 bg-amber-50 text-amber-700' },
  { value: 'fulfilled',          label: 'Fulfilled',      cls: 'border-blue-200 bg-blue-50 text-blue-700' },
  { value: 'cancelled',          label: 'Cancelled',      cls: 'border-zinc-200 bg-zinc-100 text-zinc-600' },
]

function deriveOrderStatus(payment: string, fulfillment: string) {
  if (fulfillment === 'delivered')          return { value: 'complete',    label: 'Complete',     cls: 'border-green-200 bg-green-50 text-green-700' }
  if (fulfillment === 'shipped')            return { value: 'in_progress', label: 'In Progress',  cls: 'border-amber-200 bg-amber-50 text-amber-700' }
  if (payment    === 'pending')             return { value: 'awaiting',    label: 'Awaiting Payment', cls: 'border-amber-200 bg-amber-50 text-amber-700' }
  if (fulfillment === 'cancelled')          return { value: 'cancelled',   label: 'Cancelled',    cls: 'border-red-200 bg-red-50 text-red-700' }
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
    case 'new_request': return 1
    case 'accepted':    return 2
    case 'delayed':     return 2
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
                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
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

function UnfulfilledItems({ items, onFulfill }: { items: OrderItem[]; onFulfill: () => void }) {
  const unfulfilled = items.filter(i => (i.fulfilled_quantity ?? 0) < i.quantity)
  if (unfulfilled.length === 0) return null

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-amber-800">Unfulfilled Items</p>
        <button
          onClick={onFulfill}
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700"
        >
          Fulfill items
        </button>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-amber-200">
            {['SKU', 'Size', 'Qty', 'Fulfilled', 'Remaining'].map(h => (
              <th key={h} className="pb-2 text-left text-xs font-medium text-amber-700">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-amber-100">
          {unfulfilled.map(item => (
            <tr key={item.order_item_id}>
              <td className="py-2 font-mono text-xs text-zinc-600">{item.skus?.sku ?? '—'}</td>
              <td className="py-2 text-zinc-700 text-xs">{item.skus?.tyre_size_display ?? '—'}</td>
              <td className="py-2 text-zinc-600">{item.quantity}</td>
              <td className="py-2 text-zinc-600">{item.fulfilled_quantity ?? 0}</td>
              <td className="py-2 font-medium text-zinc-900">{item.quantity - (item.fulfilled_quantity ?? 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
      if (res.ok) onMarkDelivered(shipment.shipment_id)
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
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusCls[shipment.status] ?? 'bg-zinc-100 text-zinc-600 border-zinc-200'}`}>
            {shipment.status.replace(/_/g, ' ')}
          </span>
          {shipment.warehouses && <span className="text-xs text-zinc-500">{shipment.warehouses.warehouse_name}</span>}
        </div>
        <div className="flex gap-2">
          {shipment.status === 'awaiting_shipping' && (
            <button onClick={() => onMarkShipped(shipment)} className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700">
              Mark as shipped
            </button>
          )}
          {shipment.status === 'shipped' && (
            <button onClick={handleDeliver} disabled={delivering} className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50">
              {delivering ? 'Marking...' : 'Mark as delivered'}
            </button>
          )}
        </div>
      </div>
      <div className="p-4 space-y-2">
        {(shipment.tracking_number || shipment.shipped_at) && (
          <div className="flex gap-6 text-xs text-zinc-500">
            {shipment.tracking_number && <span>Tracking: <span className="font-mono text-zinc-700">{shipment.tracking_number}</span></span>}
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
  const [order, setOrder] = useState<OrderDetail>(initialOrder)
  const [showFulfill, setShowFulfill] = useState(false)
  const [shipToMark, setShipToMark]   = useState<OrderShipment | null>(null)
  const [statusSaving, setStatusSaving] = useState(false)

  async function patchStatus(patch: { paymentStatus?: string; fulfillmentStatus?: string }) {
    setStatusSaving(true)
    try {
      await fetch(`${API}/api/admin/orders/${order.order_id}/status`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body:    JSON.stringify(patch),
      })
      if (patch.paymentStatus)     setOrder(p => ({ ...p, payment_status:     patch.paymentStatus     as PaymentStatus }))
      if (patch.fulfillmentStatus) setOrder(p => ({ ...p, fulfillment_status: patch.fulfillmentStatus as FulfillmentStatus }))
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
      fulfillment_status: 'delivered' as FulfillmentStatus,
    }))
  }

  const c       = order.customers
  const addr    = order.shipping_address_snapshot
  const billing = order.billing_address_snapshot
  const isFitment = !!order.fitment_centre_id
  const orderStatus = deriveOrderStatus(order.payment_status, order.fulfillment_status)

  const fullName = c ? [c.first_name, c.last_name].filter(Boolean).join(' ') || c.email : '—'

  function copyOrderNumber() {
    navigator.clipboard.writeText(order.order_number)
  }

  return (
    <div className="p-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-zinc-500 mb-4">
        <Link href="/admin/orders" className="hover:text-zinc-900">Orders</Link>
        <span>›</span>
        {c && (
          <>
            <Link href={`/admin/customers/${c.customer_id}`} className="hover:text-zinc-900">{fullName}</Link>
            <span>›</span>
          </>
        )}
        <span className="text-zinc-900 font-medium">#{order.order_number}</span>
      </div>

      {/* Order header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <h1 className="text-xl font-bold text-zinc-900">#{order.order_number}</h1>
            <button
              onClick={copyOrderNumber}
              title="Copy order number"
              className="text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-zinc-500">{fmt(order.created_at)}</p>
        </div>

        {/* Status dropdowns */}
        <div className="flex items-end gap-4">
          <StatusDropdown
            label="Payment Status"
            value={order.payment_status}
            options={PAYMENT_OPTIONS}
            onChange={val => patchStatus({ paymentStatus: val })}
            loading={statusSaving}
          />
          <StatusDropdown
            label="Delivery Status"
            value={order.fulfillment_status}
            options={DELIVERY_OPTIONS}
            onChange={val => patchStatus({ fulfillmentStatus: val })}
            loading={statusSaving}
          />
          <div className="flex flex-col gap-1">
            <span className="text-xs text-zinc-400">Order Status</span>
            <span className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-medium ${orderStatus.cls}`}>
              {orderStatus.label}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* ── Main content ────────────────────────────────────────────── */}
        <div className="col-span-2 space-y-5">

          {/* Order Summary — items + totals */}
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
              <h2 className="text-sm font-semibold text-zinc-900">Order Summary</h2>
              <button className="p-1 text-zinc-400 hover:text-zinc-700">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                </svg>
              </button>
            </div>

            {/* Items table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50">
                    {['Name', 'SKU', 'Quantity', 'Price', 'VAT', 'Order Total'].map(h => (
                      <th key={h} className={`px-4 py-3 text-xs font-medium text-zinc-500 ${h === 'Order Total' ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {order.order_items.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-6 text-center text-sm text-zinc-400">No items.</td></tr>
                  ) : (
                    order.order_items.map(item => {
                      const vat = item.total_price * 0.1
                      return (
                        <tr key={item.order_item_id} className="hover:bg-zinc-50">
                          <td className="px-4 py-3 text-zinc-800 font-medium">
                            {item.skus?.tyre_size_display ?? 'Product'}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                            #{item.skus?.sku ?? '—'}
                          </td>
                          <td className="px-4 py-3 text-zinc-600">{item.quantity}x</td>
                          <td className="px-4 py-3 text-zinc-700">{fmtCurrency(item.unit_price, order.currency)}</td>
                          <td className="px-4 py-3 text-zinc-500">{fmtCurrency(vat, order.currency)}</td>
                          <td className="px-4 py-3 text-right font-medium text-zinc-900">{fmtCurrency(item.total_price, order.currency)}</td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Financial breakdown */}
            <div className="px-5 py-4 border-t border-zinc-100 space-y-2">
              <div className="flex justify-between text-sm text-zinc-500">
                <span>Item Subtotal</span>
                <span>{fmtCurrency(order.subtotal_amount, order.currency)}</span>
              </div>
              <div className="flex justify-between text-sm text-zinc-500">
                <span className="flex items-center gap-1">
                  Shipping
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </span>
                <span>{fmtCurrency(order.shipping_amount, order.currency)}</span>
              </div>
              <div className="flex justify-between text-sm text-zinc-500">
                <span>Tax</span>
                <span>{fmtCurrency(order.tax_amount, order.currency)}</span>
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
              <div className="flex justify-between text-sm text-zinc-500">
                <span>Paid</span>
                <span>{fmtCurrency(order.paid_amount, order.currency)} {order.currency}</span>
              </div>
              <div className="flex justify-between text-sm text-zinc-500">
                <span>Outstanding</span>
                <span className={order.outstanding_amount > 0 ? 'text-red-600 font-medium' : ''}>
                  {fmtCurrency(order.outstanding_amount, order.currency)} {order.currency}
                </span>
              </div>
            </div>
          </div>

          {/* Unfulfilled items */}
          <UnfulfilledItems
            items={order.order_items}
            onFulfill={() => setShowFulfill(true)}
          />

          {/* Delivery Type section */}
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
              <h2 className="text-sm font-semibold text-zinc-900">Delivery Type</h2>
              {isFitment ? (
                <span className="inline-flex items-center rounded-lg bg-blue-600 text-white px-3 py-1 text-xs font-medium">
                  Fitment Center {order.fitment_job?.task_number ?? order.fitment_centre_id?.slice(0, 8).toUpperCase()}
                </span>
              ) : (
                <span className="inline-flex items-center rounded-lg bg-zinc-100 text-zinc-700 px-3 py-1 text-xs font-medium">
                  Home Delivery
                </span>
              )}
            </div>

            <div className="p-5">
              {isFitment && order.fitment_job ? (
                <>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-zinc-400 mb-1">Fitment ID</p>
                      <p className="text-sm font-medium text-zinc-800">{order.fitment_job.task_number}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-400 mb-1">Center</p>
                      <p className="text-sm font-medium text-zinc-800">
                        {order.fitment_job.fitment_centres?.centre_name ?? '—'}
                      </p>
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
                  <FitmentProgressBar status={order.fitment_job.status} />
                </>
              ) : (
                <div className="grid grid-cols-3 gap-4">
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

          {/* Shipment cards (only for home delivery with multiple shipments) */}
          {!isFitment && order.order_shipments.map(s => (
            <ShipmentCard
              key={s.shipment_id}
              shipment={s}
              orderId={order.order_id}
              onMarkShipped={ship => setShipToMark(ship)}
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
                  {order.payment_status === 'success' ? 'Paid' : order.payment_status}
                </span>
              </div>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-zinc-100">
                  {order.order_payments.map(p => (
                    <tr key={p.payment_id} className="hover:bg-zinc-50">
                      <td className="px-4 py-3">
                        <p className="font-mono text-xs font-medium text-zinc-700">#{p.payment_reference ?? p.payment_id.slice(0, 8).toUpperCase()}</p>
                        <p className="text-xs text-zinc-400 mt-0.5">{fmt(p.created_at)}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-600 capitalize">
                        {p.payment_method.replace(/_/g, ' ')}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                          p.status === 'success' ? 'text-green-700' : p.status === 'failed' ? 'text-red-600' : 'text-amber-600'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            p.status === 'success' ? 'bg-green-500' : p.status === 'failed' ? 'bg-red-500' : 'bg-amber-500'
                          }`} />
                          {p.status === 'success' ? 'Succeed' : p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-zinc-900">
                        {fmtCurrency(p.amount, p.currency)}
                      </td>
                      <td className="px-4 py-3">
                        <button className="p-1 text-zinc-400 hover:text-zinc-700">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100 bg-zinc-50">
                <span className="text-xs text-zinc-500">Total paid by customer</span>
                <span className="text-sm font-semibold text-zinc-900">
                  {fmtCurrency(order.paid_amount, order.currency)} {order.currency}
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
                <Link href={`/admin/customers/${c.customer_id}`} className="text-base font-bold text-blue-600 hover:underline">
                  {fullName}
                </Link>
              ) : (
                <span className="text-base font-bold text-zinc-900">Guest</span>
              )}
              {c && (
                <Link
                  href={`/admin/customers/${c.customer_id}`}
                  className="rounded-lg border border-blue-600 text-blue-600 px-3 py-1.5 text-xs font-medium hover:bg-blue-50 transition-colors"
                >
                  Edit Profile
                </Link>
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
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-zinc-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-zinc-700">
                        {a.description ?? a.event_type.replace(/_/g, ' ')}
                      </p>
                      {a.amount != null && (
                        <p className="text-xs text-zinc-500">{fmtCurrency(a.amount, a.currency ?? 'AUD')} {a.currency ?? 'AUD'}</p>
                      )}
                    </div>
                    <time className="text-xs text-zinc-400 flex-shrink-0 whitespace-nowrap">
                      {fmtRelative(a.created_at)}
                    </time>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {order.notes && (
            <div className="rounded-xl border border-zinc-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-zinc-900 mb-2">Notes</h3>
              <p className="text-xs text-zinc-700 whitespace-pre-wrap">{order.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showFulfill && (
        <FulfillmentModal
          orderId={order.order_id}
          items={order.order_items.filter(i => (i.fulfilled_quantity ?? 0) < i.quantity)}
          onClose={() => setShowFulfill(false)}
          onSuccess={newShipment => {
            setShowFulfill(false)
            setOrder(prev => ({
              ...prev,
              order_shipments:    [...prev.order_shipments, newShipment],
              fulfillment_status: 'awaiting_shipping',
            }))
          }}
        />
      )}

      {shipToMark && (
        <MarkShippedModal
          orderId={order.order_id}
          shipment={shipToMark}
          onClose={() => setShipToMark(null)}
          onSuccess={(shipmentId, trackingNumber, trackingUri) => {
            setShipToMark(null)
            setOrder(prev => ({
              ...prev,
              order_shipments: prev.order_shipments.map(s =>
                s.shipment_id === shipmentId
                  ? { ...s, status: 'shipped' as ShipmentStatus, tracking_number: trackingNumber ?? null, tracking_uri: trackingUri ?? null, shipped_at: new Date().toISOString() }
                  : s
              ),
              fulfillment_status: 'shipped',
            }))
          }}
        />
      )}
    </div>
  )
}
