'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { Phone, Calendar, Clock, Car, Package, Check, X, Play, FileText, ShieldAlert, Wrench, ChevronDown } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Button }  from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { FitmentJob, FitmentJobItem } from '@/types/fitter.types'
import { FitterBreadcrumb } from '@/components/fitter/FitterBreadcrumb'
import { fmt12h, fmtDate }  from '@/lib/fitter-format'
import { useFitterJobDetail } from '@/lib/query/fitter-hooks'
import { fitterKeys } from '@/lib/query/keys'
import { BACKEND_API_URL, createBackendHeaders } from '@/lib/backend-api'
import { createClient } from '@/lib/supabase/client'

async function getToken(): Promise<string> {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.access_token ?? ''
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(n)
}

function fmtTimestamp(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function InfoRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <span className="text-zinc-400 shrink-0">{icon}</span>
      <span className="text-sm text-zinc-700">{children}</span>
    </div>
  )
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

export default function JobDetailClient({ jobId }: { jobId: string }) {
  const queryClient = useQueryClient()
  const [isPending, startTransition] = useTransition()
  const [error,        setError]        = useState('')
  const [fitterNotes,  setFitterNotes]  = useState('')
  const [notesSaved,   setNotesSaved]   = useState(false)
  const seededJobId = useRef<string | null>(null)

  const { data: job, isPending: loading } = useFitterJobDetail(jobId)

  useEffect(() => {
    if (job && job.job_id !== seededJobId.current) {
      setFitterNotes(job.fitter_notes ?? '')
      seededJobId.current = job.job_id
    }
  }, [job])

  async function updateStatus(status: 'pending' | 'assigned' | 'accepted' | 'rejected' | 'in_progress' | 'completed' | 'cancelled') {
    setError('')
    const token = await getToken()
    const res = await fetch(`${BACKEND_API_URL}/api/fitter/portal/jobs/${jobId}`, {
      method:  'PATCH',
      headers: createBackendHeaders(token, { 'Content-Type': 'application/json' }),
      body:    JSON.stringify({ status }),
    })
    if (!res.ok) { setError('Failed to update job status.'); return }

    // Update this job detail in cache
    queryClient.setQueryData<FitmentJob>(fitterKeys.jobDetail(jobId), prev =>
      prev ? { ...prev, job_status: status } : prev
    )
    // Reflect change in the jobs list cache
    queryClient.setQueryData<FitmentJob[]>(fitterKeys.jobs(), prev =>
      prev?.map(j => j.job_id === jobId ? { ...j, job_status: status } : j)
    )
    // KPIs may change — invalidate so they refetch
    queryClient.invalidateQueries({ queryKey: fitterKeys.kpis() })
  }

  async function saveNotes() {
    if (!job) return
    setError('')
    const token = await getToken()
    const res = await fetch(`${BACKEND_API_URL}/api/fitter/portal/jobs/${jobId}`, {
      method:  'PATCH',
      headers: createBackendHeaders(token, { 'Content-Type': 'application/json' }),
      body:    JSON.stringify({ status: job.job_status, fitter_notes: fitterNotes }),
    })
    if (!res.ok) { setError('Failed to save notes.'); return }
    queryClient.setQueryData<FitmentJob>(fitterKeys.jobDetail(jobId), prev =>
      prev ? { ...prev, fitter_notes: fitterNotes } : prev
    )
    setNotesSaved(true)
    setTimeout(() => setNotesSaved(false), 2000)
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

  const isTerminal = job.job_status === 'completed' || job.job_status === 'cancelled' || job.job_status === 'rejected'

  const SERVICE_LABEL: Record<string, string> = {
    fit_only:       'Fit only',
    supply_and_fit: 'Supply & fit',
    alignment:      'Wheel alignment',
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl">
      {/* Header */}
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
          <div className="relative shrink-0">
            <select
              value={job.job_status}
              disabled={isPending}
              onChange={e => startTransition(() => updateStatus(e.target.value as any))}
              className="appearance-none pl-3 pr-8 py-1.5 rounded-full text-xs font-semibold border cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50
                bg-white border-zinc-200 text-zinc-700
                [&[data-status='pending']]:bg-blue-50 [&[data-status='pending']]:border-blue-200 [&[data-status='pending']]:text-blue-700
                [&[data-status='assigned']]:bg-violet-50 [&[data-status='assigned']]:border-violet-200 [&[data-status='assigned']]:text-violet-700
                [&[data-status='accepted']]:bg-amber-50 [&[data-status='accepted']]:border-amber-200 [&[data-status='accepted']]:text-amber-700
                [&[data-status='in_progress']]:bg-orange-50 [&[data-status='in_progress']]:border-orange-200 [&[data-status='in_progress']]:text-orange-700
                [&[data-status='completed']]:bg-green-50 [&[data-status='completed']]:border-green-200 [&[data-status='completed']]:text-green-700
                [&[data-status='cancelled']]:bg-zinc-100 [&[data-status='cancelled']]:border-zinc-200 [&[data-status='cancelled']]:text-zinc-500
                [&[data-status='rejected']]:bg-red-50 [&[data-status='rejected']]:border-red-200 [&[data-status='rejected']]:text-red-600"
              data-status={job.job_status}
            >
              <option value="pending">Pending</option>
              <option value="assigned">Assigned</option>
              <option value="accepted">Accepted</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="rejected">Rejected</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400" />
          </div>
        </div>
      </div>

      <div className="space-y-4">

        {/* Contact & schedule */}
        <div className="bg-white rounded-2xl border border-zinc-200 divide-y divide-zinc-100">
          {job.customer_phone && (
            <InfoRow icon={<Phone className="w-4 h-4" />}>
              <a href={`tel:${job.customer_phone}`} className="hover:text-primary transition-colors">
                {job.customer_phone}
              </a>
            </InfoRow>
          )}
          {job.scheduled_date && (
            <InfoRow icon={<Calendar className="w-4 h-4" />}>
              {fmtDate(job.scheduled_date)}
            </InfoRow>
          )}
          {job.scheduled_time && (
            <InfoRow icon={<Clock className="w-4 h-4" />}>
              {fmt12h(job.scheduled_time)}
            </InfoRow>
          )}
          {job.vehicle_model && (
            <InfoRow icon={<Car className="w-4 h-4" />}>
              {job.vehicle_model}
            </InfoRow>
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

        {/* Linked job items (fitment_job_items) — shown when populated by admin/order flow */}
        {job.items && job.items.length > 0 && (
          <div className="bg-white rounded-2xl border border-zinc-200 px-5 py-4">
            <div className="flex items-center gap-2 mb-3">
              <Wrench className="w-4 h-4 text-zinc-400" />
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Items to Fit</p>
            </div>
            <div className="space-y-2">
              {job.items.map((item: FitmentJobItem) => (
                <div key={item.job_item_id} className="flex items-center justify-between text-sm py-1.5 border-b border-zinc-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-zinc-100 text-zinc-500 text-[10px] font-bold shrink-0">
                      {item.quantity}
                    </span>
                    <span className="text-zinc-700">
                      {item.service_type ? SERVICE_LABEL[item.service_type] ?? item.service_type : 'Fit'}
                      {item.product_id && (
                        <span className="ml-1.5 text-xs text-zinc-400 font-mono">{item.product_id.slice(0, 8)}</span>
                      )}
                    </span>
                  </div>
                  {item.unit_price != null && (
                    <span className="text-zinc-600 font-medium">{fmtCurrency(item.unit_price)}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status timestamps */}
        {(job.accepted_at || job.completed_at) && (
          <div className="bg-white rounded-2xl border border-zinc-200 px-5 py-4 space-y-2">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">Timeline</p>
            {job.accepted_at && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-500">Accepted</span>
                <span className="text-zinc-700 font-medium">{fmtTimestamp(job.accepted_at)}</span>
              </div>
            )}
            {job.completed_at && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-500">Completed</span>
                <span className="text-zinc-700 font-medium">{fmtTimestamp(job.completed_at)}</span>
              </div>
            )}
          </div>
        )}

        {/* Admin notes — read only */}
        {job.admin_notes && (
          <div className="bg-amber-50 rounded-2xl border border-amber-200 px-5 py-4">
            <div className="flex items-center gap-2 mb-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Note from Admin</p>
            </div>
            <p className="text-sm text-amber-900">{job.admin_notes}</p>
          </div>
        )}

        {/* Fitter notes — editable */}
        {!isTerminal && (
          <div className="bg-white rounded-2xl border border-zinc-200 px-5 py-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-zinc-400" />
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Your Notes</p>
            </div>
            <textarea
              value={fitterNotes}
              onChange={e => { setFitterNotes(e.target.value); setNotesSaved(false) }}
              placeholder="Add notes about this job…"
              rows={3}
              className="w-full text-sm text-zinc-700 placeholder:text-zinc-400 border border-zinc-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
            <button
              type="button"
              onClick={saveNotes}
              disabled={isPending || fitterNotes === (job.fitter_notes ?? '')}
              className="mt-2 text-xs font-semibold text-primary hover:text-primary/80 disabled:text-zinc-400 disabled:cursor-not-allowed transition-colors"
            >
              {notesSaved ? '✓ Saved' : 'Save notes'}
            </button>
          </div>
        )}

        {/* Fitter notes — read only when job is terminal */}
        {isTerminal && job.fitter_notes && (
          <div className="bg-white rounded-2xl border border-zinc-200 px-5 py-4">
            <div className="flex items-center gap-2 mb-1.5">
              <FileText className="w-4 h-4 text-zinc-400" />
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Your Notes</p>
            </div>
            <p className="text-sm text-zinc-700">{job.fitter_notes}</p>
          </div>
        )}

        {/* Earnings */}
        {job.earnings_amount != null && (
          <div className="bg-white rounded-2xl border border-zinc-200 px-5 py-4 flex items-center justify-between">
            <p className="text-sm text-zinc-500">Earnings</p>
            <p className="text-lg font-bold text-zinc-900">{fmtCurrency(job.earnings_amount)}</p>
          </div>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        {/* Actions */}
        {job.job_status === 'assigned' && (
          <div className="grid grid-cols-2 gap-3 pt-1">
            <Button
              onClick={() => startTransition(() => updateStatus('accepted'))}
              disabled={isPending}
              className="rounded-xl bg-primary text-zinc-900 hover:bg-primary/90 h-12 font-semibold disabled:opacity-40"
            >
              <Check className="w-4 h-4" />
              Accept Job
            </Button>
            <Button
              variant="outline"
              onClick={() => startTransition(() => updateStatus('rejected'))}
              disabled={isPending}
              className="rounded-xl h-12 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
            >
              <X className="w-4 h-4" />
              Reject
            </Button>
          </div>
        )}

        {job.job_status === 'pending' && (
          <div className="grid grid-cols-2 gap-3 pt-1">
            <Button
              onClick={() => startTransition(() => updateStatus('accepted'))}
              disabled={isPending}
              className="rounded-xl bg-primary text-zinc-900 hover:bg-primary/90 h-12 font-semibold disabled:opacity-40"
            >
              <Check className="w-4 h-4" />
              Confirm Job
            </Button>
            <Button
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
          <div className="grid grid-cols-2 gap-3 pt-1">
            <Button
              onClick={() => startTransition(() => updateStatus('in_progress'))}
              disabled={isPending}
              className="rounded-xl bg-blue-600 text-white hover:bg-blue-700 h-12 font-semibold disabled:opacity-40"
            >
              <Play className="w-4 h-4" />
              Start Job
            </Button>
            <Button
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

        {job.job_status === 'in_progress' && (
          <Button
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
