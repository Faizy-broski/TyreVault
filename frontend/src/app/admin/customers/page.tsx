'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { AdminBreadcrumb } from '@/components/admin/AdminBreadcrumb'
import CustomerRowMenu from '@/components/admin/customers/CustomerRowMenu'
import CreateCustomerModal from '@/components/admin/customers/CreateCustomerModal'
import type { CustomerListItem } from '@/types/admin.types'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

type CustomerStats = {
  totalCustomers: number
  totalOrders: number
  avgOrderSize: number
  totalRevenue: number
}

function AccountBadge({ isGuest }: { isGuest: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
      isGuest ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${isGuest ? 'bg-amber-500' : 'bg-green-500'}`} />
      {isGuest ? 'Guest' : 'Registered'}
    </span>
  )
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-AU', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtAUD(n: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(n)
}

function KpiCard({ label, value, sub, icon }: { label: string; value: React.ReactNode; sub: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
      <div className="mb-3 flex items-start justify-between">
        <p className="text-sm text-zinc-500">{label}</p>
        <div className="text-zinc-400">{icon}</div>
      </div>
      <p className="text-3xl font-bold text-zinc-900">{value}</p>
      <p className="mt-1 text-xs text-zinc-400">{sub}</p>
    </div>
  )
}

const LIMIT = 20

export default function CustomersPage() {
  const searchParams  = useSearchParams()
  const router        = useRouter()
  const pathname      = usePathname()

  const search      = searchParams.get('search') ?? ''
  const page        = Number(searchParams.get('page') ?? 1)
  const accountType = (searchParams.get('accountType') as 'guest' | 'registered' | undefined) ?? undefined
  const modal       = searchParams.get('modal')

  const [stats, setStats]         = useState<CustomerStats>({ totalCustomers: 0, totalOrders: 0, avgOrderSize: 0, totalRevenue: 0 })
  const [customers, setCustomers] = useState<CustomerListItem[]>([])
  const [count, setCount]         = useState(0)
  const [token, setToken]         = useState('')
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)

  useEffect(() => { document.title = 'Customers | Tyre Vault' }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const { data: { session } } = await createClient().auth.getSession()
        const tok = session?.access_token ?? ''
        if (!cancelled) setToken(tok)

        const headers = { Authorization: `Bearer ${tok}` }
        const qs = new URLSearchParams({ page: String(page) })
        if (search) qs.set('search', search)
        if (accountType) qs.set('accountType', accountType)

        const [statsRes, custsRes] = await Promise.all([
          fetch(`${API}/api/admin/customers/stats`, { headers }),
          fetch(`${API}/api/admin/customers?${qs}`, { headers }),
        ])

        if (!statsRes.ok || !custsRes.ok) {
          const body = await (!statsRes.ok ? statsRes : custsRes).json().catch(() => ({}))
          throw new Error(body.error ?? 'Failed to load customers')
        }

        const [statsData, custsData] = await Promise.all([statsRes.json(), custsRes.json()])
        if (!cancelled) {
          setStats(statsData)
          setCustomers(custsData.customers ?? [])
          setCount(custsData.total ?? 0)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load customers')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [search, page, accountType])

  function closeModal() {
    const p = new URLSearchParams(searchParams.toString())
    p.delete('modal')
    const qs = p.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname)
  }

  const buildHref = useCallback((extra: Record<string, string>) => {
    const p = new URLSearchParams()
    if (search) p.set('search', search)
    if (accountType) p.set('accountType', accountType)
    if (page > 1) p.set('page', String(page))
    Object.entries(extra).forEach(([k, v]) => { if (v) p.set(k, v); else p.delete(k) })
    return p.toString() ? `${pathname}?${p}` : pathname
  }, [search, accountType, page, pathname])

  const totalPages  = Math.max(1, Math.ceil(count / LIMIT))
  const startResult = count === 0 ? 0 : (page - 1) * LIMIT + 1
  const endResult   = count === 0 ? 0 : (page - 1) * LIMIT + customers.length

  return (
    <div className="space-y-5 p-4 sm:p-6">
      {modal === 'create' && (
        <CreateCustomerModal accessToken={token} onClose={closeModal} />
      )}

      <AdminBreadcrumb crumbs={[{ label: 'Customers' }]} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Customer" value={stats.totalCustomers} sub="Active customers"
          icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" /></svg>}
        />
        <KpiCard label="Total Orders" value={stats.totalOrders} sub="All orders"
          icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <KpiCard label="Average Order size" value={fmtAUD(stats.avgOrderSize)} sub={`From ${stats.totalOrders} orders`}
          icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>}
        />
        <KpiCard label="Total Revenue" value={fmtAUD(stats.totalRevenue)} sub="From all orders"
          icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>}
        />
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-zinc-900">Customers</h2>
          <button
            type="button"
            onClick={() => router.push(buildHref({ modal: 'create' }))}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary text-zinc-900 rounded-lg hover:bg-primary/90 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Create Customer
          </button>
        </div>

        <div className="flex items-center gap-2 border-b border-zinc-100 px-5 py-3">
          <Link
            href={buildHref({ accountType: accountType === 'guest' ? '' : 'guest', page: '1' })}
            className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition-colors ${
              accountType === 'guest'
                ? 'border-primary bg-primary text-zinc-900'
                : 'border-zinc-300 text-zinc-600 hover:border-zinc-500'
            }`}
          >
            <span className="text-zinc-400">+</span> Account
          </Link>
          <Link href={buildHref({ page: '1' })} className="flex items-center gap-1 rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-600 transition-colors hover:border-zinc-500">
            <span className="text-zinc-400">+</span> Created
          </Link>
          <div className="flex-1" />
          <form onSubmit={e => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            const q = fd.get('search') as string
            const p = new URLSearchParams()
            if (q) p.set('search', q)
            if (accountType) p.set('accountType', accountType)
            p.set('page', '1')
            router.push(`${pathname}?${p}`)
          }} className="flex items-center gap-2">
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input name="search" defaultValue={search} placeholder="Search" className="w-44 rounded-lg border border-zinc-300 py-1.5 pl-8 pr-3 text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <button type="submit" aria-label="Search" className="rounded-md border border-zinc-300 p-1.5 text-zinc-500 hover:bg-zinc-50">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
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
              <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Name</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Account</th>
              <th className="px-5 py-3 text-right text-xs font-medium text-zinc-500">Orders</th>
              <th className="px-5 py-3 text-right text-xs font-medium text-zinc-500">Total Value</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Last Order</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Created</th>
              <th className="w-8 px-5 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {loading ? (
              [1,2,3,4,5].map(i => (
                <tr key={i}>
                  <td colSpan={9} className="px-5 py-3">
                    <div className="h-5 bg-zinc-100 rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-5 py-10 text-center text-sm text-zinc-400">
                  {search ? `No customers matching "${search}"` : 'No customers yet.'}
                </td>
              </tr>
            ) : (
              customers.map((customer, idx) => {
                const displayId = `CUST-${String((page - 1) * LIMIT + idx + 1).padStart(3, '0')}`
                return (
                  <tr key={customer.customer_id} className="hover:bg-zinc-50">
                    <td className="px-5 py-3 font-mono text-xs text-zinc-500">
                      <Link href={`/admin/customers/${customer.customer_id}`} className="text-sm font-medium text-primary hover:underline">{displayId}</Link>
                    </td>
                    <td className="px-5 py-3 text-xs text-zinc-600">{customer.email}</td>
                    <td className="px-5 py-3">
                      <Link href={`/admin/customers/${customer.customer_id}`} className="text-sm font-medium text-primary hover:underline">
                        {[customer.first_name, customer.last_name].filter(Boolean).join(' ') || '—'}
                      </Link>
                    </td>
                    <td className="px-5 py-3"><AccountBadge isGuest={!customer.profile_id} /></td>
                    <td className="px-5 py-3 text-right text-sm text-zinc-700">{customer.order_count ?? 0}</td>
                    <td className="px-5 py-3 text-right text-sm font-medium text-zinc-800">{fmtAUD(customer.total_spent ?? 0)}</td>
                    <td className="px-5 py-3">
                      {customer.last_order_number ? (
                        <div>
                          <p className="text-xs font-medium text-zinc-800">{customer.last_order_number}</p>
                          <p className="text-xs text-zinc-400">{fmtDate(customer.last_order_date)}</p>
                        </div>
                      ) : <span className="text-xs text-zinc-400">—</span>}
                    </td>
                    <td className="px-5 py-3 text-xs text-zinc-500">{fmtDate(customer.created_at)}</td>
                    <td className="px-5 py-3"><CustomerRowMenu customer={customer} accessToken={token} /></td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>

        <div className="flex items-center justify-between border-t border-zinc-100 px-5 py-3 text-xs text-zinc-500">
          <span>{startResult} — {endResult} of {count} results</span>
          <div className="flex items-center gap-3">
            <span>{page} of {totalPages} pages</span>
            <div className="flex gap-1">
              {page > 1 ? (
                <Link href={buildHref({ page: String(page - 1) })} className="rounded border border-zinc-300 px-2 py-1 hover:bg-white">Prev</Link>
              ) : (
                <span className="cursor-not-allowed rounded border border-zinc-200 px-2 py-1 text-zinc-300">Prev</span>
              )}
              {page < totalPages ? (
                <Link href={buildHref({ page: String(page + 1) })} className="rounded border border-zinc-300 px-2 py-1 hover:bg-white">Next</Link>
              ) : (
                <span className="cursor-not-allowed rounded border border-zinc-200 px-2 py-1 text-zinc-300">Next</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
