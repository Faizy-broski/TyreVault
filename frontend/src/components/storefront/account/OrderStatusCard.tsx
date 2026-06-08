'use client'

import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CheckCircle2, Circle, Package, Truck, MapPin, ExternalLink } from 'lucide-react'
import type {
  CustomerOrderDetail,
  GuestOrderResult,
  OrderActivity,
  GuestOrderActivity,
  OrderShipment,
  GuestOrderShipment,
} from '@/lib/query/customer-hooks'

// Normalise both guest and authenticated order shapes into one display type
type DisplayOrder = {
  order_number:              string
  order_status:              string
  payment_status:            string
  order_type:                string
  delivery_method:           string | null
  total_amount:              number
  created_at:                string
  shipping_cost:             number | null
  fitting_cost:              number | null
  gst_amount:                number | null
  discount_amount:           number | null
  shipping_address_snapshot: Record<string, string> | null
  items: Array<{
    label:      string
    quantity:   number
    unit_price: number
  }>
  shipments: Array<{
    shipment_id:     string
    shipment_number: string
    status:          string
    tracking_number: string | null
    tracking_uri:    string | null
    shipped_at:      string | null
    delivered_at:    string | null
  }>
  activity: Array<{
    event_type:  string
    description: string | null
    created_at:  string
  }>
}

function normalise(order: CustomerOrderDetail | GuestOrderResult): DisplayOrder {
  if ('order_items' in order) {
    // CustomerOrderDetail
    return {
      order_number:              order.order_number,
      order_status:              order.order_status,
      payment_status:            order.payment_status,
      order_type:                order.order_type,
      delivery_method:           order.delivery_method,
      total_amount:              order.total_amount,
      created_at:                order.created_at,
      shipping_cost:             order.shipping_cost ?? null,
      fitting_cost:              order.fitting_cost ?? null,
      gst_amount:                order.gst_amount ?? null,
      discount_amount:           order.discount_amount ?? null,
      shipping_address_snapshot: order.shipping_address_snapshot ?? null,
      items: (order.order_items ?? []).map(oi => ({
        label:      oi.skus?.tyre_size_display ?? oi.skus?.sku ?? oi.product_id,
        quantity:   oi.quantity,
        unit_price: oi.unit_price,
      })),
      shipments: order.order_shipments ?? [],
      activity:  order.order_activity ?? [],
    }
  } else {
    // GuestOrderResult
    return {
      order_number:              order.order_number,
      order_status:              order.order_status,
      payment_status:            order.payment_status,
      order_type:                order.order_type,
      delivery_method:           order.delivery_method ?? null,
      total_amount:              order.total_amount,
      created_at:                order.created_at,
      shipping_cost:             null,
      fitting_cost:              null,
      gst_amount:                null,
      discount_amount:           null,
      shipping_address_snapshot: order.shipping_address_snapshot ?? null,
      items: (order.items ?? []).map(i => ({
        label:      i.tyre_size ?? i.sku ?? i.order_item_id,
        quantity:   i.quantity,
        unit_price: i.unit_price,
      })),
      shipments: order.shipments ?? [],
      activity:  order.activity ?? [],
    }
  }
}

function statusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'fulfilled':
    case 'delivered':
    case 'paid':      return 'default'
    case 'cancelled': return 'destructive'
    default:          return 'secondary'
  }
}

function statusLabel(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// Timeline maps known event_type values to readable labels
const EVENT_LABELS: Record<string, string> = {
  order_placed:       'Order Placed',
  payment_received:   'Payment Received',
  items_fulfilled:    'Items Fulfilled',
  items_shipped:      'Shipped',
  items_delivered:    'Delivered',
  order_cancelled:    'Order Cancelled',
}

function Timeline({ activity }: { activity: DisplayOrder['activity'] }) {
  if (!activity.length) return null
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-zinc-700">Order Timeline</h3>
      <ol className="relative border-l border-zinc-200 ml-2 space-y-4">
        {activity.map((ev, i) => (
          <li key={i} className="ml-4">
            <span className="absolute -left-[7px] flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary ring-2 ring-white">
              <CheckCircle2 className="h-2.5 w-2.5 text-zinc-900" />
            </span>
            <p className="text-sm font-medium text-zinc-800">
              {EVENT_LABELS[ev.event_type] ?? statusLabel(ev.event_type)}
            </p>
            {ev.description && <p className="text-xs text-zinc-500 mt-0.5">{ev.description}</p>}
            <p className="text-xs text-zinc-400 mt-0.5">
              {new Date(ev.created_at).toLocaleString('en-AU', {
                day: 'numeric', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </p>
          </li>
        ))}
      </ol>
    </div>
  )
}

export default function OrderStatusCard({ order }: { order: CustomerOrderDetail | GuestOrderResult }) {
  const d = normalise(order)
  const date = new Date(d.created_at).toLocaleDateString('en-AU', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">Order Reference</p>
            <p className="font-mono text-lg font-bold text-zinc-900">{d.order_number}</p>
            <p className="text-xs text-zinc-400 mt-0.5">Placed on {date}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={statusBadgeVariant(d.order_status)}>
              {statusLabel(d.order_status)}
            </Badge>
            <Badge variant={statusBadgeVariant(d.payment_status)}>
              {statusLabel(d.payment_status)}
            </Badge>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-3">
        <h3 className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
          <Package className="h-4 w-4" /> Items
        </h3>
        <ul className="divide-y divide-zinc-100">
          {d.items.map((item, i) => (
            <li key={i} className="flex justify-between py-2 text-sm">
              <span className="text-zinc-800">{item.label} × {item.quantity}</span>
              <span className="font-semibold text-zinc-900 tabular-nums">
                A${(item.unit_price * item.quantity).toFixed(2)}
              </span>
            </li>
          ))}
        </ul>

        <Separator />

        <div className="space-y-1 text-sm">
          {d.fitting_cost != null && d.fitting_cost > 0 && (
            <div className="flex justify-between text-zinc-600">
              <span>Fitting</span>
              <span>A${Number(d.fitting_cost).toFixed(2)}</span>
            </div>
          )}
          {d.shipping_cost != null && d.shipping_cost > 0 && (
            <div className="flex justify-between text-zinc-600">
              <span>Shipping</span>
              <span>A${Number(d.shipping_cost).toFixed(2)}</span>
            </div>
          )}
          {d.discount_amount != null && d.discount_amount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount</span>
              <span>−A${Number(d.discount_amount).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-zinc-900 pt-1">
            <span>Total</span>
            <span>A${Number(d.total_amount).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Shipments */}
      {d.shipments.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-3">
          <h3 className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
            <Truck className="h-4 w-4" /> Shipment{d.shipments.length > 1 ? 's' : ''}
          </h3>
          <ul className="space-y-3">
            {d.shipments.map((s, i) => (
              <li key={i} className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm space-y-1">
                <div className="flex items-center justify-between">
                  <Badge variant={statusBadgeVariant(s.status)} className="text-xs">{statusLabel(s.status)}</Badge>
                  {s.tracking_uri && (
                    <a
                      href={s.tracking_uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      Track shipment <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                {s.tracking_number && (
                  <p className="text-xs text-zinc-500 font-mono">{s.tracking_number}</p>
                )}
                {s.shipped_at && (
                  <p className="text-xs text-zinc-400">
                    Shipped {new Date(s.shipped_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                )}
                {s.delivered_at && (
                  <p className="text-xs text-zinc-400">
                    Delivered {new Date(s.delivered_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Delivery address */}
      {d.shipping_address_snapshot && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-2">
          <h3 className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
            <MapPin className="h-4 w-4" /> Delivery Address
          </h3>
          <div className="text-sm text-zinc-600 space-y-0.5">
            {d.shipping_address_snapshot.line1 && <p>{d.shipping_address_snapshot.line1}</p>}
            {d.shipping_address_snapshot.line2 && <p>{d.shipping_address_snapshot.line2}</p>}
            <p>
              {[
                d.shipping_address_snapshot.suburb,
                d.shipping_address_snapshot.state,
                d.shipping_address_snapshot.postcode,
              ].filter(Boolean).join(' ')}
            </p>
          </div>
        </div>
      )}

      {/* Timeline */}
      {d.activity.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <Timeline activity={d.activity} />
        </div>
      )}
    </div>
  )
}
