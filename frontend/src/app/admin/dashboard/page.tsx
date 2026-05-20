'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  TrendingUp, ShoppingCart, Users, Clock,
  ArrowUpRight, Wrench, CircleDollarSign,
} from 'lucide-react'
import { AdminBreadcrumb } from '@/components/admin/AdminBreadcrumb'
import { createClient } from '@/lib/supabase/client'
import { toastError } from '@/lib/toast'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n)
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

const PAYMENT_BADGE: Record<string, string> = {
  paid:           'bg-green-50 text-green-700',
  unpaid:         'bg-amber-50 text-amber-700',
  partially_paid: 'bg-blue-50 text-blue-700',
  refunded:       'bg-zinc-100 text-zinc-500',
}

const ORDER_BADGE: Record<string, string> = {
  pending:    'bg-zinc-100 text-zinc-600',
  processing: 'bg-amber-50 text-amber-700',
  fulfilled:  'bg-green-50 text-green-700',
  cancelled:  'bg-red-50 text-red-600',
  paid:       'bg-blue-50 text-blue-700',
}

type OrderRow = {
  order_id: string; order_number: string; created_at: string
  total_amount: number; payment_status: string; order_status: string
  customers?: { first_name?: string | null; last_name?: string | null } | null
}

type CustomerRow = {
  customer_id: string; email: string
  first_name?: string | null; last_name?: string | null
}

type CentreRow = {
  fitment_id: string; business_name: string; partner_id: string
  is_active: boolean; profiles?: { email?: string } | null
}

type OrderStats    = { totalOrders: number; totalRevenue: number; avgOrderSize: number; pendingPayment: number }
type CustomerStats = { totalCustomers: number }

const STATUS_ROWS = [
  { label: 'Processing', key: 'processing', dot: 'bg-amber-500' },
  { label: 'Fulfilled',  key: 'fulfilled',  dot: 'bg-green-500' },
  { label: 'Pending',    key: 'pending',    dot: 'bg-zinc-400'  },
  { label: 'Cancelled',  key: 'cancelled',  dot: 'bg-red-500'   },
]

export default function AdminDashboard() {
  const [orderStats,    setOrderStats]    = useState<OrderStats>({ totalOrders: 0, totalRevenue: 0, avgOrderSize: 0, pendingPayment: 0 })
  const [customerStats, setCustomerStats] = useState<CustomerStats>({ totalCustomers: 0 })
  const [recentOrders,  setRecentOrders]  = useState<OrderRow[]>([])
  const [recentCustomers, setRecentCustomers] = useState<CustomerRow[]>([])
  const [centres,       setCentres]       = useState<CentreRow[]>([])
  const [loading,       setLoading]       = useState(true)

  useEffect(() => { document.title = 'Dashboard | Tyre Vault' }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const { data: { session } } = await createClient().auth.getSession()
        const tok = session?.access_token ?? ''
        const headers = { Authorization: `Bearer ${tok}` }

        const [statsRes, ordersRes, custStatsRes, custsRes, centresRes] = await Promise.all([
          fetch(`${API}/api/admin/orders/stats`,           { headers }),
          fetch(`${API}/api/admin/orders?page=1`,           { headers }),
          fetch(`${API}/api/admin/customers/stats`,         { headers }),
          fetch(`${API}/api/admin/customers?page=1`,        { headers }),
          fetch(`${API}/api/admin/fitment-centres?page=1`,  { headers }),
        ])

        if (!statsRes.ok) {
          const body = await statsRes.json().catch(() => ({}))
          throw new Error(body.error ?? `API returned ${statsRes.status}`)
        }

        const [statsData, ordersData, custStatsData, custsData, centresData] = await Promise.all([
          statsRes.json(),
          ordersRes.ok    ? ordersRes.json()    : Promise.resolve({}),
          custStatsRes.ok ? custStatsRes.json() : Promise.resolve({}),
          custsRes.ok     ? custsRes.json()     : Promise.resolve({}),
          centresRes.ok   ? centresRes.json()   : Promise.resolve([]),
        ])

        if (!cancelled) {
          setOrderStats(statsData)
          setRecentOrders((ordersData.data ?? []).slice(0, 6))
          setCustomerStats(custStatsData)
          setRecentCustomers((custsData.customers ?? []).slice(0, 5))
          setCentres(centresData.data ?? centresData)
        }
      } catch (err) {
        if (!cancelled) toastError(err instanceof Error ? err.message : 'Failed to load dashboard')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const activeCentres = centres.filter(c => c.is_active).length
  const statusCounts  = recentOrders.reduce<Record<string, number>>((acc, o) => {
    acc[o.order_status] = (acc[o.order_status] ?? 0) + 1
    return acc
  }, {})

  const kpis = [
    { label: 'Total Revenue',   value: fmtCurrency(orderStats.totalRevenue),         sub: `Avg ${fmtCurrency(orderStats.avgOrderSize)} / order`,  icon: CircleDollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Total Orders',    value: orderStats.totalOrders.toLocaleString(),       sub: `${orderStats.pendingPayment} pending payment`,         icon: ShoppingCart,     color: 'text-primary',    bg: 'bg-primary/10' },
    { label: 'Customers',       value: customerStats.totalCustomers.toLocaleString(), sub: 'Registered accounts',                                  icon: Users,            color: 'text-blue-600',   bg: 'bg-blue-50'    },
    { label: 'Fitment Centres', value: activeCentres.toString(),                      sub: `of ${centres.length} centres active`,                  icon: Wrench,           color: 'text-violet-600', bg: 'bg-violet-50'  },
  ]

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-5">
        <div className="h-8 w-40 bg-zinc-100 rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-zinc-100 rounded-2xl animate-pulse" />)}
        </div>
        <div className="h-64 bg-zinc-100 rounded-2xl animate-pulse" />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 sm:space-y-7">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Here&apos;s what&apos;s happening today.</p>
        </div>
        <span className="hidden sm:block text-xs text-zinc-400">
          {new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(({ label, value, sub, icon: Icon, color, bg }) => (
          <div key={label} className="group rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-default">
            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${bg} mb-4 group-hover:scale-110 transition-transform duration-200`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <p className="text-2xl font-bold text-zinc-900 leading-none tracking-tight">{value}</p>
            <p className="text-xs text-zinc-500 mt-1.5 font-medium">{label}</p>
            <p className="text-xs text-zinc-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-zinc-400" />
              <h2 className="text-sm font-semibold text-zinc-900">Recent Orders</h2>
            </div>
            <Link href="/admin/orders" className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors">
              View all <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50">
                  <th className="px-5 py-2.5 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide whitespace-nowrap">Order</th>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide whitespace-nowrap">Customer</th>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide whitespace-nowrap">Amount</th>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide whitespace-nowrap">Payment</th>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide whitespace-nowrap">Status</th>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide whitespace-nowrap">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <ShoppingCart className="w-8 h-8 text-zinc-200" />
                        <p className="text-sm text-zinc-400">No orders yet.</p>
                      </div>
                    </td>
                  </tr>
                ) : recentOrders.map(o => (
                  <tr key={o.order_id} className="even:bg-zinc-50/40 hover:bg-amber-50/30 transition-colors duration-150">
                    <td className="px-5 py-3">
                      <Link href={`/admin/orders/${o.order_id}`} className="font-mono text-xs font-semibold text-primary hover:text-primary/80">
                        {o.order_number}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-xs text-zinc-700 whitespace-nowrap">
                      {[o.customers?.first_name, o.customers?.last_name].filter(Boolean).join(' ') || '—'}
                    </td>
                    <td className="px-5 py-3 text-xs font-medium text-zinc-900 whitespace-nowrap">
                      {fmtCurrency(o.total_amount)}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${PAYMENT_BADGE[o.payment_status] ?? 'bg-zinc-100 text-zinc-600'}`}>
                        {o.payment_status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${ORDER_BADGE[o.order_status] ?? 'bg-zinc-100 text-zinc-600'}`}>
                        {o.order_status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-zinc-500 whitespace-nowrap">
                      {fmtDate(o.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-zinc-400" />
              <h2 className="text-sm font-semibold text-zinc-900">Order Breakdown</h2>
            </div>
            <div className="space-y-2.5">
              {STATUS_ROWS.map(({ label, key, dot }) => {
                const count = statusCounts[key] ?? 0
                const pct   = recentOrders.length > 0 ? Math.round((count / recentOrders.length) * 100) : 0
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${dot}`} />
                        <span className="text-xs text-zinc-600">{label}</span>
                      </div>
                      <span className="text-xs font-medium text-zinc-900">{count}</span>
                    </div>
                    <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${dot} transition-all duration-700`} style={{ width: `${pct}%` } as React.CSSProperties} />
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-zinc-100 flex justify-between text-xs text-zinc-500">
              <span>Total orders</span>
              <span className="font-semibold text-zinc-900">{orderStats.totalOrders.toLocaleString()}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/60 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-amber-600" />
              <p className="text-sm font-semibold text-amber-800">Pending Payments</p>
            </div>
            <p className="text-2xl font-bold text-amber-900">{orderStats.pendingPayment}</p>
            <p className="text-xs text-amber-700 mt-0.5">Orders awaiting payment confirmation</p>
            <Link href="/admin/orders" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-amber-800 hover:text-amber-900">
              Review orders <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-zinc-400" />
              <h2 className="text-sm font-semibold text-zinc-900">Recent Customers</h2>
            </div>
            <Link href="/admin/customers" className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors">
              View all <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <ul className="divide-y divide-zinc-100">
            {recentCustomers.length === 0 ? (
              <li className="px-5 py-12 text-center">
                <div className="flex flex-col items-center gap-2">
                  <Users className="w-8 h-8 text-zinc-200" />
                  <p className="text-sm text-zinc-400">No customers yet.</p>
                </div>
              </li>
            ) : recentCustomers.map(c => {
              const AVATAR_COLORS = ['bg-blue-100 text-blue-700','bg-purple-100 text-purple-700','bg-green-100 text-green-700','bg-amber-100 text-amber-700','bg-rose-100 text-rose-700']
              const avatarCls = AVATAR_COLORS[c.email.charCodeAt(0) % AVATAR_COLORS.length]
              return (
              <li key={c.customer_id} className="flex items-center justify-between px-5 py-3 hover:bg-zinc-50/80 transition-colors duration-150">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${avatarCls}`}>
                    {(c.first_name?.[0] ?? c.email[0]).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-900 truncate">
                      {[c.first_name, c.last_name].filter(Boolean).join(' ') || '—'}
                    </p>
                    <p className="text-xs text-zinc-500 truncate">{c.email}</p>
                  </div>
                </div>
                <Link href={`/admin/customers/${c.customer_id}`} className="shrink-0 ml-3 text-xs text-primary hover:text-primary/80 font-medium">
                  View →
                </Link>
              </li>
              )
            })}
          </ul>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-zinc-400" />
              <h2 className="text-sm font-semibold text-zinc-900">Fitment Centres</h2>
            </div>
            <Link href="/admin/fitters" className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors">
              View all <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <ul className="divide-y divide-zinc-100">
            {centres.length === 0 ? (
              <li className="px-5 py-12 text-center">
                <div className="flex flex-col items-center gap-2">
                  <Wrench className="w-8 h-8 text-zinc-200" />
                  <p className="text-sm text-zinc-400">No fitment centres yet.</p>
                </div>
              </li>
            ) : centres.slice(0, 5).map((c, i) => (
              <li key={c.fitment_id ?? i} className="flex items-center justify-between px-5 py-3 hover:bg-zinc-50/80 transition-colors duration-150">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-900 truncate">{c.business_name}</p>
                  <p className="text-xs text-zinc-500 truncate">{c.partner_id} · {c.profiles?.email}</p>
                </div>
                <span className={`shrink-0 ml-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                  c.is_active ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${c.is_active ? 'bg-green-500' : 'bg-amber-500'}`} />
                  {c.is_active ? 'Active' : 'Hold'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
