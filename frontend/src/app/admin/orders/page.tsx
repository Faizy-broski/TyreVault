import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { OrderListItem, PaymentStatus, FulfillmentStatus } from '@/types/admin.types'

export const metadata = { title: 'Orders' }

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

interface Props {
  searchParams: Promise<{
    search?:            string
    page?:             string
    paymentStatus?:    string
    fulfillmentStatus?: string
  }>
}

// ── Badge helpers ──────────────────────────────────────────────────────────

function PaymentDot({ status }: { status: PaymentStatus }) {
  const dot: Record<PaymentStatus, string>   = { success: 'bg-green-500', pending: 'bg-amber-500', failed: 'bg-red-500', refunded: 'bg-zinc-400' }
  const label: Record<PaymentStatus, string> = { success: 'Success', pending: 'Pending', failed: 'Failed', refunded: 'Refunded' }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-zinc-700">
      <span className={`w-2 h-2 rounded-full ${dot[status] ?? dot.pending}`} />
      {label[status] ?? status}
    </span>
  )
}

function FulfillmentBadge({ status }: { status: FulfillmentStatus }) {
  const map: Record<FulfillmentStatus, string> = {
    unfulfilled:        'bg-red-50 text-red-700 border-red-200',
    partially_fulfilled:'bg-amber-50 text-amber-700 border-amber-200',
    fulfilled:          'bg-blue-50 text-blue-700 border-blue-200',
    awaiting_shipping:  'bg-amber-50 text-amber-700 border-amber-200',
    shipped:            'bg-amber-50 text-amber-700 border-amber-200',
    delivered:          'bg-green-50 text-green-700 border-green-200',
    cancelled:          'bg-zinc-100 text-zinc-600 border-zinc-200',
  }
  const label: Record<FulfillmentStatus, string> = {
    unfulfilled: 'Unfulfilled', partially_fulfilled: 'Partial',
    fulfilled: 'Fulfilled', awaiting_shipping: 'Awaiting',
    shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled',
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${map[status] ?? 'bg-zinc-100 text-zinc-600 border-zinc-200'}`}>
      {label[status] ?? status}
    </span>
  )
}

function DeliveryTypeCell({ deliveryMethod, fitmentCentreId }: {
  deliveryMethod: string | null
  fitmentCentreId: string | null
}) {
  if (!deliveryMethod || deliveryMethod === 'home_delivery' || deliveryMethod === 'shipping') {
    return <span className="text-xs text-zinc-700">Home Delivery</span>
  }
  return (
    <span className="flex flex-col gap-0.5 text-xs">
      <span className="text-zinc-700">Fitment Centre</span>
      {fitmentCentreId && (
        <Link href={`/admin/fitters/${fitmentCentreId}`} className="text-blue-600 hover:underline">
          #FIT-001
        </Link>
      )}
    </span>
  )
}

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString('en-AU', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function fmtMoney(n: number) {
  return `$${n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function addressSnippet(snap: Record<string, string> | null) {
  if (!snap) return '—'
  return [snap.address_line1, snap.city, snap.postal_code].filter(Boolean).join(', ') || '—'
}

// ── KPI Card ───────────────────────────────────────────────────────────────

function KpiCard({ title, value, sub, icon }: {
  title: string; value: string; sub: string; icon: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 flex items-start justify-between">
      <div>
        <p className="text-sm text-zinc-500 mb-2">{title}</p>
        <p className="text-2xl font-bold text-zinc-900">{value}</p>
        <p className="text-xs text-zinc-400 mt-1">{sub}</p>
      </div>
      <span className="text-zinc-400">{icon}</span>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default async function OrdersPage({ searchParams }: Props) {
  const params            = await searchParams
  const search            = params.search            ?? ''
  const page              = Number(params.page       ?? 1)
  const paymentStatus     = params.paymentStatus     ?? ''
  const fulfillmentStatus = params.fulfillmentStatus ?? ''
  const limit             = 20

  // Auth token for API calls
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const headers = { Authorization: `Bearer ${session?.access_token ?? ''}` }

  const qs = new URLSearchParams()
  if (search)            qs.set('search', search)
  if (paymentStatus)     qs.set('paymentStatus', paymentStatus)
  if (fulfillmentStatus) qs.set('fulfillmentStatus', fulfillmentStatus)
  qs.set('page', String(page))

  let orders: OrderListItem[] = []
  let total = 0
  let stats = { totalOrders: 0, totalRevenue: 0, avgOrderSize: 0, pendingPayment: 0 }

  try {
    const [listRes, statsRes] = await Promise.all([
      fetch(`${API}/api/admin/orders?${qs}`,       { headers, cache: 'no-store' }),
      fetch(`${API}/api/admin/orders/stats`,        { headers, cache: 'no-store' }),
    ])
    if (listRes.ok)  { const j = await listRes.json();  orders = j.data ?? []; total = j.total ?? 0 }
    if (statsRes.ok) { stats = await statsRes.json() }
  } catch { /* backend may not be running in dev */ }

  const totalPages = Math.ceil(total / limit)

  function buildHref(overrides: Record<string, string>) {
    const p = new URLSearchParams()
    const merged = { search, paymentStatus, fulfillmentStatus, page: String(page), ...overrides }
    Object.entries(merged).forEach(([k, v]) => { if (v) p.set(k, v) })
    return `/admin/orders?${p}`
  }

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-zinc-500">
        <Link href="/admin" className="hover:text-zinc-900">Home</Link>
        <span>›</span>
        <span className="text-zinc-900 font-medium">Orders</span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          title="Total Orders"
          value={stats.totalOrders.toLocaleString()}
          sub="All time"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
          }
        />
        <KpiCard
          title="Total Revenue"
          value={fmtMoney(stats.totalRevenue)}
          sub="Paid orders"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
          }
        />
        <KpiCard
          title="Average Order size"
          value={fmtMoney(stats.avgOrderSize)}
          sub="Per Order"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
            </svg>
          }
        />
        <KpiCard
          title="Pending Payment"
          value={stats.pendingPayment.toLocaleString()}
          sub="Orders awaiting payment"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
            </svg>
          }
        />
      </div>

      {/* Orders table */}
      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200">
          <h2 className="text-sm font-semibold text-zinc-900">Orders</h2>
          <div className="flex items-center gap-2">
            {/* Filter chips */}
            <Link
              href={paymentStatus ? buildHref({ paymentStatus: '' }) : '#'}
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition-colors ${
                paymentStatus ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-300 text-zinc-600 hover:border-zinc-500'
              }`}
            >
              {!paymentStatus && <span>+</span>} Payment {paymentStatus && `· ${paymentStatus}`}
            </Link>
            <Link
              href={fulfillmentStatus ? buildHref({ fulfillmentStatus: '' }) : '#'}
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition-colors ${
                fulfillmentStatus ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-300 text-zinc-600 hover:border-zinc-500'
              }`}
            >
              {!fulfillmentStatus && <span>+</span>} Fulfilment {fulfillmentStatus && `· ${fulfillmentStatus}`}
            </Link>

            {/* Search */}
            <form className="flex items-center gap-2 ml-2">
              {paymentStatus     && <input type="hidden" name="paymentStatus"     value={paymentStatus} />}
              {fulfillmentStatus && <input type="hidden" name="fulfillmentStatus" value={fulfillmentStatus} />}
              <div className="relative">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  name="search"
                  defaultValue={search}
                  placeholder="Search"
                  className="pl-8 pr-3 py-1.5 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-400 w-36"
                />
              </div>
              <button type="submit" className="p-1.5 rounded border border-zinc-200 text-zinc-400 hover:bg-zinc-50">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                </svg>
              </button>
            </form>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                {['Order #', 'Created ↓', 'Customer', 'Address', 'Delivery Type', 'Payment', 'Fulfillment', 'Items', 'Order Total'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-zinc-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm text-zinc-400">
                    {search ? `No orders matching "${search}"` : 'No orders yet.'}
                  </td>
                </tr>
              ) : (
                orders.map(o => {
                  const customerName = o.customers
                    ? [o.customers.first_name, o.customers.last_name].filter(Boolean).join(' ') || o.customers.email
                    : '—'
                  return (
                    <tr key={o.order_id} className="hover:bg-zinc-50">
                      <td className="px-4 py-3">
                        <Link href={`/admin/orders/${o.order_id}`} className="font-medium text-blue-600 hover:underline">
                          {o.order_number}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap">
                        {fmtDateTime(o.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        {o.customers ? (
                          <Link href={`/admin/customers/${o.customers.customer_id}`} className="text-blue-600 hover:underline text-xs">
                            {customerName}
                          </Link>
                        ) : <span className="text-zinc-400 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-600 max-w-[160px] truncate">
                        {addressSnippet(o.shipping_address_snapshot)}
                      </td>
                      <td className="px-4 py-3">
                        <DeliveryTypeCell
                          deliveryMethod={o.delivery_method}
                          fitmentCentreId={o.fitment_centre_id}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <PaymentDot status={o.payment_status} />
                      </td>
                      <td className="px-4 py-3">
                        <FulfillmentBadge status={o.fulfillment_status} />
                      </td>
                      <td className="px-4 py-3 text-zinc-600 text-center">
                        {o.order_items?.length ?? 0}
                      </td>
                      <td className="px-4 py-3 font-medium text-zinc-900 whitespace-nowrap">
                        {fmtMoney(Number(o.total_amount))}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100 bg-zinc-50 text-xs text-zinc-500">
          <span>{Math.min((page - 1) * limit + 1, total)} — {Math.min(page * limit, total)} of {total} results</span>
          <div className="flex items-center gap-3">
            <span>{page} of {totalPages || 1} pages</span>
            <div className="flex gap-1">
              {page > 1 ? (
                <Link href={buildHref({ page: String(page - 1) })} className="px-2 py-1 rounded border border-zinc-300 hover:bg-white">Prev</Link>
              ) : (
                <span className="px-2 py-1 rounded border border-zinc-200 text-zinc-300 cursor-not-allowed">Prev</span>
              )}
              {page < totalPages ? (
                <Link href={buildHref({ page: String(page + 1) })} className="px-2 py-1 rounded border border-zinc-300 hover:bg-white">Next</Link>
              ) : (
                <span className="px-2 py-1 rounded border border-zinc-200 text-zinc-300 cursor-not-allowed">Next</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
