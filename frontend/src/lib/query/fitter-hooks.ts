'use client'

import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { fetchBackendJson } from '@/lib/backend-api'
import { fitterKeys } from './keys'
import type { FitmentJob, FitterKPIs, FitterEarning, FitterProfile, FitterServices, FitterPricingRow } from '@/types/fitter.types'

async function getToken(): Promise<string> {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.access_token ?? ''
}

const JOBS_STALE     = 30_000        // 30 s — changes with every status update
const SETTINGS_STALE = 5 * 60_000   // 5 min — pricing / profile / services rarely change
const SCHEDULE_STALE = 2 * 60_000   // 2 min — per-week calendar
const EARNINGS_STALE = 30_000       // 30 s

// ─── KPIs ────────────────────────────────────────────────────────────────────

export function useFitterKPIs(opts?: { initialData?: FitterKPIs }) {
  return useQuery({
    queryKey:    fitterKeys.kpis(),
    queryFn:     async () => fetchBackendJson<FitterKPIs>('/api/fitter/portal/kpis', await getToken()),
    staleTime:   JOBS_STALE,
    initialData: opts?.initialData,
    initialDataUpdatedAt: opts?.initialData ? Date.now() : undefined,
  })
}

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export function useFitterJobs(opts?: { initialData?: FitmentJob[] }) {
  return useQuery({
    queryKey:    fitterKeys.jobs(),
    queryFn:     async () => fetchBackendJson<FitmentJob[]>('/api/fitter/portal/jobs', await getToken()),
    staleTime:   JOBS_STALE,
    initialData: opts?.initialData,
    initialDataUpdatedAt: opts?.initialData ? Date.now() : undefined,
  })
}

export function useFitterJobDetail(jobId: string) {
  return useQuery({
    queryKey:  fitterKeys.jobDetail(jobId),
    queryFn:   async () => fetchBackendJson<FitmentJob>(`/api/fitter/portal/jobs/${jobId}`, await getToken()),
    staleTime: 2 * 60_000,
    enabled:   !!jobId,
  })
}

// ─── Schedule ────────────────────────────────────────────────────────────────

interface ScheduleJob {
  job_id:         string
  customer_name:  string
  vehicle_model:  string | null
  scheduled_date: string
  scheduled_time: string
  job_status:     string
  tyre_size:      string | null
  quantity:       number
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

export function useFitterSchedule(monday: Date) {
  const weekStart = toISO(monday)
  const weekEnd   = toISO(addDays(monday, 6))
  return useQuery({
    queryKey: fitterKeys.schedule(weekStart, weekEnd),
    queryFn:  async () =>
      fetchBackendJson<ScheduleJob[]>(
        `/api/fitter/portal/schedule?weekStart=${weekStart}&weekEnd=${weekEnd}`,
        await getToken(),
      ),
    staleTime: SCHEDULE_STALE,
  })
}

// ─── Earnings ────────────────────────────────────────────────────────────────

type EarningsSummary = { thisMonth: number; pendingTotal: number; completedCount: number }
type EarningsListResponse = { data: FitterEarning[]; total: number }

export function useFitterEarningsSummary(opts?: { initialData?: EarningsSummary }) {
  return useQuery({
    queryKey:    fitterKeys.earningsSummary(),
    queryFn:     async () => fetchBackendJson<EarningsSummary>('/api/fitter/portal/earnings/summary', await getToken()),
    staleTime:   60_000,
    initialData: opts?.initialData,
    initialDataUpdatedAt: opts?.initialData ? Date.now() : undefined,
  })
}

export type EarningsListParams = { statusFilter: string; search: string; page: number }

export function useFitterEarningsList(p: EarningsListParams, opts?: { initialData?: EarningsListResponse }) {
  const qs = new URLSearchParams({ page: String(p.page) })
  if (p.statusFilter) qs.set('status', p.statusFilter)
  if (p.search)       qs.set('search', p.search)

  return useQuery({
    queryKey:        fitterKeys.earningsList(Object.fromEntries(qs)),
    queryFn:         async () => fetchBackendJson<EarningsListResponse>(`/api/fitter/portal/earnings?${qs}`, await getToken()),
    staleTime:       EARNINGS_STALE,
    placeholderData: keepPreviousData,
    initialData:     p.page === 1 && !p.statusFilter && !p.search ? opts?.initialData : undefined,
    initialDataUpdatedAt: p.page === 1 && !p.statusFilter && !p.search && opts?.initialData ? Date.now() : undefined,
  })
}

// ─── Pricing ─────────────────────────────────────────────────────────────────

export function useFitterPricing() {
  return useQuery({
    queryKey: fitterKeys.pricing(),
    queryFn:  async () => fetchBackendJson<FitterPricingRow[]>('/api/fitter/portal/pricing', await getToken()),
    staleTime: SETTINGS_STALE,
  })
}

// ─── Profile ─────────────────────────────────────────────────────────────────

export function useFitterProfile() {
  return useQuery({
    queryKey: fitterKeys.profile(),
    queryFn:  async () => fetchBackendJson<FitterProfile>('/api/fitter/portal/profile', await getToken()),
    staleTime: SETTINGS_STALE,
  })
}

// ─── Services ────────────────────────────────────────────────────────────────

export function useFitterServicesData() {
  return useQuery({
    queryKey: fitterKeys.services(),
    queryFn:  async () => fetchBackendJson<FitterServices>('/api/fitter/portal/services', await getToken()),
    staleTime: SETTINGS_STALE,
  })
}
