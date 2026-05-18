'use client'

import { useState, useEffect, useTransition } from 'react'
import { Phone, Calendar, Clock, Car, Package, Check, X, Play, FileText, ShieldAlert } from 'lucide-react'
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

export default function JobDetailClient({ jobId, accessToken }: {
  jobId:       string
  accessToken: string
}) {
  const [job, setJob]               = useState<FitmentJob | null>(null)
  const [loading, setLoading]       = useState(true)
  const [isPending, startTransition] = useTransition()
  const [error, setError]           = useState('')
  const [fitterNotes, setFitterNotes] = useState('')
  const [notesSaved, setNotesSaved] = useState(false)

  useEffect(() => {
    fetch(`${API}/api/fitter/portal/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setJob(data)
          setFitterNotes(data.fitter_notes ?? '')
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [jobId, accessToken])

  async function updateStatus(status: 'accepted' | 'in_progress' | 'completed' | 'cancelled') {
    setError('')
    const res = await fetch(`${API}/api/fitter/portal/jobs/${jobId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) { setError('Failed to update job status.'); return }
    setJob(prev => prev ? { ...prev, job_status: status } : prev)
  }

  async function saveNotes() {
    setError('')
    const res = await fetch(`${API}/api/fitter/portal/jobs/${jobId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ status: job!.job_status, fitter_notes: fitterNotes }),
    })
    if (!res.ok) { setError('Failed to save notes.'); return }
    setJob(prev => prev ? { ...prev, fitter_notes: fitterNotes } : prev)
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

  const isTerminal = job.job_status === 'completed' || job.job_status === 'cancelled'

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
          <StatusBadge status={job.job_status} />
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
