'use client'

import { useState, useTransition, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  ShoppingCart, ClipboardList, CalendarDays, Receipt,
  Phone, Clock, Calendar, Check, TrendingUp,
} from 'lucide-react'
import { Button }                  from '@/components/ui/button'
import { Card, CardContent }       from '@/components/ui/card'
import { Skeleton }                from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import type { FitmentJob, FitterKPIs, JobStatus } from '@/types/fitter.types'
import { StatusBadge }             from '@/components/fitter/StatusBadge'
import { FitterBreadcrumb }        from '@/components/fitter/FitterBreadcrumb'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

// ── KPI Card ──────────────────────────────────────────────────────────────────

const KPI_THEMES = {
  blue:    { bg: 'bg-blue-50',    icon: 'text-blue-500',    ring: 'ring-blue-100'    },
  amber:   { bg: 'bg-amber-50',   icon: 'text-amber-500',   ring: 'ring-amber-100'   },
  violet:  { bg: 'bg-violet-50',  icon: 'text-violet-500',  ring: 'ring-violet-100'  },
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-500', ring: 'ring-emerald-100' },
} as const

function KpiCard({ title, value, subtitle, icon, theme = 'blue' }: {
  title:    string
  value:    string | number
  subtitle: string
  icon:     React.ReactNode
  theme?:   keyof typeof KPI_THEMES
}) {
  const t = KPI_THEMES[theme]
  return (
    <Card className="rounded-2xl border-zinc-200 shadow-none hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-default group">
      <CardContent className="px-5 py-5">
        <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl ${t.bg} ${t.icon} ring-1 ${t.ring} mb-4 group-hover:scale-105 transition-transform duration-200`}>
          {icon}
        </div>
        <p className="text-3xl font-bold text-zinc-900 leading-none tracking-tight">{value}</p>
        <p className="text-sm font-semibold text-zinc-700 mt-2 leading-tight">{title}</p>
        <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>
      </CardContent>
    </Card>
  )
}

function KpiCardSkeleton() {
  return (
    <Card className="rounded-2xl border-zinc-200 shadow-none">
      <CardContent className="px-5 py-5 space-y-3">
        <Skeleton className="h-9 w-9 rounded-xl" />
        <Skeleton className="h-8 w-16 mt-1" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-36" />
      </CardContent>
    </Card>
  )
}

// ── Empty State ───────────────────────────────────────────────────────────────

function EmptyJobsState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 text-center">
      <div className="w-12 h-12 rounded-2xl bg-white border border-zinc-200 shadow-sm flex items-center justify-center mb-4">
        <ClipboardList className="w-5 h-5 text-zinc-300" />
      </div>
      <p className="text-sm font-semibold text-zinc-500">No {label.toLowerCase()}</p>
      <p className="text-xs text-zinc-400 mt-1">Jobs will appear here once available</p>
    </div>
  )
}

// ── Job Card ──────────────────────────────────────────────────────────────────

function JobCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-4 space-y-3">
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-3 w-48" />
      <Skeleton className="h-11 w-full rounded-xl" />
    </div>
  )
}

const STATUS_LEFT_ACCENT: Partial<Record<JobStatus, string>> = {
  pending:     'border-l-[3px] border-l-blue-400',
  accepted:    'border-l-[3px] border-l-amber-400',
  in_progress: 'border-l-[3px] border-l-orange-400',
  completed:   'border-l-[3px] border-l-green-400',
  cancelled:   'border-l-[3px] border-l-zinc-300',
}

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
        return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
      })()
    : null

  const accent = STATUS_LEFT_ACCENT[job.job_status] ?? ''

  return (
    <Link href={`/fitter/jobs/${job.job_id}`} className={`bg-white rounded-2xl border border-zinc-200 p-4 space-y-3 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${accent} ${isPending ? 'opacity-50' : ''}`}>
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-zinc-900">{job.customer_name}</p>
          <StatusBadge status={job.job_status} />
        </div>
        <p className="text-xs text-zinc-400 mt-0.5 font-mono">{job.task_number}</p>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
        {job.customer_phone && (
          <span className="flex items-center gap-1">
            <Phone className="w-3.5 h-3.5 text-zinc-400" />{job.customer_phone}
          </span>
        )}
        {fmtDate && (
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-zinc-400" />{fmtDate}
          </span>
        )}
        {fmtTime && (
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />{fmtTime}
          </span>
        )}
      </div>

      {(job.tyre_pattern || job.tyre_size) && (
        <div className="bg-zinc-50 rounded-xl px-3 py-2.5 border border-zinc-100">
          {job.tyre_pattern && (
            <p className="text-sm font-medium text-zinc-800">{job.tyre_pattern}</p>
          )}
          {job.tyre_size && (
            <p className="text-xs text-zinc-500 mt-0.5">{job.tyre_size} × {job.quantity}</p>
          )}
        </div>
      )}

      {job.job_status === 'cancelled' && job.notes && (
        <p className="text-xs text-zinc-400 italic">Note: {job.notes}</p>
      )}

      {job.job_status === 'pending' && (
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button
            size="sm"
            onClick={() => startTransition(() => onStatusChange(job.job_id, 'accepted'))}
            disabled={isPending}
            className="rounded-xl bg-primary text-zinc-900 hover:bg-primary/90 h-10 font-semibold disabled:opacity-40 transition-all duration-150"
          >
            <Check className="w-4 h-4" />
            Confirm Job
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            className="rounded-xl h-10 disabled:opacity-40 transition-all duration-150"
          >
            Re-Schedule
          </Button>
        </div>
      )}

      {job.job_status === 'accepted' && (
        <Button
          size="sm"
          onClick={() => startTransition(() => onStatusChange(job.job_id, 'completed'))}
          disabled={isPending}
          className="w-full rounded-xl bg-primary text-zinc-900 hover:bg-primary/90 h-10 font-semibold disabled:opacity-40 transition-all duration-150"
        >
          <Check className="w-4 h-4" />
          Mark Complete
        </Button>
      )}
    </Link>
  )
}

// ── Tab config ─────────────────────────────────────────────────────────────────

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
  const [kpis,      setKpis]    = useState<FitterKPIs>(initialKPIs)
  const [jobs,      setJobs]    = useState<FitmentJob[]>(initialJobs)
  const [activeTab, setTab]     = useState<JobStatus>('pending')
  const [loading] = useState(false)

  // Supabase Realtime — push new job assignments without page refresh
  useEffect(() => {
    if (!centreId) return
    const supabase = createClient()
    const channel = supabase
      .channel(`fitter-jobs-${centreId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'fitment_jobs',
          filter: `fitment_centre_id=eq.${centreId}`,
        },
        (payload) => {
          const newJob = payload.new as FitmentJob
          setJobs(prev => {
            if (prev.some(j => j.job_id === newJob.job_id)) return prev
            return [newJob, ...prev]
          })
          setKpis(prev => ({
            ...prev,
            newJobsToday: prev.newJobsToday + 1,
            pendingJobs:  prev.pendingJobs  + 1,
          }))
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [centreId])

  async function handleStatusChange(jobId: string, status: 'accepted' | 'completed' | 'cancelled') {
    const res = await fetch(`${API}/api/fitter/portal/jobs/${jobId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body:    JSON.stringify({ status }),
    })
    if (!res.ok) return

    setJobs(prev => prev.map(j => j.job_id === jobId ? { ...j, job_status: status } : j))

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

  const pendingCount = jobs.filter(j => j.job_status === 'pending').length

  return (
    <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
      <FitterBreadcrumb crumbs={[{ label: 'Dashboard' }]} />

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Welcome back! Here&apos;s your operational overview.</p>
        </div>
        {!loading && pendingCount > 0 && (
          <div className="flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-100 px-3 py-1.5 shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
            </span>
            <span className="text-xs font-semibold text-blue-600">{pendingCount} new</span>
          </div>
        )}
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />)
        ) : (
          <>
            <KpiCard
              theme="blue"
              title="New Jobs Today"
              value={kpis.newJobsToday}
              subtitle="Awaiting your response"
              icon={<ShoppingCart className="w-4 h-4" />}
            />
            <KpiCard
              theme="amber"
              title="Pending Jobs"
              value={String(kpis.pendingJobs).padStart(2, '0')}
              subtitle="Need scheduling"
              icon={<ClipboardList className="w-4 h-4" />}
            />
            <KpiCard
              theme="violet"
              title="Scheduled Jobs"
              value={kpis.scheduledThisWeek}
              subtitle="This week"
              icon={<CalendarDays className="w-4 h-4" />}
            />
            <KpiCard
              theme="emerald"
              title="Earnings This Month"
              value={new Intl.NumberFormat('en-AU', {
                style: 'currency', currency: 'AUD', maximumFractionDigits: 0,
              }).format(kpis.earningsThisMonth)}
              subtitle={`${kpis.completedJobsThisMonth} jobs completed`}
              icon={<Receipt className="w-4 h-4" />}
            />
          </>
        )}
      </div>

      {/* Jobs section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 tracking-tight">Jobs</h2>
            <p className="text-sm text-zinc-500 mt-0.5">Manage your tyre fitting jobs</p>
          </div>
          {!loading && (
            <div className="ml-auto flex items-center gap-1 text-xs text-zinc-400">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{jobs.length} total</span>
            </div>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={v => setTab(v as JobStatus)} className="flex flex-col gap-4">
          <TabsList
            className="bg-transparent p-0 h-auto gap-0.5 flex-wrap justify-start w-full"
          >
            {TABS.map(tab => {
              const count = jobs.filter(j => j.job_status === tab.key).length
              const hasPending = tab.key === 'pending' && !loading && count > 0
              return (
                <TabsTrigger
                  key={tab.key}
                  value={tab.key}
                  className="rounded-lg px-4 py-2 h-auto text-sm font-medium data-active:bg-primary data-active:text-zinc-900 data-active:shadow-none transition-all duration-150"
                >
                  {tab.label}
                  {!loading && count > 0 && (
                    <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold bg-zinc-200/80 text-zinc-600 tabular-nums">
                      {count}
                    </span>
                  )}
                  {hasPending && (
                    <span className="relative flex h-1.5 w-1.5 ml-1">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500" />
                    </span>
                  )}
                </TabsTrigger>
              )
            })}
          </TabsList>

          {TABS.map(tab => {
            const tabJobs = jobs.filter(j => j.job_status === tab.key)
            return (
              <TabsContent key={tab.key} value={tab.key} className="mt-0">
                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {Array.from({ length: 3 }).map((_, i) => <JobCardSkeleton key={i} />)}
                  </div>
                ) : tabJobs.length === 0 ? (
                  <EmptyJobsState label={tab.label} />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {tabJobs.map(job => (
                      <JobCard key={job.job_id} job={job} onStatusChange={handleStatusChange} />
                    ))}
                  </div>
                )}
              </TabsContent>
            )
          })}
        </Tabs>
      </div>
    </div>
  )
}
