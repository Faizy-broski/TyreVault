'use client'

import { useState } from 'react'
import { Download, Search, CircleDollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input }  from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import type { FitterEarning } from '@/types/fitter.types'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(n)
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-AU', { month: 'short', day: 'numeric', year: 'numeric' })
}

interface Props {
  thisMonth:       number
  pendingTotal:    number
  completedCount:  number
  initialEarnings: FitterEarning[]
  initialTotal:    number
  accessToken:     string
}

export default function EarningsClient({
  thisMonth, pendingTotal, completedCount,
  initialEarnings, initialTotal, accessToken,
}: Props) {
  const [earnings, setEarnings]           = useState<FitterEarning[]>(initialEarnings)
  const [total, setTotal]                 = useState(initialTotal)
  const [statusFilter, setStatusFilter]   = useState('')
  const [search, setSearch]               = useState('')
  const [page, setPage]                   = useState(1)
  const [loading, setLoading]             = useState(false)

  const limit      = 20
  const totalPages = Math.ceil(total / limit)
  const headers    = { Authorization: `Bearer ${accessToken}` }

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
        setEarnings(json.data  ?? [])
        setTotal(json.total    ?? 0)
      }
    } finally { setLoading(false) }
  }

  function applyStatus(s: string) {
    const next = s === statusFilter ? '' : s
    setStatusFilter(next); setPage(1)
    fetchEarnings({ status: next, search, page: 1 })
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault(); setPage(1)
    fetchEarnings({ status: statusFilter, search, page: 1 })
  }

  function goPage(p: number) {
    setPage(p)
    fetchEarnings({ status: statusFilter, search, page: p })
  }

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Earnings</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Track your income and payouts</p>
        </div>
        <Button className="gap-2 rounded-lg bg-primary h-auto px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-primary/90">
          <Download className="w-4 h-4" />
          Download Report
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-zinc-200 p-5">
          <div className="flex items-start justify-between">
            <p className="text-sm font-medium text-zinc-500">This Month Earnings</p>
            <CircleDollarSign className="w-5 h-5 text-zinc-400" />
          </div>
          <p className="text-4xl font-bold text-zinc-900 mt-3">{fmtCurrency(thisMonth)}</p>
          <p className="text-xs text-zinc-500 mt-1">From {completedCount} completed jobs</p>
        </div>

        <div className="bg-primary rounded-2xl border border-amber-100 p-5">
          <div className="flex items-start justify-between">
            <p className="text-sm font-medium text-amber-700">Pending Payouts</p>
            <CircleDollarSign className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-4xl font-bold text-zinc-900 mt-3">{fmtCurrency(pendingTotal)}</p>
          <p className="text-xs text-amber-600 mt-1">Will be processed next Friday</p>
        </div>
      </div>

      {/* Earnings table */}
      <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <h2 className="text-sm font-semibold text-zinc-900">Recent Earnings</h2>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-zinc-100">
          {['pending', 'paid'].map(s => (
            <button
              key={s}
              type="button"
              onClick={() => applyStatus(s)}
              className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition-colors ${
                statusFilter === s
                  ? 'border-primary bg-primary text-zinc-900'
                  : 'border-zinc-300 text-zinc-600 hover:border-zinc-500'
              }`}
            >
              <span className="text-zinc-400">+</span>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
          <div className="flex-1" />
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="pl-8 pr-3 py-1.5 h-auto text-xs border-zinc-300 focus-visible:ring-primary/30 focus-visible:border-primary w-40 rounded-lg"
            />
          </form>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="border-b border-zinc-100 bg-zinc-50 hover:bg-zinc-50">
              <TableHead className="px-5 py-3 text-xs font-medium text-zinc-500 h-auto">Date</TableHead>
              <TableHead className="px-5 py-3 text-xs font-medium text-zinc-500 h-auto">Customer</TableHead>
              <TableHead className="px-5 py-3 text-xs font-medium text-zinc-500 h-auto">Amount</TableHead>
              <TableHead className="px-5 py-3 text-xs font-medium text-zinc-500 h-auto">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-zinc-100">
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="px-5 py-8 text-center text-sm text-zinc-400">Loading...</TableCell>
              </TableRow>
            ) : earnings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="px-5 py-8 text-center text-sm text-zinc-400">No earnings yet.</TableCell>
              </TableRow>
            ) : (
              earnings.map(e => (
                <TableRow key={e.id} className="hover:bg-zinc-50 border-0">
                  <TableCell className="px-5 py-3 text-zinc-600 text-xs">{fmtDate(e.created_at)}</TableCell>
                  <TableCell className="px-5 py-3 text-zinc-800 font-medium">{e.customer_name ?? '—'}</TableCell>
                  <TableCell className="px-5 py-3 text-zinc-800">{fmtCurrency(e.amount)}</TableCell>
                  <TableCell className="px-5 py-3">
                    <span className={`text-xs font-semibold ${e.status === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>
                      {e.status.charAt(0).toUpperCase() + e.status.slice(1)}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-100 text-xs text-zinc-500">
          <span>1 — {earnings.length} of {total} results</span>
          <div className="flex items-center gap-3">
            <span>{page} of {totalPages || 1} pages</span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                onClick={() => page > 1 && goPage(page - 1)}
                disabled={page <= 1}
                className="h-auto px-2 py-1 text-xs rounded border-zinc-300 hover:bg-white disabled:opacity-40"
              >Prev</Button>
              <Button
                variant="outline"
                onClick={() => page < totalPages && goPage(page + 1)}
                disabled={page >= totalPages}
                className="h-auto px-2 py-1 text-xs rounded border-zinc-300 hover:bg-white disabled:opacity-40"
              >Next</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
