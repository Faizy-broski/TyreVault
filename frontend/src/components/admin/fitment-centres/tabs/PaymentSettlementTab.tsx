'use client'

import { useState } from 'react'
import type { PaymentSummary, PaymentHistoryRow, BankDetails, PayoutStatus } from '@/types/admin.types'
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

interface Props {
  centreId:        string
  initialSummary:  PaymentSummary | null
  initialHistory:  PaymentHistoryRow[]
  initialTotal:    number
  initialBank:     BankDetails | null
  accessToken:     string
}

function fmtAUD(n: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(n)
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-AU', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function StatusBadge({ status }: { status: PayoutStatus }) {
  const map: Record<PayoutStatus, string> = {
    in_progress: 'bg-amber-50 text-amber-700',
    completed:   'bg-green-50 text-green-700',
    failed:      'bg-red-50 text-red-700',
  }
  const label: Record<PayoutStatus, string> = {
    in_progress: 'In Progress',
    completed:   'Completed',
    failed:      'Failed',
  }
  return (
    <Badge className={`h-auto rounded-full px-2 py-0.5 text-xs font-semibold border-0 ${map[status]}`}>
      {label[status]}
    </Badge>
  )
}

interface KpiCardProps {
  label:    string
  value:    React.ReactNode
  sub?:     string
  subColor?: string
  icon:     React.ReactNode
}

function KpiCard({ label, value, sub, subColor = 'text-zinc-500', icon }: KpiCardProps) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm text-zinc-500">{label}</p>
        <div className="text-zinc-400">{icon}</div>
      </div>
      <p className="text-3xl font-bold text-zinc-900">{value}</p>
      {sub && <p className={`text-xs mt-1 ${subColor}`}>{sub}</p>}
    </div>
  )
}

// Inline bank details form
function BankDetailsSection({
  centreId, initial, accessToken,
}: { centreId: string; initial: BankDetails | null; accessToken: string }) {
  const [editing, setEditing]     = useState(false)
  const [saving, setSaving]       = useState(false)
  const [form, setForm]           = useState<BankDetails>(
    initial ?? { id: null, fitment_centre_id: centreId, account_holder: '', bank_name: '', bsb: '', account_number: '' }
  )

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`${API}/api/admin/fitment-centres/${centreId}/bank-details`, {
        method: 'PATCH', headers,
        body:   JSON.stringify({
          account_holder: form.account_holder,
          bank_name:      form.bank_name,
          bsb:            form.bsb,
          account_number: form.account_number,
        }),
      })
      if (res.ok) setEditing(false)
    } finally { setSaving(false) }
  }

  function field(key: keyof BankDetails, label: string, placeholder: string) {
    return (
      <div>
        <p className="text-xs text-zinc-400 mb-1">{label}</p>
        {editing ? (
          <Input
            value={String(form[key] ?? '')}
            onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
            placeholder={placeholder}
            className="w-full rounded-md border-zinc-200 text-sm text-zinc-800 focus:ring-primary/30 focus:border-primary"
          />
        ) : (
          <p className="text-sm font-semibold text-zinc-900">{String(form[key] ?? '—')}</p>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-zinc-900">Bank Account Details</h3>
      </div>

      <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
        {field('account_holder', 'Account Holder', 'e.g. TyreMax Premium Fitting Pty Ltd')}
        {field('bank_name',      'Bank',           'e.g. Commonwealth Bank of Australia')}
        {field('bsb',            'BSB',            'e.g. 062-000')}
        {field('account_number', 'Account Number', 'e.g. 1234567890')}
      </div>

      <div className="mt-5">
        {editing ? (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setEditing(false)}
              className="px-4 py-1.5 h-auto text-sm font-medium border-zinc-300 rounded-lg text-zinc-700 hover:bg-zinc-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-1.5 h-auto text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => setEditing(true)}
            className="px-4 py-1.5 h-auto text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Edit Banking Details
          </Button>
        )}
      </div>
    </div>
  )
}

export default function PaymentSettlementTab({
  centreId, initialSummary, initialHistory, initialTotal, initialBank, accessToken,
}: Props) {
  const [history, setHistory]       = useState<PaymentHistoryRow[]>(initialHistory)
  const [total, setTotal]           = useState(initialTotal)
  const [summary]                   = useState<PaymentSummary | null>(initialSummary)
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage]             = useState(1)
  const [loading, setLoading]       = useState(false)

  const PAGE_LIMIT = 20
  const totalPages = Math.ceil(total / PAGE_LIMIT)
  const headers    = { Authorization: `Bearer ${accessToken}` }

  async function fetchHistory(opts: { status?: string; page?: number }) {
    setLoading(true)
    const qs = new URLSearchParams()
    if (opts.status) qs.set('status', opts.status)
    qs.set('page', String(opts.page ?? 1))
    try {
      const res = await fetch(`${API}/api/admin/fitment-centres/${centreId}/payments?${qs}`, { headers })
      if (res.ok) {
        const json = await res.json()
        setHistory(json.data  ?? [])
        setTotal(json.total   ?? 0)
      }
    } finally { setLoading(false) }
  }

  function applyStatus(s: string) {
    const next = s === statusFilter ? '' : s
    setStatusFilter(next); setPage(1)
    fetchHistory({ status: next, page: 1 })
  }

  function goPage(p: number) {
    setPage(p)
    fetchHistory({ status: statusFilter, page: p })
  }

  const scheduleLabel = (s: string) =>
    ({ weekly: 'Weekly', fortnightly: 'Fortnightly', monthly: 'Monthly' }[s] ?? s)

  return (
    <div className="p-5 space-y-5">
      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total Paid (This Year)"
          value={fmtAUD(summary?.totalPaidThisYear ?? 0)}
          sub={`${summary?.completedPayments ?? 0} payments completed`}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
          }
        />
        <KpiCard
          label="Pending Payout"
          value={<span className="text-amber-500">{fmtAUD(summary?.pendingPayout ?? 0)}</span>}
          sub="Completed"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <KpiCard
          label="Last Payment"
          value={<span className="text-green-600">{fmtAUD(summary?.lastPaymentAmount ?? 0)}</span>}
          sub={fmtDate(summary?.lastPaymentDate ?? null)}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
            </svg>
          }
        />
        <KpiCard
          label="Settlement Schedule"
          value={scheduleLabel(summary?.settlementSchedule ?? 'monthly')}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          }
        />
      </div>

      {/* Payment History */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-5 py-4 border-b border-zinc-100">
          <h3 className="text-sm font-semibold text-zinc-900">Payment History</h3>
          <div className="flex items-center gap-2">
            {(['in_progress', 'completed'] as const).map(s => (
              <Button
                key={s}
                type="button"
                variant="outline"
                onClick={() => applyStatus(s)}
                className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs h-auto transition-colors ${
                  statusFilter === s
                    ? 'border-primary bg-primary text-zinc-900 hover:bg-primary/90'
                    : 'border-zinc-300 text-zinc-600 hover:border-zinc-500'
                }`}
              >
                {s === 'in_progress' ? 'In Progress' : 'Completed'}
              </Button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
        <Table className="w-full text-sm">
          <TableHeader>
            <TableRow className="border-b border-zinc-100 bg-zinc-50 hover:bg-zinc-50">
              <TableHead className="px-5 py-3 text-left text-xs font-medium text-zinc-500 whitespace-nowrap">Period</TableHead>
              <TableHead className="px-5 py-3 text-right text-xs font-medium text-zinc-500">Orders</TableHead>
              <TableHead className="px-5 py-3 text-right text-xs font-medium text-zinc-500">Gross</TableHead>
              <TableHead className="px-5 py-3 text-right text-xs font-medium text-zinc-500">Adjustments</TableHead>
              <TableHead className="px-5 py-3 text-right text-xs font-medium text-zinc-500">Net Payout</TableHead>
              <TableHead className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Status</TableHead>
              <TableHead className="px-5 py-3 text-left text-xs font-medium text-zinc-500 whitespace-nowrap">Payment Date</TableHead>
              <TableHead className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Reference</TableHead>
              <TableHead className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Invoice</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-zinc-100">
            {loading ? (
              <TableRow><TableCell colSpan={9} className="px-5 py-8 text-center text-sm text-zinc-400">Loading...</TableCell></TableRow>
            ) : history.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="px-5 py-8 text-center text-sm text-zinc-400">No payment history.</TableCell></TableRow>
            ) : (
              history.map(row => (
                <TableRow key={row.id} className="hover:bg-zinc-50">
                  <TableCell className="px-5 py-3 text-xs text-zinc-600 whitespace-nowrap">
                    {fmtDate(row.period_start)} → {fmtDate(row.period_end)}
                  </TableCell>
                  <TableCell className="px-5 py-3 text-xs text-right text-zinc-700">{row.order_count}</TableCell>
                  <TableCell className="px-5 py-3 text-xs text-right text-zinc-700">{fmtAUD(row.gross_amount)}</TableCell>
                  <TableCell className="px-5 py-3 text-xs text-right">
                    <span className={row.adjustments < 0 ? 'text-red-600' : 'text-zinc-700'}>
                      {row.adjustments !== 0 ? fmtAUD(row.adjustments) : '—'}
                    </span>
                  </TableCell>
                  <TableCell className="px-5 py-3 text-xs text-right font-semibold">
                    <span className={row.status === 'completed' ? 'text-green-600' : 'text-zinc-800'}>
                      {fmtAUD(row.net_payout)}
                    </span>
                  </TableCell>
                  <TableCell className="px-5 py-3"><StatusBadge status={row.status} /></TableCell>
                  <TableCell className="px-5 py-3 text-xs text-zinc-500">{fmtDate(row.payment_date)}</TableCell>
                  <TableCell className="px-5 py-3 text-xs text-zinc-500 font-mono">{row.reference ?? '—'}</TableCell>
                  <TableCell className="px-5 py-3">
                    {row.invoice_url ? (
                      <a
                        href={row.invoice_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                        Download
                      </a>
                    ) : (
                      <span className="text-xs text-zinc-300">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        </div>
        <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-100 text-xs text-zinc-500">
          <span>{history.length} of {total} records</span>
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

      {/* Bank Account Details */}
      <BankDetailsSection centreId={centreId} initial={initialBank} accessToken={accessToken} />
    </div>
  )
}
