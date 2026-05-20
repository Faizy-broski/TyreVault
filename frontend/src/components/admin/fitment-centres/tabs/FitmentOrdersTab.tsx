'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import type { AdminCentreKPIs, AdminCentreJob, AdminCentreJobStatus, AdminCentreStats } from '@/types/admin.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
const COMMISSION_RATE = 0.12

interface Props {
  centreId:     string
  kpis:         AdminCentreKPIs | null
  initialJobs:  AdminCentreJob[]
  initialTotal: number
  stats:        AdminCentreStats
  accessToken:  string
}

const STATUS_TABS: { key: AdminCentreJobStatus | ''; label: string }[] = [
  { key: '',           label: 'All'        },
  { key: 'pending',    label: 'Pending'    },
  { key: 'accepted',   label: 'Inprogress' },
  { key: 'completed',  label: 'Completed'  },
  { key: 'in_progress', label: 'Delayed'   },
]

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending:     'bg-amber-50 text-amber-700',
    assigned:    'bg-amber-50 text-amber-700',
    accepted:    'bg-blue-50 text-blue-700',
    completed:   'bg-green-50 text-green-700',
    cancelled:   'bg-red-50 text-red-700',
    rejected:    'bg-red-50 text-red-700',
    in_progress: 'bg-orange-50 text-orange-700',
  }
  const label: Record<string, string> = {
    pending:     'Pending',
    assigned:    'Assigned',
    accepted:    'In Progress',
    completed:   'Completed',
    cancelled:   'Cancelled',
    rejected:    'Rejected',
    in_progress: 'Delayed',
  }
  return (
    <Badge className={`h-auto rounded-full px-2 py-0.5 text-xs font-semibold border-0 ${map[status] ?? 'bg-zinc-100 text-zinc-600'}`}>
      {label[status] ?? status}
    </Badge>
  )
}

function KpiCard({ label, value, sub, icon }: {
  label: string; value: React.ReactNode; sub?: string; icon: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3 p-4">
      <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-500 shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-xs text-zinc-500">{label}</p>
        <p className="text-2xl font-bold text-zinc-900">{value}</p>
        {sub && <p className="text-xs text-zinc-400">{sub}</p>}
      </div>
    </div>
  )
}

function SimpleBarChart({ data }: { data: { month: string; amount: number }[] }) {
  if (data.length === 0) {
    return <div className="flex items-center justify-center h-28 text-xs text-zinc-400">No data</div>
  }
  const max = Math.max(...data.map(d => d.amount), 1)
  return (
    <div className="flex items-end gap-1 h-28 px-1">
      {data.map(d => (
        <div key={d.month} className="flex-1 flex flex-col items-center gap-0.5" title={`${d.month}: $${d.amount.toFixed(0)}`}>
          <div
            className="w-full bg-primary rounded-sm min-h-[2px]"
            style={{ height: `${(d.amount / max) * 96}px` }}
          />
          <span className="text-[9px] text-zinc-400 rotate-45 origin-left translate-y-2">{d.month.slice(5)}</span>
        </div>
      ))}
    </div>
  )
}

export default function FitmentOrdersTab({
  centreId, kpis, initialJobs, initialTotal, stats, accessToken,
}: Props) {
  const [jobs, setJobs]         = useState<AdminCentreJob[]>(initialJobs)
  const [total, setTotal]       = useState(initialTotal)
  const [activeStatus, setActiveStatus] = useState<AdminCentreJobStatus | ''>('')
  const [search, setSearch]     = useState('')
  const [page, setPage]         = useState(1)
  const [loading, setLoading]   = useState(false)
  const [chartView, setChartView] = useState<'graph' | 'table'>('graph')

  const PAGE_LIMIT = 20
  const totalPages = Math.ceil(total / PAGE_LIMIT)
  const headers    = { Authorization: `Bearer ${accessToken}` }

  async function fetchJobs(opts: {
    status?: AdminCentreJobStatus | ''
    search?: string
    page?:   number
  }) {
    setLoading(true)
    const qs = new URLSearchParams()
    if (opts.status) qs.set('status', opts.status)
    if (opts.search) qs.set('search', opts.search)
    qs.set('page', String(opts.page ?? 1))
    try {
      const res = await fetch(`${API}/api/admin/fitment-centres/${centreId}/jobs?${qs}`, { headers })
      if (res.ok) {
        const json = await res.json()
        setJobs(json.data  ?? [])
        setTotal(json.total ?? 0)
      }
    } finally { setLoading(false) }
  }

  function applyStatus(s: AdminCentreJobStatus | '') {
    setActiveStatus(s); setPage(1)
    fetchJobs({ status: s, search, page: 1 })
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault(); setPage(1)
    fetchJobs({ status: activeStatus, search, page: 1 })
  }

  function goPage(p: number) {
    setPage(p)
    fetchJobs({ status: activeStatus, search, page: p })
  }

  function fmtDateTime(date: string | null, time: string | null) {
    if (!date) return '—'
    const d = new Date(date).toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' })
    return time ? `${d}, ${time}` : d
  }

  function fmtAUD(n: number) {
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(n)
  }

  const jobCountByStatus = (s: AdminCentreJobStatus) =>
    jobs.filter(j => j.job_status === s).length

  return (
    <div className="divide-y divide-zinc-100">
      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-zinc-100">
        <KpiCard
          label="Active Now"
          value={kpis?.activeJobs ?? 0}
          sub="Jobs in progress"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
          }
        />
        <KpiCard
          label="This Month"
          value={kpis?.thisMonthCompleted ?? 0}
          sub="Completed"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          }
        />
        <KpiCard
          label="Average Rating"
          value={kpis?.averageRating?.toFixed(1) ?? '—'}
          sub={`From ${kpis?.ratingCount ?? 0} reviews`}
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
          }
        />
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-col gap-2 px-5 py-2 sm:flex-row sm:items-center sm:gap-0 overflow-x-auto">
        {STATUS_TABS.map(tab => {
          const count = tab.key === ''
            ? jobs.length
            : jobCountByStatus(tab.key)
          return (
            <Button
              key={tab.key}
              type="button"
              variant="ghost"
              onClick={() => applyStatus(tab.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap h-auto transition-colors ${
                activeStatus === tab.key
                  ? 'text-zinc-900 bg-primary hover:bg-primary/90'
                  : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              {tab.label} ({count})
            </Button>
          )
        })}
        <div className="flex-1" />
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search..."
            className="pl-8 pr-3 text-xs border-zinc-300 rounded-lg focus:ring-primary/30 focus:border-primary w-36 h-8"
          />
        </form>
      </div>

      {/* Orders table header */}
      <div className="px-5 py-2">
        <h3 className="text-sm font-semibold text-zinc-900">All Orders</h3>
      </div>

      <div className="overflow-x-auto">
      <Table className="w-full text-sm">
        <TableHeader>
          <TableRow className="border-b border-zinc-100 bg-zinc-50 hover:bg-zinc-50">
            <TableHead className="px-4 py-3 text-left text-xs font-medium text-zinc-500 whitespace-nowrap">Order ID</TableHead>
            <TableHead className="px-4 py-3 text-left text-xs font-medium text-zinc-500 whitespace-nowrap">Fitment ID</TableHead>
            <TableHead className="px-4 py-3 text-left text-xs font-medium text-zinc-500 whitespace-nowrap">Date & Time</TableHead>
            <TableHead className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Customer</TableHead>
            <TableHead className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Services</TableHead>
            <TableHead className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Tyre</TableHead>
            <TableHead className="px-4 py-3 text-right text-xs font-medium text-zinc-500">Fitment</TableHead>
            <TableHead className="px-4 py-3 text-right text-xs font-medium text-zinc-500">Total</TableHead>
            <TableHead className="px-4 py-3 text-right text-xs font-medium text-zinc-500">Commission</TableHead>
            <TableHead className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Status</TableHead>
            <TableHead className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Payment</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-zinc-50">
          {loading ? (
            <TableRow><TableCell colSpan={11} className="px-4 py-8 text-center text-sm text-zinc-400">Loading...</TableCell></TableRow>
          ) : jobs.length === 0 ? (
            <TableRow><TableCell colSpan={11} className="px-4 py-8 text-center text-sm text-zinc-400">No orders found.</TableCell></TableRow>
          ) : (
            jobs.map(job => {
              const total      = job.earnings_amount ?? 0
              const fitment    = total * 0.1
              const commission = total * COMMISSION_RATE
              return (
                <TableRow key={job.job_id} className="hover:bg-zinc-50">
                  <TableCell className="px-4 py-3 text-xs font-mono text-zinc-600 whitespace-nowrap">OD-{job.task_number}</TableCell>
                  <TableCell className="px-4 py-3 text-xs font-mono text-zinc-600 whitespace-nowrap">FD-{job.task_number}</TableCell>
                  <TableCell className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap">{fmtDateTime(job.scheduled_date, job.scheduled_time)}</TableCell>
                  <TableCell className="px-4 py-3">
                    <p className="text-sm font-medium text-zinc-800 whitespace-nowrap">{job.customer_name}</p>
                    <p className="text-xs text-zinc-400">{job.customer_phone ?? '—'}</p>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-xs text-zinc-600">{job.vehicle_model ?? '—'}</TableCell>
                  <TableCell className="px-4 py-3 text-xs text-zinc-600">
                    {job.tyre_size ? `${job.tyre_size} × ${job.quantity}` : '—'}
                    {job.tyre_pattern && <p className="text-zinc-400">{job.tyre_pattern}</p>}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right text-xs text-zinc-700">{fmtAUD(fitment)}</TableCell>
                  <TableCell className="px-4 py-3 text-right text-xs font-semibold text-zinc-800">{fmtAUD(total)}</TableCell>
                  <TableCell className="px-4 py-3 text-right text-xs text-zinc-700">{fmtAUD(commission)}</TableCell>
                  <TableCell className="px-4 py-3"><StatusPill status={job.job_status} /></TableCell>
                  <TableCell className="px-4 py-3">
                    <span className={`text-xs font-semibold ${
                      job.job_status === 'completed' ? 'text-green-600' : 'text-amber-600'
                    }`}>
                      {job.job_status === 'completed' ? 'Paid' : 'Pending'}
                    </span>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>

      </div>

      {/* Pagination */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-5 py-3 text-xs text-zinc-500">
        <span>1 — {jobs.length} of {total} results</span>
        <div className="flex items-center gap-3">
          <span>{page} of {totalPages || 1} pages</span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => page > 1 && goPage(page - 1)}
              disabled={page <= 1}
              className="px-2 py-1 h-auto rounded border-zinc-300 text-xs"
            >Prev</Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => page < totalPages && goPage(page + 1)}
              disabled={page >= totalPages}
              className="px-2 py-1 h-auto rounded border-zinc-300 text-xs"
            >Next</Button>
          </div>
        </div>
      </div>

      {/* Purchase in 12 months + Login History */}
      <div className="grid grid-cols-1 gap-0 divide-y lg:grid-cols-[1fr_320px] lg:divide-y-0 lg:divide-x divide-zinc-100">
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-zinc-900">Purchase in 12 months</h3>
            <div className="flex rounded-lg border border-zinc-200 overflow-hidden text-xs">
              {(['graph', 'table'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setChartView(v)}
                  className={`px-3 py-1 ${chartView === v ? 'bg-primary text-zinc-900' : 'text-zinc-600 hover:bg-zinc-50'}`}
                >
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </div>
          {chartView === 'graph' ? (
            <SimpleBarChart data={stats.purchase12Months} />
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="py-2 text-left font-medium text-zinc-500">Month</th>
                  <th className="py-2 text-right font-medium text-zinc-500">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {stats.purchase12Months.length === 0
                  ? <tr><td colSpan={2} className="py-4 text-center text-zinc-400">No data</td></tr>
                  : stats.purchase12Months.map(d => (
                    <tr key={d.month}>
                      <td className="py-1.5 text-zinc-600">{d.month}</td>
                      <td className="py-1.5 text-right font-medium text-zinc-800">
                        {new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(d.amount)}
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          )}
        </div>

        <div className="p-5">
          <h3 className="text-sm font-semibold text-zinc-900 mb-4">Login History</h3>
          {stats.loginHistory.length === 0 ? (
            <p className="text-xs text-zinc-400">No data</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="py-2 text-left font-medium text-zinc-500">IP</th>
                  <th className="py-2 text-left font-medium text-zinc-500">Date</th>
                  <th className="py-2 text-left font-medium text-zinc-500">Area</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {stats.loginHistory.map((l, i) => (
                  <tr key={i}>
                    <td className="py-1.5 font-mono text-zinc-600">{l.ip}</td>
                    <td className="py-1.5 text-zinc-500">{l.date}</td>
                    <td className="py-1.5 text-zinc-500">{l.area}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
