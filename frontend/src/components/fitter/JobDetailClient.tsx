'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { Phone, Calendar, Clock, Car, Package, Check, X, Play, FileText, ShieldAlert, ChevronDown, Mail, MapPin } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button }  from '@/components/ui/button'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import type { FitmentJobItem } from '@/types/fitter.types'
import { FitterBreadcrumb } from '@/components/fitter/FitterBreadcrumb'
import { fmt12h, fmtDate }  from '@/lib/fitter-format'
import { useFitterJobDetail, useUpdateFitterJob } from '@/lib/query/fitter-hooks'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { MobileTimePicker } from '@mui/x-date-pickers/MobileTimePicker'
import dayjs from 'dayjs'

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

function InfoRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 px-5 py-3.5">
      <span className="text-zinc-400 shrink-0 mt-0.5">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 mb-0.5">{label}</p>
        <div className="text-sm text-zinc-800">{children}</div>
      </div>
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
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error,         setError]         = useState('')
  const [fitterNotes,   setFitterNotes]   = useState('')
  const [notesSaved,    setNotesSaved]    = useState(false)
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [schedSaved,    setSchedSaved]    = useState(false)
  const seededJobId = useRef<string | null>(null)

  const { data: job, isPending: loading } = useFitterJobDetail(jobId)
  const updateJob = useUpdateFitterJob(jobId)

  useEffect(() => {
    if (job && job.job_id !== seededJobId.current) {
      setFitterNotes(job.fitter_notes ?? '')
      setScheduledDate(job.scheduled_date ?? '')
      setScheduledTime(job.scheduled_time ?? '')
      seededJobId.current = job.job_id
    }
  }, [job])

  async function updateStatus(status: 'pending' | 'assigned' | 'accepted' | 'rejected' | 'in_progress' | 'completed' | 'cancelled') {
    setError('')
    try {
      await updateJob.mutateAsync({ status })
      if (status === 'accepted') {
        toast.success('Job confirmed successfully!')
        router.push('/fitter/jobs')
      }
    } catch {
      setError('Failed to update job status.')
    }
  }

  async function saveNotes() {
    if (!job) return
    setError('')
    try {
      await updateJob.mutateAsync({ status: job.job_status, fitter_notes: fitterNotes })
      setNotesSaved(true)
      setTimeout(() => setNotesSaved(false), 2000)
    } catch {
      setError('Failed to save notes.')
    }
  }

  async function saveSchedule() {
    if (!job) return
    setError('')
    try {
      await updateJob.mutateAsync({
        status:         job.job_status,
        scheduled_date: scheduledDate || null,
        scheduled_time: scheduledTime || null,
      })
      setSchedSaved(true)
      setTimeout(() => setSchedSaved(false), 2000)
    } catch {
      setError('Failed to save appointment.')
    }
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

        {/* Customer details — all checkout fields, N/A when empty */}
        <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-100 flex items-center gap-2">
            <span className="text-zinc-400"><Phone className="w-4 h-4" /></span>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Customer Details</p>
          </div>
          <div className="divide-y divide-zinc-100">

            {/* Name row */}
            <div className="grid grid-cols-2 divide-x divide-zinc-100">
              <div className="px-5 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 mb-0.5">First Name</p>
                <p className="text-sm text-zinc-800">{job.customer_name?.split(' ')[0] || 'N/A'}</p>
              </div>
              <div className="px-5 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 mb-0.5">Last Name</p>
                <p className="text-sm text-zinc-800">{job.customer_name?.split(' ').slice(1).join(' ') || 'N/A'}</p>
              </div>
            </div>

            {/* Email */}
            <div className="px-5 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 mb-0.5">Email Address</p>
              {job.customer_email
                ? <a href={`mailto:${job.customer_email}`} className="text-sm text-primary hover:underline break-all">{job.customer_email}</a>
                : <p className="text-sm text-zinc-400">N/A</p>}
            </div>

            {/* Phone */}
            <div className="px-5 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 mb-0.5">Phone Number</p>
              {job.customer_phone
                ? <a href={`tel:${job.customer_phone}`} className="text-sm text-primary hover:underline">{job.customer_phone}</a>
                : <p className="text-sm text-zinc-400">N/A</p>}
            </div>

            {/* Address line 1 */}
            <div className="px-5 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 mb-0.5">Address Line 1</p>
              <p className="text-sm text-zinc-800">{job.shipping_address?.line1 || 'N/A'}</p>
            </div>

            {/* Address line 2 */}
            <div className="px-5 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 mb-0.5">Address Line 2</p>
              <p className="text-sm text-zinc-800">{job.shipping_address?.line2 || 'N/A'}</p>
            </div>

            {/* Suburb / Postcode / State */}
            <div className="grid grid-cols-3 divide-x divide-zinc-100">
              <div className="px-5 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 mb-0.5">Suburb</p>
                <p className="text-sm text-zinc-800">{job.shipping_address?.suburb || 'N/A'}</p>
              </div>
              <div className="px-5 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 mb-0.5">Postcode</p>
                <p className="text-sm text-zinc-800">{job.shipping_address?.postcode || 'N/A'}</p>
              </div>
              <div className="px-5 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 mb-0.5">State</p>
                <p className="text-sm text-zinc-800">{job.shipping_address?.state || 'N/A'}</p>
              </div>
            </div>

            {/* Vehicle */}
            <div className="px-5 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 mb-0.5">Vehicle</p>
              <p className="text-sm text-zinc-800">{job.vehicle_model || 'N/A'}</p>
            </div>

          </div>
        </div>

        {/* Appointment (scheduled) */}
        {(job.scheduled_date || job.scheduled_time) && (
          <div className="bg-white rounded-2xl border border-zinc-200 divide-y divide-zinc-100">
            <div className="grid grid-cols-2 divide-x divide-zinc-100">
              <InfoRow icon={<Calendar className="w-4 h-4" />} label="Appointment Date">
                {job.scheduled_date ? fmtDate(job.scheduled_date) : 'N/A'}
              </InfoRow>
              <InfoRow icon={<Clock className="w-4 h-4" />} label="Appointment Time">
                {job.scheduled_time ? fmt12h(job.scheduled_time) : 'N/A'}
              </InfoRow>
            </div>
          </div>
        )}

        {/* Appointment scheduler — shown for non-terminal jobs so fitter can record arranged time */}
        {!isTerminal && (
          <div className="bg-white rounded-2xl border border-zinc-200 px-5 py-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-zinc-400" />
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                Arranged Appointment
              </p>
            </div>
            <p className="text-xs text-zinc-400 mb-3">
              After contacting the customer, record the agreed fitting date and time here.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Date</label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={e => { setScheduledDate(e.target.value); setSchedSaved(false) }}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Time</label>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <MobileTimePicker
                    value={scheduledTime ? dayjs(`2000-01-01T${scheduledTime}`) : null}
                    onChange={(newValue) => {
                      setScheduledTime(newValue ? newValue.format('HH:mm') : '')
                      setSchedSaved(false)
                    }}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        size: 'small',
                        sx: {
                          '& .MuiOutlinedInput-root': {
                            borderRadius: '0.5rem',
                            backgroundColor: '#fff',
                            '& fieldset': { borderColor: '#e4e4e7' },
                            '&:hover fieldset': { borderColor: '#e4e4e7' },
                            '&.Mui-focused fieldset': { borderColor: '#fde047', borderWidth: '2px' },
                          },
                          '& .MuiInputBase-input': {
                            padding: '0.45rem 0.75rem',
                            fontSize: '0.875rem',
                            color: '#18181b',
                          }
                        }
                      }
                    }}
                  />
                </LocalizationProvider>
              </div>
            </div>
            <button
              type="button"
              onClick={saveSchedule}
              disabled={isPending || (scheduledDate === (job.scheduled_date ?? '') && scheduledTime === (job.scheduled_time ?? ''))}
              className="mt-3 text-xs font-semibold text-primary hover:text-primary/80 disabled:text-zinc-400 disabled:cursor-not-allowed transition-colors"
            >
              {schedSaved ? '✓ Appointment saved' : 'Save appointment'}
            </button>
          </div>
        )}

        {/* Tyre / product details — detailed line items when available, compact fallback otherwise */}
        {job.items && job.items.length > 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-200 px-5 py-4">
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-4 h-4 text-zinc-400" />
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Tyre Details</p>
            </div>
            <div className="space-y-3">
              {job.items.map((item: FitmentJobItem) => (
                <div key={item.job_item_id} className="flex gap-3 text-sm py-2 border-b border-zinc-100 last:border-0">
                  <span className="inline-flex items-center justify-center w-7 h-7 mt-0.5 rounded-full bg-zinc-100 text-zinc-600 text-xs font-bold shrink-0">
                    {item.quantity}×
                  </span>
                  <div className="flex-1 min-w-0">
                    {item.skus ? (
                      <>
                        <p className="font-semibold text-zinc-900">
                          {[item.skus.brands?.brand_name, item.skus.patterns?.pattern_name].filter(Boolean).join(' ') || 'Tyre'}
                        </p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {item.skus.tyre_size_display}
                          {item.skus.sku ? ` · SKU: ${item.skus.sku}` : ''}
                        </p>
                      </>
                    ) : (
                      <p className="font-semibold text-zinc-900">Tyre</p>
                    )}
                    <p className="text-[10px] text-zinc-400 mt-1 uppercase tracking-wider font-semibold">
                      {item.service_type ? SERVICE_LABEL[item.service_type] ?? item.service_type : 'Supply & Fit'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (job.tyre_pattern || job.tyre_size) ? (
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
        ) : null}

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

