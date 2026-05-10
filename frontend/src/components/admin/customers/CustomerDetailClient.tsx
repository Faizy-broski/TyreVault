'use client'

import { useState } from 'react'
import Link from 'next/link'
import EditCustomerModal from './EditCustomerModal'
import type { CustomerListItem, Address, CustomerGroup } from '@/types/admin.types'
import type { CustomerOrder, OrderStats } from '@/app/admin/customers/[customerId]/page'

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function fmtMoney(n: number) {
  return `$${n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ── Badge helpers ──────────────────────────────────────────────────────────

function AccountBadge({ isGuest }: { isGuest: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border ${
      isGuest
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-green-50 text-green-700 border-green-200'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isGuest ? 'bg-amber-500' : 'bg-green-500'}`} />
      {isGuest ? 'Guest' : 'Registered'}
    </span>
  )
}

function PaymentDot({ status }: { status: string }) {
  const colMap: Record<string, string> = {
    success:  'bg-green-500',
    paid:     'bg-green-500',
    pending:  'bg-amber-500',
    failed:   'bg-red-500',
    refunded: 'bg-zinc-400',
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-zinc-600 capitalize">
      <span className={`w-2 h-2 rounded-full ${colMap[status] ?? colMap.pending}`} />
      {status}
    </span>
  )
}

function FulfillmentBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    delivered:             'bg-green-50 text-green-700 border-green-200',
    fulfilled:             'bg-green-50 text-green-700 border-green-200',
    shipped:               'bg-blue-50 text-blue-700 border-blue-200',
    awaiting_shipping:     'bg-amber-50 text-amber-700 border-amber-200',
    partially_fulfilled:   'bg-amber-50 text-amber-700 border-amber-200',
    unfulfilled:           'bg-zinc-100 text-zinc-600 border-zinc-200',
    pending:               'bg-zinc-100 text-zinc-600 border-zinc-200',
    cancelled:             'bg-red-50 text-red-700 border-red-200',
  }
  const label = status.replace(/_/g, ' ')
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize whitespace-nowrap ${map[status] ?? map.pending}`}>
      {label}
    </span>
  )
}

function DeliveryTypeCell({ deliveryMethod, fitmentCentreId }: {
  deliveryMethod: string | null
  fitmentCentreId: string | null
}) {
  if (!deliveryMethod || deliveryMethod === 'home_delivery' || deliveryMethod === 'shipping') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-zinc-700">
        <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H3m16.5 0h-.75m-14.25 0h.75m3 0h7.5m3.75 0h.75M15 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-7.5-9h15M3.75 9h.75m0 0V6.75M3.75 9v6.75M20.25 9h-.75m0 0V6.75m0 2.25v6.75" />
        </svg>
        Home Delivery
      </span>
    )
  }
  return (
    <span className="inline-flex flex-col gap-0.5 text-xs">
      <span className="text-zinc-700 flex items-center gap-1">
        <svg className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
        </svg>
        Fitment Centre
      </span>
      {fitmentCentreId && (
        <Link href={`/admin/fitters/${fitmentCentreId}`} className="text-blue-600 hover:underline pl-5">
          #{fitmentCentreId.slice(0, 8).toUpperCase()}
        </Link>
      )}
    </span>
  )
}

// ── Props ──────────────────────────────────────────────────────────────────

type Props = {
  customer:       CustomerListItem
  orders:         CustomerOrder[]
  orderStats:     OrderStats
  groups:         CustomerGroup[]
  addresses:      Address[]
  primaryAddress: Address | null
}

// ── Component ──────────────────────────────────────────────────────────────

export default function CustomerDetailClient({
  customer, orders, orderStats, groups, addresses, primaryAddress,
}: Props) {
  const [showEdit, setShowEdit]           = useState(false)
  const [paymentFilter, setPaymentFilter] = useState<string | null>(null)
  const [fulfilFilter, setFulfilFilter]   = useState<string | null>(null)

  const fullName   = [customer.first_name, customer.last_name].filter(Boolean).join(' ') || '—'
  const isGuest    = !customer.profile_id

  const filteredOrders = orders.filter(o => {
    if (paymentFilter && o.payment_status !== paymentFilter) return false
    if (fulfilFilter  && o.fulfillment_status !== fulfilFilter) return false
    return true
  })

  const addressDisplay = primaryAddress
    ? [
        primaryAddress.address_line1,
        primaryAddress.address_line2,
        primaryAddress.city,
        primaryAddress.state,
        primaryAddress.postal_code,
        primaryAddress.country,
      ].filter(Boolean).join(', ')
    : '—'

  return (
    <>
      {showEdit && (
        <EditCustomerModal customer={customer} onClose={() => setShowEdit(false)} />
      )}

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-blue-600">{fullName}</h1>
          <AccountBadge isGuest={isGuest} />
        </div>
        <button
          onClick={() => setShowEdit(true)}
          className="flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
          </svg>
          Edit Profile
        </button>
      </div>

      <div className="flex gap-6">
        {/* ── Main ─────────────────────────────────────────────────────── */}
        <div className="flex-1 space-y-5 min-w-0">

          {/* Profile info grid */}
          <div className="rounded-xl border border-zinc-200 bg-white divide-y divide-zinc-100">
            {/* Row 1 */}
            <div className="grid grid-cols-3 divide-x divide-zinc-100">
              <div className="px-5 py-4">
                <p className="text-xs text-zinc-400 mb-1">Customer ID</p>
                <p className="text-sm font-medium text-zinc-800 font-mono">
                  {customer.customer_id.slice(0, 8).toUpperCase()}
                </p>
              </div>
              <div className="px-5 py-4">
                <p className="text-xs text-zinc-400 mb-1">Email</p>
                <p className="text-sm text-zinc-800 truncate">{customer.email}</p>
              </div>
              <div className="px-5 py-4">
                <p className="text-xs text-zinc-400 mb-1">Full Name</p>
                <p className="text-sm text-zinc-800">{fullName}</p>
              </div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-3 divide-x divide-zinc-100">
              <div className="px-5 py-4">
                <p className="text-xs text-zinc-400 mb-1">Member Since</p>
                <p className="text-sm text-zinc-800">{fmtDate(customer.created_at)}</p>
              </div>
              <div className="px-5 py-4">
                <p className="text-xs text-zinc-400 mb-1">Phone</p>
                <p className="text-sm text-zinc-800">{customer.phone || '—'}</p>
              </div>
              <div className="px-5 py-4">
                <p className="text-xs text-zinc-400 mb-1">Account Status</p>
                <AccountBadge isGuest={isGuest} />
              </div>
            </div>

            {/* Row 3 — Address */}
            <div className="px-5 py-4">
              <p className="text-xs text-zinc-400 mb-1">Primary Address</p>
              <p className="text-sm text-zinc-800">{addressDisplay}</p>
            </div>
          </div>

          {/* Orders */}
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200">
              <h2 className="text-sm font-semibold text-zinc-900">Orders</h2>
              <div className="flex items-center gap-2">
                {/* Payment filter */}
                {(['pending', 'success', 'failed', 'refunded'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setPaymentFilter(paymentFilter === s ? null : s)}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors capitalize ${
                      paymentFilter === s
                        ? 'bg-zinc-800 text-white border-zinc-800'
                        : 'bg-white text-zinc-600 border-zinc-300 hover:border-zinc-500'
                    }`}
                  >
                    + {s}
                  </button>
                ))}
                <div className="w-px h-4 bg-zinc-200 mx-1" />
                {/* Fulfillment filter */}
                {(['unfulfilled', 'shipped', 'delivered'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setFulfilFilter(fulfilFilter === s ? null : s)}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors capitalize ${
                      fulfilFilter === s
                        ? 'bg-zinc-800 text-white border-zinc-800'
                        : 'bg-white text-zinc-600 border-zinc-300 hover:border-zinc-500'
                    }`}
                  >
                    + {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50">
                    {['Order #', 'Delivery Type', 'Created ↓', 'Payment', 'Fulfillment', 'Items', 'Type', 'Order Total'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-zinc-500 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-sm text-zinc-400">
                        No orders found.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map(o => (
                      <tr key={o.order_id} className="hover:bg-zinc-50">
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/orders/${o.order_id}`}
                            className="font-medium text-blue-600 hover:underline whitespace-nowrap"
                          >
                            #{o.order_number}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <DeliveryTypeCell
                            deliveryMethod={o.delivery_method}
                            fitmentCentreId={o.fitment_centre_id}
                          />
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap">
                          {fmtDateTime(o.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <PaymentDot status={o.payment_status} />
                        </td>
                        <td className="px-4 py-3">
                          <FulfillmentBadge status={o.fulfillment_status} />
                        </td>
                        <td className="px-4 py-3 text-zinc-600 text-center">{o.item_count}</td>
                        <td className="px-4 py-3 text-xs text-zinc-600 capitalize">
                          {o.payment_method?.replace(/_/g, ' ') ?? '—'}
                        </td>
                        <td className="px-4 py-3 font-medium text-zinc-800 whitespace-nowrap">
                          {fmtMoney(o.total_amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100 bg-zinc-50 text-xs text-zinc-500">
              <span>Showing {filteredOrders.length} of {orders.length} orders</span>
              <span>Page 1 of 1</span>
            </div>
          </div>

          {/* Customer Groups */}
          {groups.length > 0 && (
            <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-200">
                <h2 className="text-sm font-semibold text-zinc-900">Customer Groups</h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Group Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Members</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {groups.map(g => (
                    <tr key={g.group_id} className="hover:bg-zinc-50">
                      <td className="px-4 py-3 font-medium text-zinc-800">{g.group_name}</td>
                      <td className="px-4 py-3 text-zinc-600">{g.customer_count}</td>
                      <td className="px-4 py-3 text-xs text-zinc-500">{fmtDate(g.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Right sidebar ─────────────────────────────────────────────── */}
        <div className="w-64 flex-shrink-0 space-y-4">

          {/* Order summary card */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-zinc-900 mb-4">Orders</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">Total Value</span>
                <span className="text-sm font-semibold text-zinc-900">{fmtMoney(orderStats.totalValue)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">Orders</span>
                <span className="text-sm font-semibold text-zinc-900">{orderStats.count}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">Avg. Order Value</span>
                <span className="text-sm font-semibold text-zinc-900">{fmtMoney(orderStats.avgOrderValue)}</span>
              </div>
              {orderStats.lastOrderDate && (
                <div className="pt-2 border-t border-zinc-100">
                  <p className="text-xs text-zinc-400">Last Order</p>
                  <p className="text-xs text-zinc-600 mt-0.5">{fmtDate(orderStats.lastOrderDate)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Addresses card */}
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-zinc-900 mb-3">
              Addresses{addresses.length > 0 && <span className="ml-1.5 text-zinc-400 font-normal">({addresses.length})</span>}
            </h3>
            {addresses.length === 0 ? (
              <p className="text-xs text-zinc-400 text-center py-2">No addresses on file.</p>
            ) : (
              <div className="space-y-2">
                {addresses.map(addr => (
                  <div key={addr.address_id} className="rounded-lg border border-zinc-200 p-3">
                    <p className="text-xs font-medium text-zinc-700">{addr.address_name}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {[addr.address_line1, addr.city, addr.state].filter(Boolean).join(', ')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
