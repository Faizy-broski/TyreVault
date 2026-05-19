'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { OrderListItem, PaymentStatus, OrderStatus } from '@/types/admin.types'
import OrderFiltersBar from '@/components/admin/orders/OrderFiltersBar'
import { AdminBreadcrumb } from '@/components/admin/AdminBreadcrumb'
import { Button } from '@/components/ui/button'
import { toastError } from '@/lib/toast'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

// ── Badge helpers ──────────────────────────────────────────────────────────

function PaymentDot({ status }: { status: PaymentStatus }) {
  const dot: Record<PaymentStatus, string>   = { paid: 'bg-green-500', unpaid: 'bg-amber-500', partially_paid: 'bg-blue-500', refunded: 'bg-zinc-400' }
  const label: Record<PaymentStatus, string> = { paid: 'Paid', unpaid: 'Unpaid', partially_paid: 'Partial', refunded: 'Refunded' }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-zinc-700">
      <span className={`w-2 h-2 rounded-full ${dot[status] ?? dot.unpaid}`} />
      {label[status] ?? status}
    </span>
  )
}

function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const map: Record<OrderStatus, string> = {
    pending:    'bg-zinc-100 text-zinc-600 border-zinc-200',
    paid:       'bg-blue-50 text-blue-700 border-blue-200',
    processing: 'bg-amber-50 text-amber-700 border-amber-200',
    fulfilled:  'bg-green-50 text-green-700 border-green-200',
    cancelled:  'bg-red-50 text-red-700 border-red-200',
    refunded:   'bg-zinc-100 text-zinc-600 border-zinc-200',
  }
  const label: Record<OrderStatus, string> = {
    pending: 'Pending', paid: 'Paid', processing: 'Processing',
    fulfilled: 'Fulfilled', cancelled: 'Cancelled', refunded: 'Refunded',
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${map[status] ?? 'bg-zinc-100 text-zinc-600 border-zinc-200'}`}>
      {label[status] ?? status}
    </span>
  )
}

function DeliveryTypeCell({ orderType, fitmentId }: { orderType: string | null; fitmentId: string | null }) {
  if (!orderType || orderType === 'home_delivery' || orderType === 'shipping') {
    return <span className="text-xs text-zinc-700">Home Delivery</span>
  }
  return (
    <span className="flex flex-col gap-0.5 text-xs">
      <span className="text-zinc-700">Fitment Centre</span>
      {fitmentId && (
        <Link href={`/admin/fitters/${fitmentId}`} className="text-primary hover:underline">
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

function KpiCard({ title, value, sub, icon }: { title: string; value: string; sub: string; icon: React.ReactNode }) {
  return (
    <div className="group rounded-2xl border border-zinc-200 bg-white p-5 flex items-start justify-between shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-default">
      <div>
        <p className="text-sm text-zinc-500 mb-2">{title}</p>
        <p className="text-2xl font-bold text-zinc-900 tracking-tight">{value}</p>
        <p className="text-xs text-zinc-400 mt-1">{sub}</p>
      </div>
      <div className="p-2.5 rounded-xl bg-zinc-50 text-zinc-400 group-hover:bg-primary/10 group-hover:text-primary transition-all duration-200 shrink-0">
        {icon}
      </div>
    </div>
  )
}

const LIMIT = 20

export default function OrdersPage() {
  const searchParams    = useSearchParams()
  const router          = useRouter()
  const pathname        = usePathname()

  const search            = searchParams.get('search')            ?? ''
  const page              = Number(searchParams.get('page')        ?? 1)
  const paymentStatus     = searchParams.get('paymentStatus')     ?? ''
  const fulfillmentStatus = searchParams.get('fulfillmentStatus') ?? ''

  const [orders, setOrders]   = useState<OrderListItem[]>([])
  const [total, setTotal]     = useState(0)
  const [stats, setStats]     = useState({ totalOrders: 0, totalRevenue: 0, avgOrderSize: 0, pendingPayment: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => { document.title = 'Orders | Tyre Vault' }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { session } } = await createClient().auth.getSession()
      const token = session?.access_token ?? ''
      const headers = { Authorization: `Bearer ${token}` }

      const qs = new URLSearchParams()
      if (search)            qs.set('search', search)
      if (paymentStatus)     qs.set('paymentStatus', paymentStatus)
      if (fulfillmentStatus) qs.set('fulfillmentStatus', fulfillmentStatus)
      qs.set('page', String(page))

      const [listRes, statsRes] = await Promise.all([
        fetch(`${API}/api/admin/orders?${qs}`, { headers }),
        fetch(`${API}/api/admin/orders/stats`,  { headers }),
      ])

      if (!listRes.ok)  throw new Error(`Orders API ${listRes.status}: ${await listRes.text()}`)
      if (!statsRes.ok) throw new Error(`Stats API ${statsRes.status}: ${await statsRes.text()}`)

      const listJson  = await listRes.json()
      const statsJson = await statsRes.json()

      setOrders(listJson.data ?? [])
      setTotal(listJson.total ?? 0)
      setStats(statsJson)
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }, [search, page, paymentStatus, fulfillmentStatus])

  useEffect(() => { load() }, [load])

  const totalPages = Math.ceil(total / LIMIT)

  function buildHref(overrides: Record<string, string>) {
    const p = new URLSearchParams()
    const merged = { search, paymentStatus, fulfillmentStatus, page: String(page), ...overrides }
    Object.entries(merged).forEach(([k, v]) => { if (v) p.set(k, v) })
    return `${pathname}?${p}`
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
      <AdminBreadcrumb crumbs={[{ label: 'Orders' }]} />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {loading ? (
          <>
            {[1,2,3,4].map(i => (
              <div key={i} className="rounded-2xl border border-zinc-200 bg-white p-5">
                <div className="h-4 w-28 bg-zinc-100 rounded animate-pulse mb-3" />
                <div className="h-7 w-24 bg-zinc-100 rounded animate-pulse mb-2" />
                <div className="h-3 w-20 bg-zinc-100 rounded animate-pulse" />
              </div>
            ))}
          </>
        ) : (
          <>
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
              title="Average Order Size"
              value={fmtMoney(stats.avgOrderSize)}
              sub="Per order"
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
          </>
        )}
      </div>

      {/* Orders table */}
      <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-zinc-200">
          <h2 className="text-sm font-semibold text-zinc-900">Orders</h2>
          <div className="flex flex-wrap items-center gap-2">
            <OrderFiltersBar
              search={search}
              paymentStatus={paymentStatus}
              fulfillmentStatus={fulfillmentStatus}
            />
            <form className="flex items-center gap-2" onSubmit={e => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget)
              const p  = new URLSearchParams(searchParams.toString())
              const s  = fd.get('search') as string
              if (s) p.set('search', s); else p.delete('search')
              p.set('page', '1')
              router.push(`${pathname}?${p}`)
            }}>
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
                  className="pl-8 pr-3 py-1.5 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 w-36"
                />
              </div>
              <Button type="submit" variant="outline" size="icon-sm" aria-label="Apply filters">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                </svg>
              </Button>
            </form>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                {['Order #', 'Created ↓', 'Customer', 'Address', 'Delivery Type', 'Payment', 'Fulfillment', 'Items', 'Order Total'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <>
                  {[1,2,3,4,5,6,7,8].map(i => (
                    <tr key={i}>
                      <td className="px-4 py-3.5"><div className="h-4 w-20 bg-zinc-100 rounded animate-pulse" /></td>
                      <td className="px-4 py-3.5"><div className="h-4 w-28 bg-zinc-100 rounded animate-pulse" /></td>
                      <td className="px-4 py-3.5"><div className="h-4 w-32 bg-zinc-100 rounded animate-pulse" /></td>
                      <td className="px-4 py-3.5"><div className="h-4 w-40 bg-zinc-100 rounded animate-pulse" /></td>
                      <td className="px-4 py-3.5"><div className="h-4 w-24 bg-zinc-100 rounded animate-pulse" /></td>
                      <td className="px-4 py-3.5"><div className="h-5 w-16 bg-zinc-100 rounded-full animate-pulse" /></td>
                      <td className="px-4 py-3.5"><div className="h-5 w-20 bg-zinc-100 rounded-full animate-pulse" /></td>
                      <td className="px-4 py-3.5"><div className="h-4 w-8 bg-zinc-100 rounded animate-pulse" /></td>
                      <td className="px-4 py-3.5"><div className="h-4 w-16 bg-zinc-100 rounded animate-pulse" /></td>
                    </tr>
                  ))}
                </>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2 mx-auto">
                      <svg className="w-10 h-10 text-zinc-200" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                      </svg>
                      <p className="text-sm font-medium text-zinc-400">{search ? `No orders matching "${search}"` : 'No orders yet.'}</p>
                      {search && <p className="text-xs text-zinc-300">Try adjusting your search or filters.</p>}
                    </div>
                  </td>
                </tr>
              ) : orders.map(o => {
                const customerName = o.customers
                  ? [o.customers.first_name, o.customers.last_name].filter(Boolean).join(' ') || o.customers.email
                  : '—'
                return (
                  <tr key={o.order_id} className="even:bg-zinc-50/40 hover:bg-amber-50/30 transition-colors duration-150">
                    <td className="px-4 py-3">
                      <Link href={`/admin/orders/${o.order_id}`} className="font-medium text-primary hover:underline">
                        {o.order_number}
                      </Link>
                    </td>
                    {/* <td className="px-4 py-3 text-xs text-zinc-500">
                      {fmtDateTime(o.created_at)}
                    </td> */}
                    <td className="px-4 py-3 text-xs text-zinc-500">
  <div className="flex flex-col">
    <span>
      {new Date(o.created_at).toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })}
    </span>

    <span className="text-zinc-400">
      {new Date(o.created_at).toLocaleTimeString('en-AU', {
        hour: '2-digit',
        minute: '2-digit',
      })}
    </span>
  </div>
</td>
                    <td className="px-4 py-3">
                      {o.customers ? (
                        <Link href={`/admin/customers/${o.customers.customer_id}`} className="text-primary hover:underline text-xs">
                          {customerName}
                        </Link>
                      ) : <span className="text-zinc-400 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-600 max-w-40 truncate">
                      {addressSnippet(o.shipping_address_snapshot)}
                    </td>
                    <td className="px-4 py-3">
                      <DeliveryTypeCell orderType={o.order_type} fitmentId={o.fitment_id} />
                    </td>
                    <td className="px-4 py-3">
                      <PaymentDot status={o.payment_status} />
                    </td>
                    <td className="px-4 py-3">
                      <OrderStatusBadge status={o.order_status} />
                    </td>
                    <td className="px-4 py-3 text-zinc-600 text-center">
                      {o.order_items?.length ?? 0}
                    </td>
                    <td className="px-4 py-3 font-medium text-zinc-900 whitespace-nowrap">
                      {fmtMoney(Number(o.total_amount))}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100 bg-zinc-50 text-xs text-zinc-500">
          <span>
            {total === 0 ? '0 results' : `${Math.min((page - 1) * LIMIT + 1, total)} — ${Math.min(page * LIMIT, total)} of ${total} results`}
          </span>
          <div className="flex items-center gap-3">
            <span>{page} of {totalPages || 1} pages</span>
            <div className="flex gap-1">
              {page > 1 ? (
                <Link href={buildHref({ page: String(page - 1) })} className="px-3 py-1.5 rounded-lg border border-zinc-300 hover:bg-white hover:border-zinc-400 transition-colors text-xs font-medium">Prev</Link>
              ) : (
                <span className="px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-300 cursor-not-allowed text-xs">Prev</span>
              )}
              {page < totalPages ? (
                <Link href={buildHref({ page: String(page + 1) })} className="px-3 py-1.5 rounded-lg border border-zinc-300 hover:bg-white hover:border-zinc-400 transition-colors text-xs font-medium">Next</Link>
              ) : (
                <span className="px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-300 cursor-not-allowed text-xs">Next</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
