'use client'

import { useState, useEffect } from 'react'
import { Download, Search, CircleDollarSign, Plus, TrendingUp } from 'lucide-react'
import { Button }   from '@/components/ui/button'
import { Input }    from '@/components/ui/input'
import { Badge }    from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import type { FitterEarning } from '@/types/fitter.types'
import { FitterBreadcrumb } from '@/components/fitter/FitterBreadcrumb'
import { fmtCurrency, fmtShortDate } from '@/lib/fitter-format'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

const PAYOUT_STYLE = {
  paid:    'bg-green-100 text-green-600 hover:bg-green-100',
  pending: 'bg-amber-100 text-amber-600 hover:bg-amber-100',
}

function PayoutBadge({ status }: { status: 'paid' | 'pending' }) {
  return (
    <Badge className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border-0 ${PAYOUT_STYLE[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  )
}

function TableSkeleton() {
  return Array.from({ length: 5 }).map((_, i) => (
    <TableRow key={i} className={`border-zinc-100 ${i % 2 === 1 ? 'bg-zinc-50/40' : 'bg-white'}`}>
      <TableCell className="px-5 py-3.5"><Skeleton className="h-3.5 w-20" /></TableCell>
      <TableCell className="px-5 py-3.5"><Skeleton className="h-4 w-32" /></TableCell>
      <TableCell className="px-5 py-3.5"><Skeleton className="h-4 w-16" /></TableCell>
      <TableCell className="px-5 py-3.5"><Skeleton className="h-5 w-14 rounded-full" /></TableCell>
    </TableRow>
  ))
}

export default function EarningsClient({ accessToken }: { accessToken: string }) {
  const [earnings, setEarnings]         = useState<FitterEarning[]>([])
  const [total, setTotal]               = useState(0)
  const [thisMonth, setThisMonth]       = useState(0)
  const [pendingTotal, setPendingTotal] = useState(0)
  const [completedCount, setCompleted]  = useState(0)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch]             = useState('')
  const [page, setPage]                 = useState(1)
  const [loading, setLoading]           = useState(true)
  const [summaryLoading, setSummaryLoading] = useState(true)

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

  useEffect(() => {
    fetch(`${API}/api/fitter/portal/earnings/summary`, { headers })
      .then(r => r.ok ? r.json() : {})
      .then((s: Record<string, number>) => {
        setThisMonth(s.thisMonth      ?? 0)
        setPendingTotal(s.pendingTotal   ?? 0)
        setCompleted(s.completedCount ?? 0)
      })
      .catch(() => {})
      .finally(() => setSummaryLoading(false))

    fetchEarnings({ page: 1 })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken])

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
      <FitterBreadcrumb crumbs={[{ label: 'Earnings' }]} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight">Earnings</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Track your income and payouts</p>
        </div>
        <Button size="sm" className="gap-2 rounded-lg bg-primary text-zinc-900 hover:bg-primary/90 font-semibold shadow-sm hover:shadow-md transition-all duration-150">
          <Download className="w-4 h-4" />
          Download Report
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-none hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
          <div className="flex items-start justify-between mb-4">
            <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-50 text-emerald-500 ring-1 ring-emerald-100 group-hover:scale-105 transition-transform duration-200">
              <CircleDollarSign className="w-4 h-4" />
            </div>
            {!summaryLoading && completedCount > 0 && (
              <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                <TrendingUp className="w-3 h-3" />
                {completedCount} jobs
              </div>
            )}
          </div>
          {summaryLoading ? (
            <Skeleton className="h-9 w-32 mb-2" />
          ) : (
            <p className="text-3xl font-bold text-zinc-900 tracking-tight">{fmtCurrency(thisMonth)}</p>
          )}
          <p className="text-sm font-semibold text-zinc-700 mt-1">This Month Earnings</p>
          <p className="text-xs text-zinc-400 mt-0.5">From completed jobs</p>
        </div>

        <div className="bg-primary rounded-2xl border border-amber-100 p-5 shadow-none hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
          <div className="flex items-start justify-between mb-4">
            <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-amber-100/80 text-amber-600 ring-1 ring-amber-200 group-hover:scale-105 transition-transform duration-200">
              <CircleDollarSign className="w-4 h-4" />
            </div>
          </div>
          {summaryLoading ? (
            <Skeleton className="h-9 w-32 mb-2 bg-amber-100" />
          ) : (
            <p className="text-3xl font-bold text-zinc-900 tracking-tight">{fmtCurrency(pendingTotal)}</p>
          )}
          <p className="text-sm font-semibold text-zinc-800 mt-1">Pending Payouts</p>
          <p className="text-xs text-amber-700 mt-0.5">Will be processed next Friday</p>
        </div>
      </div>

      {/* Earnings table */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 bg-zinc-50/50">
          <h2 className="text-sm font-semibold text-zinc-900">Recent Earnings</h2>
          {!loading && total > 0 && (
            <span className="text-xs text-zinc-400">{total} records</span>
          )}
        </div>

        {/* Filters toolbar */}
        <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-b border-zinc-100">
          {(['pending', 'paid'] as const).map(s => (
            <Button
              key={s}
              size="sm"
              variant="outline"
              onClick={() => applyStatus(s)}
              className={`rounded-full h-7 gap-1 transition-all duration-150 ${
                statusFilter === s
                  ? 'bg-primary text-zinc-900 border-primary hover:bg-primary/90 shadow-sm'
                  : 'border-zinc-200 text-zinc-600 hover:border-zinc-400 hover:bg-transparent'
              }`}
            >
              <Plus className="w-3 h-3" />
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Button>
          ))}

          <form onSubmit={handleSearch} className="relative sm:ml-auto w-full sm:w-44">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="pl-8 h-8 text-xs border-zinc-200 focus-visible:ring-primary/30 focus-visible:border-primary w-full rounded-lg bg-white"
            />
          </form>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="border-b-2 border-zinc-100 bg-zinc-50 hover:bg-zinc-50">
              <TableHead className="px-5 py-3 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider h-auto">Date</TableHead>
              <TableHead className="px-5 py-3 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider h-auto">Customer</TableHead>
              <TableHead className="px-5 py-3 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider h-auto">Amount</TableHead>
              <TableHead className="px-5 py-3 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider h-auto">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeleton />
            ) : earnings.length === 0 ? (
              <TableRow className="hover:bg-transparent border-0">
                <TableCell colSpan={4} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-zinc-100 border border-zinc-200 flex items-center justify-center">
                      <CircleDollarSign className="w-5 h-5 text-zinc-300" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-500">No earnings yet</p>
                      <p className="text-xs text-zinc-400 mt-0.5">Completed jobs will appear here</p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              earnings.map((e, index) => (
                <TableRow
                  key={e.id}
                  className={`border-zinc-100 hover:bg-amber-50/50 transition-colors duration-150 ${
                    index % 2 === 1 ? 'bg-zinc-50/40' : 'bg-white'
                  }`}
                >
                  <TableCell className="px-5 py-3.5 text-zinc-500 text-xs">{fmtShortDate(e.created_at)}</TableCell>
                  <TableCell className="px-5 py-3.5 text-zinc-900 font-semibold text-sm">{e.customer_name ?? '—'}</TableCell>
                  <TableCell className="px-5 py-3.5 text-zinc-800 font-medium text-sm">{fmtCurrency(e.amount)}</TableCell>
                  <TableCell className="px-5 py-3.5">
                    <PayoutBadge status={e.status} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-y-2 px-5 py-3 border-t border-zinc-100 bg-zinc-50/30 text-xs text-zinc-400">
          <span>{earnings.length > 0 ? `1 — ${earnings.length} of ${total}` : '0 results'}</span>
          <div className="flex items-center gap-3">
            <span>{page} of {totalPages || 1} pages</span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => page > 1 && goPage(page - 1)}
                disabled={page <= 1}
                className="h-7 px-2.5 text-xs rounded border-zinc-200 hover:bg-zinc-50 disabled:opacity-40 transition-colors"
              >
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => page < totalPages && goPage(page + 1)}
                disabled={page >= totalPages}
                className="h-7 px-2.5 text-xs rounded border-zinc-200 hover:bg-zinc-50 disabled:opacity-40 transition-colors"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
