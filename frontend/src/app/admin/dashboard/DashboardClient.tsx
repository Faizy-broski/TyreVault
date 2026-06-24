'use client'

import Link from 'next/link'
import {
  TrendingUp, ShoppingCart, CircleDollarSign, Sparkles, ArrowUpRight,
} from 'lucide-react'
import {
  useOrderStats, useOrderList,
  type OrderStats, type OrderListResponse,
} from '@/lib/query/hooks'

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n)
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

const PAYMENT_BADGE: Record<string, { label: string; cls: string }> = {
  paid:           { label: 'Paid',    cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  unpaid:         { label: 'Unpaid',  cls: 'bg-amber-50  text-amber-700  ring-1 ring-amber-200'    },
  partially_paid: { label: 'Partial', cls: 'bg-blue-50   text-blue-700   ring-1 ring-blue-200'     },
  refunded:       { label: 'Refunded',cls: 'bg-zinc-100  text-zinc-500   ring-1 ring-zinc-200'     },
}

const ORDER_BADGE: Record<string, string> = {
  pending:    'bg-zinc-100  text-zinc-600  ring-1 ring-zinc-200',
  processing: 'bg-amber-50  text-amber-700 ring-1 ring-amber-200',
  fulfilled:  'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  cancelled:  'bg-red-50    text-red-600   ring-1 ring-red-200',
  paid:       'bg-blue-50   text-blue-700  ring-1 ring-blue-200',
}

type OrderRow = {
  order_id: string; order_number: string; created_at: string
  total_amount: number; payment_status: string; order_status: string
  customers?: { first_name?: string | null; last_name?: string | null } | null
}

const STATUS_ROWS = [
  { label: 'Processing', key: 'processing', dot: 'bg-amber-500',   bar: 'from-amber-400 to-amber-500'     },
  { label: 'Fulfilled',  key: 'fulfilled',  dot: 'bg-emerald-500', bar: 'from-emerald-400 to-emerald-500' },
  { label: 'Pending',    key: 'pending',    dot: 'bg-zinc-400',    bar: 'from-zinc-300 to-zinc-400'       },
  { label: 'Cancelled',  key: 'cancelled',  dot: 'bg-red-500',     bar: 'from-red-400 to-red-500'         },
]

const EMPTY_ORDER_STATS: OrderStats = { totalOrders: 0, totalRevenue: 0, avgOrderSize: 0, pendingPayment: 0 }

type Props = {
  initialOrderStats?: OrderStats
  initialOrders?:     OrderListResponse
  userName?:          string
}

export default function DashboardClient({ initialOrderStats, initialOrders, userName }: Props) {
  const orderStatsQ = useOrderStats({ initialData: initialOrderStats })
  const ordersQ     = useOrderList(
    { page: 1, search: '', paymentStatus: '', fulfillmentStatus: '' },
    { initialData: initialOrders },
  )

  const loading = orderStatsQ.isPending || ordersQ.isPending

  const orderStats   = orderStatsQ.data ?? EMPTY_ORDER_STATS
  const recentOrders = (ordersQ.data?.data?.slice(0, 8) ?? []) as OrderRow[]

  const statusCounts = recentOrders.reduce<Record<string, number>>((acc, o) => {
    acc[o.order_status] = (acc[o.order_status] ?? 0) + 1
    return acc
  }, {})

  const kpis = [
    {
      label: 'Total Revenue', value: fmtCurrency(orderStats.totalRevenue),
      sub: `Avg ${fmtCurrency(orderStats.avgOrderSize)} / order`,
      icon: CircleDollarSign, iconBg: 'bg-green-500', topBar: 'from-green-400 to-green-600',
    },
    {
      label: 'Total Orders', value: orderStats.totalOrders.toLocaleString(),
      sub: `${orderStats.pendingPayment} awaiting payment`,
      icon: ShoppingCart, iconBg: 'bg-primary', topBar: 'from-primary to-yellow-500',
    },
  ]

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <div className="h-8 w-48 bg-zinc-100 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2].map(i => <div key={i} className="h-36 bg-zinc-100 rounded-2xl animate-pulse" />)}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="xl:col-span-2 h-72 bg-zinc-100 rounded-2xl animate-pulse" />
          <div className="h-72 bg-zinc-100 rounded-2xl animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-zinc-50/50 min-h-full">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-yellow-500 flex items-center justify-center shadow-sm shrink-0">
            <Sparkles className="w-4 h-4 text-zinc-900" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 leading-tight">
              {userName ? `Welcome back, ${userName}` : 'Dashboard'}
            </h1>
            <p className="text-xs text-zinc-500">Here&apos;s what&apos;s happening today.</p>
          </div>
        </div>
        <div className="hidden sm:flex flex-col items-end" suppressHydrationWarning>
          <span className="text-xs font-semibold text-zinc-600" suppressHydrationWarning>
            {new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
          <span className="text-[10px] text-zinc-400 mt-0.5">Last updated just now</span>
        </div>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {kpis.map(({ label, value, sub, icon: Icon, iconBg, topBar }) => (
          <div
            key={label}
            className="flex flex-col relative rounded-2xl bg-white shadow-sm border border-zinc-200/60 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group"
          >
            <div className={`h-1.5 w-full bg-gradient-to-r ${topBar}`} />
            <div className="p-6 flex-1 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-6">
                <p className="text-sm font-semibold text-zinc-500 tracking-wide uppercase">{label}</p>
                <div className={`w-12 h-12 rounded-[14px] ${iconBg} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>
              <div>
                <p className="text-3xl font-extrabold text-zinc-900 tracking-tight leading-none mb-2">{value}</p>
                <div className="flex items-center gap-1.5 text-[13px] font-medium text-zinc-500">
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-300" />
                  {sub}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Orders table + Breakdown ────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* Recent Orders */}
        <div className="xl:col-span-2 flex flex-col rounded-2xl bg-white border border-zinc-200 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary to-yellow-400" />
          <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-200 bg-zinc-50/50 mt-1.5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-[10px] bg-primary/10 flex items-center justify-center border border-primary/20">
                <ShoppingCart className="w-4 h-4 text-primary" />
              </div>
              <h2 className="text-base font-bold text-zinc-900">Recent Orders</h2>
            </div>
            <Link
              href="/admin/orders"
              className="flex items-center gap-1.5 text-[13px] font-bold text-primary hover:text-primary/80 transition-colors bg-white hover:bg-primary/5 border border-primary/20 rounded-xl px-3 py-1.5 shadow-sm"
            >
              View all <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200/80 bg-zinc-50">
                  {['Order', 'Customer', 'Amount', 'Payment', 'Status', 'Date'].map(h => (
                    <th key={h} className="px-6 py-3.5 text-left text-[11px] font-bold text-zinc-500 uppercase tracking-widest whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <ShoppingCart className="w-10 h-10 text-zinc-200 mx-auto mb-3" />
                      <p className="text-[13px] font-medium text-zinc-400">No orders yet.</p>
                    </td>
                  </tr>
                ) : recentOrders.map(o => (
                  <tr key={o.order_id} className="hover:bg-zinc-50/80 transition-colors duration-150 group">
                    <td className="px-6 py-4">
                      <Link href={`/admin/orders/${o.order_id}`}
                        className="font-mono text-[13px] font-bold text-primary group-hover:text-primary/70 transition-colors">
                        #{o.order_number}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-[13px] font-medium text-zinc-700 whitespace-nowrap">
                      {[o.customers?.first_name, o.customers?.last_name].filter(Boolean).join(' ') || '—'}
                    </td>
                    <td className="px-6 py-4 text-[13px] font-bold text-zinc-900 whitespace-nowrap">
                      {fmtCurrency(o.total_amount)}
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        const b = PAYMENT_BADGE[o.payment_status]
                        return (
                          <span className={`inline-flex items-center rounded-md px-2 py-1 text-[11px] font-bold tracking-wide uppercase ${b?.cls ?? 'bg-zinc-100 text-zinc-600'}`}>
                            {b?.label ?? o.payment_status.replace('_', ' ')}
                          </span>
                        )
                      })()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-md px-2 py-1 text-[11px] font-bold tracking-wide uppercase ${ORDER_BADGE[o.order_status] ?? 'bg-zinc-100 text-zinc-600'}`}>
                        {o.order_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[13px] font-medium text-zinc-400 whitespace-nowrap">
                      {fmtDate(o.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Order Breakdown */}
        <div className="rounded-2xl bg-white border border-zinc-200 shadow-sm hover:shadow-md transition-shadow duration-300 p-6 relative overflow-hidden flex flex-col pt-7">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 to-indigo-400" />
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-[10px] bg-indigo-50 flex items-center justify-center border border-indigo-100/50">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
            </div>
            <h2 className="text-base font-bold text-zinc-900">Order Breakdown</h2>
          </div>
          <div className="space-y-5 flex-1">
            {STATUS_ROWS.map(({ label, key, dot, bar }) => {
              const count = statusCounts[key] ?? 0
              const pct   = recentOrders.length > 0 ? Math.round((count / recentOrders.length) * 100) : 0
              return (
                <div key={key} className="group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${dot} shadow-sm group-hover:scale-110 transition-transform`} />
                      <span className="text-[13px] font-semibold text-zinc-700">{label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-medium text-zinc-400 bg-zinc-50 px-2 py-0.5 rounded-md">{pct}%</span>
                      <span className="text-[13px] font-bold text-zinc-900 w-5 text-right">{count}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${bar} transition-all duration-1000 ease-out`}
                      style={{ width: `${pct}%` } as React.CSSProperties}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-8 pt-5 border-t border-dashed border-zinc-200 flex justify-between items-center bg-zinc-50/50 -mx-6 -mb-6 px-6 py-4">
            <span className="text-[13px] font-semibold text-zinc-500 uppercase tracking-wide">Total orders</span>
            <span className="text-xl font-extrabold text-zinc-900">{orderStats.totalOrders.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
