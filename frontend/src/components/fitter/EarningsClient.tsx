'use client'

import { useState } from 'react'
import type { FitterEarning } from '@/types/fitter.types'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

interface Props {
  thisMonth:    number
  pendingTotal: number
  completedCount: number
  initialEarnings: FitterEarning[]
  initialTotal:   number
  accessToken:    string
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(n)
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-AU', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function EarningsClient({
  thisMonth, pendingTotal, completedCount,
  initialEarnings, initialTotal, accessToken,
}: Props) {
  const [earnings, setEarnings] = useState<FitterEarning[]>(initialEarnings)
  const [total, setTotal]       = useState(initialTotal)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch]     = useState('')
  const [page, setPage]         = useState(1)
  const [loading, setLoading]   = useState(false)

  const limit     = 20
  const totalPages = Math.ceil(total / limit)
  const headers   = { Authorization: `Bearer ${accessToken}` }

  async function fetchEarnings(opts: { status?: string; search?: string; page?: number }) {
    setLoading(true)
    const qs = new URLSearchParams()
    if (opts.status) qs.set('status', opts.status)
    if (opts.search) qs.set('search', opts.search)
    qs.set('page', String(opts.page ?? 1))

    try {
      const res = await fetch(`${API}/api/fitter/portal/earnings?${qs}`, { headers })
      if (res.ok) {
        const json = await res.json()
        setEarnings(json.data ?? [])
        setTotal(json.total ?? 0)
      }
    } finally { setLoading(false) }
  }

  function applyStatus(s: string) {
    const next = s === statusFilter ? '' : s
    setStatusFilter(next)
    setPage(1)
    fetchEarnings({ status: next, search, page: 1 })
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    fetchEarnings({ status: statusFilter, search, page: 1 })
  }

  function goPage(p: number) {
    setPage(p)
    fetchEarnings({ status: statusFilter, search, page: p })
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Earnings</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Track your income and payouts</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-yellow-500 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Download Report
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <div className="flex items-start justify-between">
            <p className="text-sm font-medium text-zinc-500">This Month Earnings</p>
            <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-4xl font-bold text-zinc-900 mt-3">{fmtCurrency(thisMonth)}</p>
          <p className="text-xs text-zinc-500 mt-1">From {completedCount} completed jobs</p>
        </div>

        <div className="bg-amber-50 rounded-xl border border-amber-100 p-5">
          <div className="flex items-start justify-between">
            <p className="text-sm font-medium text-amber-700">Pending Payouts</p>
            <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-4xl font-bold text-zinc-900 mt-3">{fmtCurrency(pendingTotal)}</p>
          <p className="text-xs text-amber-600 mt-1">Will be processed next Friday</p>
        </div>
      </div>

      {/* Earnings table */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <h2 className="text-sm font-semibold text-zinc-900">Recent Earnings</h2>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-zinc-100">
          {['pending', 'paid'].map(s => (
            <button
              key={s}
              onClick={() => applyStatus(s)}
              className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition-colors ${
                statusFilter === s
                  ? 'border-zinc-900 bg-zinc-900 text-white'
                  : 'border-zinc-300 text-zinc-600 hover:border-zinc-500'
              }`}
            >
              <span className="text-zinc-400">+</span>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
          <div className="flex-1" />
          <form onSubmit={handleSearch} className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="pl-8 pr-3 py-1.5 text-xs border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400/30 focus:border-yellow-400 w-40"
            />
          </form>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50">
              <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Date</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Customer</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Amount</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {loading ? (
              <tr><td colSpan={4} className="px-5 py-8 text-center text-sm text-zinc-400">Loading...</td></tr>
            ) : earnings.length === 0 ? (
              <tr><td colSpan={4} className="px-5 py-8 text-center text-sm text-zinc-400">No earnings yet.</td></tr>
            ) : (
              earnings.map(e => (
                <tr key={e.id} className="hover:bg-zinc-50">
                  <td className="px-5 py-3 text-zinc-600 text-xs">{fmtDate(e.created_at)}</td>
                  <td className="px-5 py-3 text-zinc-800 font-medium">{e.customer_name ?? '—'}</td>
                  <td className="px-5 py-3 text-zinc-800">{fmtCurrency(e.amount)}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-semibold ${e.status === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>
                      {e.status.charAt(0).toUpperCase() + e.status.slice(1)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-100 text-xs text-zinc-500">
          <span>1 — {earnings.length} of {total} results</span>
          <div className="flex items-center gap-3">
            <span>{page} of {totalPages || 1} pages</span>
            <div className="flex gap-1">
              <button
                onClick={() => page > 1 && goPage(page - 1)}
                disabled={page <= 1}
                className="px-2 py-1 rounded border border-zinc-300 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >Prev</button>
              <button
                onClick={() => page < totalPages && goPage(page + 1)}
                disabled={page >= totalPages}
                className="px-2 py-1 rounded border border-zinc-300 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >Next</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
