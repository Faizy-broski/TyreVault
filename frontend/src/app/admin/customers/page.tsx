import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { CustomerListItem } from '@/types/admin.types'

export const metadata = { title: 'Customers — Onyx Admin' }

interface Props {
  searchParams: Promise<{ search?: string; page?: string; accountType?: string }>
}

function AccountBadge({ isGuest }: { isGuest: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
      isGuest
        ? 'bg-amber-50 text-amber-700'
        : 'bg-green-50 text-green-700'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isGuest ? 'bg-amber-500' : 'bg-green-500'}`} />
      {isGuest ? 'Guest' : 'Registered'}
    </span>
  )
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-AU', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtAUD(n: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(n)
}

function KpiCard({ label, value, sub, icon }: {
  label: string; value: React.ReactNode; sub: string; icon: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm text-zinc-500">{label}</p>
        <div className="text-zinc-400">{icon}</div>
      </div>
      <p className="text-3xl font-bold text-zinc-900">{value}</p>
      <p className="text-xs text-zinc-400 mt-1">{sub}</p>
    </div>
  )
}

export default async function CustomersPage({ searchParams }: Props) {
  const params      = await searchParams
  const search      = params.search ?? ''
  const page        = Number(params.page ?? 1)
  const accountType = params.accountType as 'guest' | 'registered' | undefined
  const limit       = 20

  const supabase = await createClient()

  // KPI stats
  const [customerCount, orderAgg] = await Promise.all([
    supabase.from('customers').select('customer_id', { count: 'exact', head: true }),
    supabase.from('orders').select('total_amount, order_id', { count: 'exact' }),
  ])
  const totalCustomers = customerCount.count ?? 0
  const totalOrders    = orderAgg.count ?? 0
  const totalRevenue   = (orderAgg.data ?? []).reduce((s, o: any) => s + (Number(o.total_amount) ?? 0), 0)
  const avgOrderSize   = totalOrders > 0 ? totalRevenue / totalOrders : 0

  // Customer list
  let query = supabase
    .from('customers')
    .select('customer_id, email, first_name, last_name, company, phone, created_at, profile_id', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (search)                       query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`)
  if (accountType === 'guest')       query = query.is('profile_id', null)
  if (accountType === 'registered')  query = query.not('profile_id', 'is', null)

  const { data: rawCustomers, count } = await query
  const customers = (rawCustomers ?? []) as unknown as CustomerListItem[]
  const totalPages = Math.ceil((count ?? 0) / limit)

  // Order aggregation per customer (for Orders + Total Value + Last Order columns)
  const customerIds = customers.map(c => c.customer_id)
  const ordersByCustomer: Record<string, { count: number; total: number; lastNumber: string | null; lastDate: string | null }> = {}

  if (customerIds.length > 0) {
    const { data: orderRows } = await supabase
      .from('orders')
      .select('customer_id, total_amount, order_number, created_at')
      .in('customer_id', customerIds)
      .order('created_at', { ascending: false })

    for (const o of (orderRows ?? []) as any[]) {
      const cid = o.customer_id as string
      if (!ordersByCustomer[cid]) {
        ordersByCustomer[cid] = { count: 0, total: 0, lastNumber: null, lastDate: null }
      }
      ordersByCustomer[cid].count++
      ordersByCustomer[cid].total += Number(o.total_amount) ?? 0
      if (!ordersByCustomer[cid].lastNumber) {
        ordersByCustomer[cid].lastNumber = (o as any).order_number ?? null
        ordersByCustomer[cid].lastDate   = (o as any).created_at   ?? null
      }
    }
  }

  const qs = (extra: Record<string, string>) => {
    const p = new URLSearchParams()
    if (search)      p.set('search', search)
    if (accountType) p.set('accountType', accountType)
    if (page > 1)    p.set('page', String(page))
    Object.entries(extra).forEach(([k, v]) => v ? p.set(k, v) : p.delete(k))
    return p.toString() ? `?${p.toString()}` : ''
  }

  return (
    <div className="p-6 space-y-5">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-zinc-400">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
        <span>/</span>
        <span className="text-zinc-700 font-medium">Customer</span>
      </nav>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          label="Total Customer"
          value={totalCustomers}
          sub="Active customers"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
          }
        />
        <KpiCard
          label="Total Orders"
          value={totalOrders}
          sub="All orders"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <KpiCard
          label="Average Order size"
          value={fmtAUD(avgOrderSize)}
          sub={`From ${totalOrders} orders`}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
            </svg>
          }
        />
        <KpiCard
          label="Total Revenue"
          value={fmtAUD(totalRevenue)}
          sub="From all orders"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          }
        />
      </div>

      {/* Table card */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        {/* Table header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <h2 className="text-sm font-semibold text-zinc-900">Customers</h2>
          <button className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Create
          </button>
        </div>

        {/* Filters + search */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-zinc-100">
          <Link
            href={`/admin/customers${qs({ accountType: accountType === 'guest' ? '' : 'guest', page: '1' })}`}
            className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition-colors ${
              accountType === 'guest'
                ? 'border-zinc-900 bg-zinc-900 text-white'
                : 'border-zinc-300 text-zinc-600 hover:border-zinc-500'
            }`}
          >
            <span className="text-zinc-400">+</span> Account
          </Link>
          <Link
            href={`/admin/customers${qs({ page: '1' })}`}
            className="flex items-center gap-1 rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-600 hover:border-zinc-500 transition-colors"
          >
            <span className="text-zinc-400">+</span> Created
          </Link>
          <div className="flex-1" />
          <form className="flex items-center gap-2">
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                name="search"
                defaultValue={search}
                placeholder="Search"
                className="pl-8 pr-3 py-1.5 text-xs border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400/30 focus:border-yellow-400 w-44"
              />
            </div>
            <button type="submit" className="p-1.5 rounded-md border border-zinc-300 hover:bg-zinc-50 text-zinc-500">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
              </svg>
            </button>
          </form>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50">
              <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">ID</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Email</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">
                <span className="flex items-center gap-1">
                  Name
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Account</th>
              <th className="px-5 py-3 text-right text-xs font-medium text-zinc-500">Orders</th>
              <th className="px-5 py-3 text-right text-xs font-medium text-zinc-500">Total Value</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Last Order</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Created</th>
              <th className="px-5 py-3 w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {customers.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-5 py-10 text-center text-sm text-zinc-400">
                  {search ? `No customers matching "${search}"` : 'No customers yet.'}
                </td>
              </tr>
            ) : (
              customers.map((c, idx) => {
                const agg  = ordersByCustomer[c.customer_id]
                const displayId = `CUST-${String((page - 1) * limit + idx + 1).padStart(3, '0')}`
                return (
                  <tr key={c.customer_id} className="hover:bg-zinc-50">
                    <td className="px-5 py-3 text-xs font-mono text-zinc-500">{displayId}</td>
                    <td className="px-5 py-3 text-xs text-zinc-600">{c.email}</td>
                    <td className="px-5 py-3">
                      <Link
                        href={`/admin/customers/${c.customer_id}`}
                        className="text-sm font-medium text-zinc-800 hover:text-zinc-900"
                      >
                        {[c.first_name, c.last_name].filter(Boolean).join(' ') || '—'}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <AccountBadge isGuest={!c.profile_id} />
                    </td>
                    <td className="px-5 py-3 text-right text-sm text-zinc-700">{agg?.count ?? 0}</td>
                    <td className="px-5 py-3 text-right text-sm font-medium text-zinc-800">
                      {fmtAUD(agg?.total ?? 0)}
                    </td>
                    <td className="px-5 py-3">
                      {agg?.lastNumber ? (
                        <div>
                          <p className="text-xs font-medium text-zinc-800">{agg.lastNumber}</p>
                          <p className="text-xs text-zinc-400">{fmtDate(agg.lastDate!)}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs text-zinc-500">{fmtDate(c.created_at)}</td>
                    <td className="px-5 py-3">
                      <button className="p-1 text-zinc-400 hover:text-zinc-700">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>

        <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-100 text-xs text-zinc-500">
          <span>1 — {customers.length} of {count ?? 0} results</span>
          <div className="flex items-center gap-3">
            <span>{page} of {totalPages || 1} pages</span>
            <div className="flex gap-1">
              {page > 1 ? (
                <Link href={`/admin/customers${qs({ page: String(page - 1) })}`}
                  className="px-2 py-1 rounded border border-zinc-300 hover:bg-white transition-colors">Prev</Link>
              ) : (
                <span className="px-2 py-1 rounded border border-zinc-200 text-zinc-300 cursor-not-allowed">Prev</span>
              )}
              {page < totalPages ? (
                <Link href={`/admin/customers${qs({ page: String(page + 1) })}`}
                  className="px-2 py-1 rounded border border-zinc-300 hover:bg-white transition-colors">Next</Link>
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
