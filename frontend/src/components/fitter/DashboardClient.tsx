'use client'

import { useState, useTransition } from 'react'
import {
  ShoppingCart,
  ClipboardList,
  CalendarDays,
  Receipt,
  Phone,
  Clock,
  Calendar,
  Check,
} from 'lucide-react'
import { Button }  from '@/components/ui/button'
import { Badge }   from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { FitmentJob, FitterKPIs, JobStatus } from '@/types/fitter.types'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({ title, value, subtitle, icon }: {
  title:    string
  value:    string | number
  subtitle: string
  icon:     React.ReactNode
}) {
  return (
    <Card className="rounded-2xl border-zinc-200 shadow-none">
      <CardContent className="px-5 py-5 flex flex-col gap-2">
        <div className="flex items-start justify-between">
          <p className="text-sm font-medium text-zinc-500">{title}</p>
          <span className="text-zinc-300">{icon}</span>
        </div>
        <p className="text-3xl font-bold text-zinc-900 leading-none">{value}</p>
        <p className="text-xs text-zinc-400">{subtitle}</p>
      </CardContent>
    </Card>
  )
}

// ── Status Badge ──────────────────────────────────────────────────────────────

const BADGE_STYLE: Record<JobStatus, string> = {
  pending:     'bg-blue-100 text-blue-500 hover:bg-blue-100',
  assigned:    'bg-blue-100 text-primary hover:bg-blue-100',
  accepted:    'bg-amber-100 text-amber-600 hover:bg-amber-100',
  rejected:    'bg-red-100 text-red-600 hover:bg-red-100',
  in_progress: 'bg-orange-100 text-orange-700 hover:bg-orange-100',
  completed:   'bg-green-100 text-green-700 hover:bg-green-100',
  cancelled:   'bg-red-100 text-red-600 hover:bg-red-100',
}

const BADGE_LABEL: Record<JobStatus, string> = {
  pending:     'New',
  assigned:    'Assigned',
  accepted:    'Accepted',
  rejected:    'Rejected',
  in_progress: 'In Progress',
  completed:   'Completed',
  cancelled:   'Cancelled',
}

function StatusBadge({ status }: { status: JobStatus }) {
  return (
    <Badge className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border-0 ${BADGE_STYLE[status]}`}>
      {BADGE_LABEL[status]}
    </Badge>
  )
}

// ── Job Card ──────────────────────────────────────────────────────────────────

function JobCard({ job, onStatusChange }: {
  job:            FitmentJob
  onStatusChange: (jobId: string, status: 'accepted' | 'completed' | 'cancelled') => void
}) {
  const [isPending, startTransition] = useTransition()

  const fmtDate = job.scheduled_date
    ? new Date(job.scheduled_date).toISOString().slice(0, 10)
    : null
  const fmtTime = job.scheduled_time
    ? (() => {
        const [h, m] = job.scheduled_time.split(':').map(Number)
        const suffix = h < 12 ? 'AM' : 'PM'
        const hour   = h % 12 || 12
        return `${hour}:${String(m).padStart(2, '0')} ${suffix}`
      })()
    : null

  return (
    <div className={`bg-white rounded-2xl border border-zinc-200 p-4 space-y-3 transition-opacity ${isPending ? 'opacity-50' : ''}`}>
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-zinc-900">{job.customer_name}</p>
          <StatusBadge status={job.job_status} />
        </div>
        <p className="text-xs text-zinc-400 mt-0.5">{job.task_number}</p>
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
        {job.customer_phone && (
          <span className="flex items-center gap-1">
            <Phone className="w-3.5 h-3.5" />
            {job.customer_phone}
          </span>
        )}
        {fmtDate && (
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {fmtDate}
          </span>
        )}
        {fmtTime && (
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {fmtTime}
          </span>
        )}
      </div>

      {/* Tyre info */}
      {(job.tyre_pattern || job.tyre_size) && (
        <div className="bg-zinc-50 rounded-xl px-3 py-2.5">
          {job.tyre_pattern && (
            <p className="text-sm font-medium text-zinc-800">{job.tyre_pattern}</p>
          )}
          {job.tyre_size && (
            <p className="text-xs text-zinc-500 mt-0.5">
              {job.tyre_size} × {job.quantity}
            </p>
          )}
        </div>
      )}

      {/* Cancellation note */}
      {job.job_status === 'cancelled' && job.notes && (
        <p className="text-xs text-zinc-400 italic">Note: {job.notes}</p>
      )}

      {/* Actions — New Requests */}
      {job.job_status === 'pending' && (
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button
            onClick={() => startTransition(() => onStatusChange(job.job_id, 'accepted'))}
            disabled={isPending}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-primary h-auto py-2.5 text-sm font-semibold text-zinc-900 hover:bg-primary/90 disabled:opacity-40"
          >
            <Check className="w-4 h-4" />
            Confirm Job
          </Button>
          <Button
            variant="outline"
            disabled={isPending}
            className="rounded-xl border-zinc-300 h-auto py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
          >
            Re-Schedule
          </Button>
        </div>
      )}

      {/* Actions — Accepted */}
      {job.job_status === 'accepted' && (
        <Button
          onClick={() => startTransition(() => onStatusChange(job.job_id, 'completed'))}
          disabled={isPending}
          className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-primary h-auto py-2.5 text-sm font-semibold text-zinc-900 hover:bg-primary/90 disabled:opacity-40"
        >
          <Check className="w-4 h-4" />
          Mark Complete
        </Button>
      )}
    </div>
  )
}

// ── Tab bar ───────────────────────────────────────────────────────────────────

const TABS: { key: JobStatus; label: string }[] = [
  { key: 'pending',   label: 'New Requests' },
  { key: 'accepted',  label: 'Accepted'     },
  { key: 'completed', label: 'Completed'    },
  { key: 'cancelled', label: 'Cancelled'    },
]

// ── Main Component ────────────────────────────────────────────────────────────

export default function DashboardClient({
  initialKPIs, initialJobs, centreId, accessToken,
}: {
  initialKPIs:  FitterKPIs
  initialJobs:  FitmentJob[]
  centreId:     string
  accessToken:  string
}) {
  const [kpis, setKpis]     = useState<FitterKPIs>(initialKPIs)
  const [jobs, setJobs]     = useState<FitmentJob[]>(initialJobs)
  const [activeTab, setTab] = useState<JobStatus>('pending')

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }

  async function handleStatusChange(jobId: string, status: 'accepted' | 'completed' | 'cancelled') {
    const res = await fetch(`${API}/api/fitter/portal/jobs/${jobId}`, {
      method:  'PATCH',
      headers,
      body:    JSON.stringify({ status }),
    })
    if (!res.ok) return

    setJobs(prev => prev.filter(j => j.job_id !== jobId))

    if (status === 'accepted') {
      setKpis(prev => ({
        ...prev,
        pendingJobs:       Math.max(0, prev.pendingJobs - 1),
        scheduledThisWeek: prev.scheduledThisWeek + 1,
      }))
    }
    if (status === 'completed') {
      setKpis(prev => ({
        ...prev,
        scheduledThisWeek:      Math.max(0, prev.scheduledThisWeek - 1),
        completedJobsThisMonth: prev.completedJobsThisMonth + 1,
      }))
    }
  }

  const filtered = jobs.filter(j => j.job_status === activeTab)

  return (
    <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Welcome back! Here&apos;s your operational overview.</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title="New Jobs Today"
          value={kpis.newJobsToday}
          subtitle="Awaiting your response"
          icon={<ShoppingCart className="w-5 h-5" />}
        />
        <KpiCard
          title="Pending Jobs"
          value={String(kpis.pendingJobs).padStart(2, '0')}
          subtitle="Need scheduling"
          icon={<ClipboardList className="w-5 h-5" />}
        />
        <KpiCard
          title="Scheduled Jobs"
          value={kpis.scheduledThisWeek}
          subtitle="This week"
          icon={<CalendarDays className="w-5 h-5" />}
        />
        <KpiCard
          title="Earnings This Month"
          value={new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(kpis.earningsThisMonth)}
          subtitle={`${kpis.completedJobsThisMonth} jobs completed`}
          icon={<Receipt className="w-5 h-5" />}
        />
      </div>

      {/* Jobs section */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">Jobs</h2>
        <p className="text-sm text-zinc-500 mt-0.5 mb-4">Manage your tyre fitting jobs</p>

        {/* Tab bar */}
        <div className="flex items-center gap-1 mb-5">
          {TABS.map(tab => (
            <Button
              key={tab.key}
              variant="ghost"
              onClick={() => setTab(tab.key)}
              className={`px-4 h-auto py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-primary text-zinc-900 hover:bg-primary/90'
                  : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100'
              }`}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Job cards grid */}
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 py-12 text-center text-sm text-zinc-400">
            No {TABS.find(t => t.key === activeTab)?.label.toLowerCase()} jobs.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(job => (
              <JobCard key={job.job_id} job={job} onStatusChange={handleStatusChange} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
