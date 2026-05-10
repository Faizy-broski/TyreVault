'use client'

import { useState, useEffect, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
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
    <div className="bg-white rounded-xl border border-zinc-200 p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <p className="text-sm text-zinc-500 font-medium">{title}</p>
        <span className="text-zinc-400">{icon}</span>
      </div>
      <div>
        <p className="text-3xl font-bold text-zinc-900">{value}</p>
        <p className="text-xs text-zinc-500 mt-1">{subtitle}</p>
      </div>
    </div>
  )
}

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: JobStatus }) {
  const map: Record<JobStatus, string> = {
    new_request: 'bg-blue-100 text-blue-700',
    accepted:    'text-amber-600',
    completed:   'text-green-600',
    cancelled:   'text-green-600',
  }
  const label: Record<JobStatus, string> = {
    new_request: 'New',
    accepted:    'Accepted',
    completed:   'Completed',
    cancelled:   'Cancelled',
  }
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${map[status]}`}>
      {label[status]}
    </span>
  )
}

// ── Job Card ──────────────────────────────────────────────────────────────────

function JobCard({ job, onStatusChange }: {
  job:            FitmentJob
  onStatusChange: (jobId: string, status: 'accepted' | 'completed' | 'cancelled', notes?: string) => void
}) {
  const [isPending, startTransition] = useTransition()

  function confirm() {
    startTransition(() => onStatusChange(job.job_id, 'accepted'))
  }
  function complete() {
    startTransition(() => onStatusChange(job.job_id, 'completed'))
  }

  const fmtDate = job.scheduled_date
    ? new Date(job.scheduled_date).toLocaleDateString('en-AU', { year: 'numeric', month: '2-digit', day: '2-digit' }).split('/').reverse().join('-')
    : null
  const fmtTime = job.scheduled_time
    ? job.scheduled_time.slice(0, 5).replace(':', ':') + (parseInt(job.scheduled_time) < 12 ? ' AM' : ' PM')
    : null

  return (
    <div className={`bg-white rounded-xl border border-zinc-200 p-4 space-y-3 transition-opacity ${isPending ? 'opacity-60' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-zinc-900">{job.customer_name}</p>
            <StatusBadge status={job.status} />
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">{job.task_number}</p>
        </div>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-4 text-xs text-zinc-500">
        {job.customer_phone && (
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
            </svg>
            {job.customer_phone}
          </span>
        )}
        {fmtDate && (
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25" />
            </svg>
            {fmtDate}
          </span>
        )}
        {fmtTime && (
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {fmtTime}
          </span>
        )}
      </div>

      {/* Tyre info box */}
      {(job.tyre_pattern || job.tyre_size) && (
        <div className="bg-zinc-50 rounded-lg px-3 py-2">
          {job.tyre_pattern && <p className="text-sm font-medium text-zinc-800">{job.tyre_pattern}</p>}
          {job.tyre_size && (
            <p className="text-xs text-zinc-500">{job.tyre_size} × {job.quantity}</p>
          )}
        </div>
      )}

      {/* Cancellation note */}
      {job.status === 'cancelled' && job.notes && (
        <p className="text-xs text-zinc-400 italic">Note: {job.notes}</p>
      )}

      {/* Actions */}
      {job.status === 'new_request' && (
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={confirm}
            disabled={isPending}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-yellow-400 py-2 text-sm font-semibold text-zinc-900 hover:bg-yellow-500 transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            Confirm Job
          </button>
          <button className="rounded-lg border border-zinc-300 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors">
            Re-Schedule
          </button>
        </div>
      )}

      {job.status === 'accepted' && (
        <button
          onClick={complete}
          disabled={isPending}
          className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-yellow-400 py-2 text-sm font-semibold text-zinc-900 hover:bg-yellow-500 transition-colors disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          Mark Complete
        </button>
      )}
    </div>
  )
}

// ── Tab bar ───────────────────────────────────────────────────────────────────

const TABS: { key: JobStatus; label: string }[] = [
  { key: 'new_request', label: 'New Requests' },
  { key: 'accepted',    label: 'Accepted'     },
  { key: 'completed',   label: 'Completed'    },
  { key: 'cancelled',   label: 'Cancelled'    },
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
  const [activeTab, setTab] = useState<JobStatus>('new_request')

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }

  // ── Supabase Realtime: new job push ────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient()
    const channel  = supabase
      .channel('fitter-jobs')
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'fitment_jobs',
        filter: `fitment_centre_id=eq.${centreId}`,
      }, payload => {
        const newJob = payload.new as FitmentJob
        setJobs(prev => [newJob, ...prev])
        setKpis(prev => ({
          ...prev,
          newJobsToday: prev.newJobsToday + 1,
          pendingJobs:  prev.pendingJobs  + 1,
        }))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [centreId])

  // ── Refetch jobs when tab changes ──────────────────────────────────────────
  useEffect(() => {
    fetch(`${API}/api/fitter/portal/jobs?status=${activeTab}`, { headers })
      .then(r => r.ok ? r.json() : [])
      .then(data => setJobs(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [activeTab])

  // ── Status update ──────────────────────────────────────────────────────────
  async function handleStatusChange(jobId: string, status: 'accepted' | 'completed' | 'cancelled', notes?: string) {
    const res = await fetch(`${API}/api/fitter/portal/jobs/${jobId}`, {
      method:  'PATCH',
      headers,
      body:    JSON.stringify({ status, notes }),
    })
    if (!res.ok) return

    setJobs(prev => prev.map(j => j.job_id === jobId ? { ...j, status } : j))

    if (status === 'accepted') {
      setKpis(prev => ({ ...prev, pendingJobs: Math.max(0, prev.pendingJobs - 1), scheduledThisWeek: prev.scheduledThisWeek + 1 }))
    }
    if (status === 'completed') {
      setKpis(prev => ({ ...prev, scheduledThisWeek: Math.max(0, prev.scheduledThisWeek - 1) }))
    }
  }

  const filtered = jobs.filter(j => j.status === activeTab)

  return (
    <div className="p-6 space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          title="New Jobs Today" value={kpis.newJobsToday} subtitle="Awaiting your response"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" /></svg>}
        />
        <KpiCard
          title="Pending Jobs" value={String(kpis.pendingJobs).padStart(2, '0')} subtitle="Need scheduling"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
        />
        <KpiCard
          title="Scheduled Jobs" value={kpis.scheduledThisWeek} subtitle="This week"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>}
        />
        <KpiCard
          title="Earnings This Month"
          value={new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(kpis.earningsThisMonth)}
          subtitle={`${kpis.completedJobsThisMonth} jobs completed`}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>}
        />
      </div>

      {/* Jobs section */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">Jobs</h2>
        <p className="text-sm text-zinc-500 mt-0.5 mb-4">Manage your tyre fitting jobs</p>

        {/* Tab bar */}
        <div className="flex items-center gap-1 mb-5 border-b border-zinc-200">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg -mb-px transition-colors ${
                activeTab === tab.key
                  ? 'bg-yellow-400 text-zinc-900 border-b-2 border-yellow-400'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Job cards grid */}
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 py-12 text-center text-sm text-zinc-400">
            No {TABS.find(t => t.key === activeTab)?.label.toLowerCase()} jobs.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {filtered.map(job => (
              <JobCard key={job.job_id} job={job} onStatusChange={handleStatusChange} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
