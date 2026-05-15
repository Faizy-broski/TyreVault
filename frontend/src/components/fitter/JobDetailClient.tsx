'use client'

import { useState, useEffect, useTransition } from 'react'
import { Phone, Calendar, Clock, Car, Package, Check, X } from 'lucide-react'
import { Button }  from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { FitmentJob } from '@/types/fitter.types'
import { StatusBadge }      from '@/components/fitter/StatusBadge'
import { FitterBreadcrumb } from '@/components/fitter/FitterBreadcrumb'
import { fmt12h, fmtDate }  from '@/lib/fitter-format'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(n)
}

function LoadingSkeleton() {
  return (
    <div className="p-4 sm:p-6 max-w-2xl space-y-6">
      <Skeleton className="h-4 w-48" />
      <div className="space-y-2">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="bg-white rounded-2xl border border-zinc-200 divide-y divide-zinc-100">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-3.5">
            <Skeleton className="h-4 w-4 rounded-sm shrink-0" />
            <Skeleton className="h-4 w-40" />
          </div>
        ))}
      </div>
      <Skeleton className="h-12 w-full rounded-xl" />
    </div>
  )
}

export default function JobDetailClient({ jobId, accessToken }: {
  jobId:       string
  accessToken: string
}) {
  const [job, setJob]         = useState<FitmentJob | null>(null)
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [error, setError]     = useState('')

  useEffect(() => {
    fetch(`${API}/api/fitter/portal/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => setJob(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [jobId, accessToken])

  async function updateStatus(status: 'accepted' | 'completed' | 'cancelled') {
    setError('')
    const res = await fetch(`${API}/api/fitter/portal/jobs/${jobId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) { setError('Failed to update job status.'); return }
    setJob(prev => prev ? { ...prev, job_status: status } : prev)
  }

  if (loading) return <LoadingSkeleton />

  if (!job) {
    return (
      <div className="p-4 sm:p-6">
        <FitterBreadcrumb crumbs={[{ label: 'Jobs', href: '/fitter/jobs' }, { label: 'Not found' }]} />
        <p className="text-sm text-zinc-500 mt-5">Job not found.</p>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <FitterBreadcrumb crumbs={[
          { label: 'Jobs', href: '/fitter/jobs' },
          { label: job.task_number },
        ]} />
        <div className="flex items-start justify-between gap-3 mt-5">
          <div>
            <h1 className="text-xl font-bold text-zinc-900">{job.customer_name}</h1>
            <p className="text-sm text-zinc-400 mt-0.5">{job.task_number}</p>
          </div>
          <StatusBadge status={job.job_status} />
        </div>
      </div>

      <div className="space-y-4">
        {/* Contact & schedule */}
        <div className="bg-white rounded-2xl border border-zinc-200 divide-y divide-zinc-100">
          {job.customer_phone && (
            <div className="flex items-center gap-3 px-5 py-3.5">
              <Phone className="w-4 h-4 text-zinc-400 shrink-0" />
              <span className="text-sm text-zinc-700">{job.customer_phone}</span>
            </div>
          )}
          {job.scheduled_date && (
            <div className="flex items-center gap-3 px-5 py-3.5">
              <Calendar className="w-4 h-4 text-zinc-400 shrink-0" />
              <span className="text-sm text-zinc-700">{fmtDate(job.scheduled_date)}</span>
            </div>
          )}
          {job.scheduled_time && (
            <div className="flex items-center gap-3 px-5 py-3.5">
              <Clock className="w-4 h-4 text-zinc-400 shrink-0" />
              <span className="text-sm text-zinc-700">{fmt12h(job.scheduled_time)}</span>
            </div>
          )}
          {job.vehicle_model && (
            <div className="flex items-center gap-3 px-5 py-3.5">
              <Car className="w-4 h-4 text-zinc-400 shrink-0" />
              <span className="text-sm text-zinc-700">{job.vehicle_model}</span>
            </div>
          )}
        </div>

        {/* Tyre details */}
        {(job.tyre_pattern || job.tyre_size) && (
          <div className="bg-white rounded-2xl border border-zinc-200 px-5 py-4">
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-4 h-4 text-zinc-400" />
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Tyre Details</p>
            </div>
            {job.tyre_pattern && <p className="text-sm font-medium text-zinc-900">{job.tyre_pattern}</p>}
            <p className="text-sm text-zinc-500 mt-0.5">
              {[job.tyre_size, job.quantity ? `× ${job.quantity}` : null].filter(Boolean).join(' ')}
            </p>
          </div>
        )}

        {/* Earnings */}
        {job.earnings_amount != null && (
          <div className="bg-white rounded-2xl border border-zinc-200 px-5 py-4 flex items-center justify-between">
            <p className="text-sm text-zinc-500">Earnings</p>
            <p className="text-lg font-bold text-zinc-900">{fmtCurrency(job.earnings_amount)}</p>
          </div>
        )}

        {/* Notes */}
        {job.notes && (
          <div className="bg-white rounded-2xl border border-zinc-200 px-5 py-4">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Notes</p>
            <p className="text-sm text-zinc-700">{job.notes}</p>
          </div>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        {/* Actions */}
        {job.job_status === 'pending' && (
          <div className="grid grid-cols-2 gap-3 pt-1">
            <Button
              size="sm"
              onClick={() => startTransition(() => updateStatus('accepted'))}
              disabled={isPending}
              className="rounded-xl bg-primary text-zinc-900 hover:bg-primary/90 h-12 font-semibold disabled:opacity-40"
            >
              <Check className="w-4 h-4" />
              Confirm Job
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => startTransition(() => updateStatus('cancelled'))}
              disabled={isPending}
              className="rounded-xl h-12 disabled:opacity-40"
            >
              <X className="w-4 h-4" />
              Cancel
            </Button>
          </div>
        )}

        {job.job_status === 'accepted' && (
          <Button
            size="sm"
            onClick={() => startTransition(() => updateStatus('completed'))}
            disabled={isPending}
            className="w-full rounded-xl bg-primary text-zinc-900 hover:bg-primary/90 h-12 font-semibold disabled:opacity-40"
          >
            <Check className="w-4 h-4" />
            Mark Complete
          </Button>
        )}
      </div>
    </div>
  )
}
