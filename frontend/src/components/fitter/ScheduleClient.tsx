'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button }           from '@/components/ui/button'
import { Skeleton }         from '@/components/ui/skeleton'
import { FitterBreadcrumb } from '@/components/fitter/FitterBreadcrumb'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

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

// ── Calendar config ────────────────────────────────────────────────────────────

const HOURS      = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00']
const DAY_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
const MAX_CHIPS  = 2

const JOB_COLORS = [
  'bg-blue-100   text-blue-800   border-blue-200',
  'bg-green-100  text-green-800  border-green-200',
  'bg-purple-100 text-purple-800 border-purple-200',
  'bg-amber-100  text-amber-800  border-amber-200',
  'bg-rose-100   text-rose-800   border-rose-200',
]

// ── Date helpers ───────────────────────────────────────────────────────────────

function getMondayOf(d: Date): Date {
  const day  = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.getFullYear(), d.getMonth(), diff)
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatWeekHeader(monday: Date): string {
  const sunday   = addDays(monday, 6)
  const startDay = monday.getDate()
  const endDay   = sunday.getDate()

  if (monday.getMonth() === sunday.getMonth()) {
    return `${monday.toLocaleDateString('en-AU', { month: 'long' })} ${startDay} – ${endDay}, ${monday.getFullYear()}`
  }
  return `${monday.toLocaleDateString('en-AU', { month: 'short' })} ${startDay} – ${sunday.toLocaleDateString('en-AU', { month: 'short' })} ${endDay}, ${sunday.getFullYear()}`
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ScheduleClient({ accessToken }: { accessToken: string }) {
  const [monday,  setMonday]  = useState<Date>(() => getMondayOf(new Date()))
  const [jobs,    setJobs]    = useState<ScheduleJob[]>([])
  const [loading, setLoading] = useState(false)

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
  const todayISO = toISO(new Date())

  useEffect(() => {
    const weekStart = toISO(monday)
    const weekEnd   = toISO(addDays(monday, 6))
    setLoading(true)
    fetch(`${API}/api/fitter/portal/schedule?weekStart=${weekStart}&weekEnd=${weekEnd}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(r => r.ok ? r.json() : [])
      .then(data => setJobs(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [monday, accessToken])

  // Build: { [isoDate]: { [hourKey]: ScheduleJob[] } }
  const jobMap: Record<string, Record<string, ScheduleJob[]>> = {}
  jobs.forEach(job => {
    const d       = job.scheduled_date
    const h       = job.scheduled_time ? job.scheduled_time.slice(0, 5) : '09:00'
    const hourKey = [...HOURS].reverse().find(hr => hr <= h) ?? HOURS[0]
    if (!jobMap[d])          jobMap[d]          = {}
    if (!jobMap[d][hourKey]) jobMap[d][hourKey] = []
    jobMap[d][hourKey].push(job)
  })

  const isBlocked = (d: Date) => d.getDay() === 0 || d.getDay() === 6

  return (
    <div className="p-4 sm:p-6">
      <FitterBreadcrumb crumbs={[{ label: 'Schedule' }]} />
      <div className="mb-6 mt-5">
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">Schedule</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Manage your weekly job schedule</p>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        {/* Week navigation */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-zinc-200 bg-zinc-50/50">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMonday(prev => addDays(prev, -7))}
            className="h-8 w-8 rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
            aria-label="Previous week"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <p className="text-sm font-semibold text-zinc-800 tracking-tight">{formatWeekHeader(monday)}</p>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMonday(prev => addDays(prev, 7))}
            className="h-8 w-8 rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
            aria-label="Next week"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Loading bar */}
        {loading && (
          <div className="px-0">
            <Skeleton className="h-0.5 w-full rounded-none" />
          </div>
        )}

        {/* Calendar grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse min-w-[560px]">
            <thead>
              <tr>
                <th className="w-16 border-r border-zinc-100 bg-white">
                  <span className="sr-only">Time</span>
                </th>
                {weekDays.map((day, i) => {
                  const iso     = toISO(day)
                  const isToday = iso === todayISO
                  const blocked = isBlocked(day)
                  return (
                    <th
                      key={iso}
                      className={`border-r border-zinc-100 py-3 text-center transition-colors ${
                        isToday ? 'bg-blue-50' : blocked ? 'bg-zinc-50/60' : 'bg-white'
                      }`}
                    >
                      <p className={`text-[11px] font-semibold uppercase tracking-wide ${
                        isToday ? 'text-blue-500' : blocked ? 'text-zinc-300' : 'text-zinc-400'
                      }`}>
                        {DAY_LABELS[i]}
                      </p>
                      {isToday ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 mt-1 rounded-full bg-blue-500 text-white text-sm font-bold shadow-sm">
                          {day.getDate()}
                        </span>
                      ) : (
                        <p className={`text-lg font-bold mt-0.5 ${blocked ? 'text-zinc-300' : 'text-zinc-800'}`}>
                          {day.getDate()}
                        </p>
                      )}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {HOURS.map(hour => (
                <tr key={hour} className="border-t border-zinc-100">
                  <td className="w-16 px-3 py-2 text-right text-[11px] text-zinc-400 border-r border-zinc-100 align-top whitespace-nowrap font-medium">
                    {hour}
                  </td>
                  {weekDays.map((day, dayIdx) => {
                    const iso     = toISO(day)
                    const blocked = isBlocked(day)
                    const dayJobs = jobMap[iso]?.[hour] ?? []
                    const visible = dayJobs.slice(0, MAX_CHIPS)
                    const overflow = dayJobs.length - MAX_CHIPS

                    return (
                      <td
                        key={iso}
                        className={`border-r border-zinc-100 p-1 align-top h-16 transition-colors duration-100 ${
                          blocked
                            ? 'bg-zinc-50/70 cursor-not-allowed'
                            : 'bg-white hover:bg-amber-50/30 cursor-cell'
                        }`}
                      >
                        {blocked && dayJobs.length === 0 && (
                          <div className="h-full flex items-center justify-center">
                            <span className="text-[9px] text-zinc-200 font-medium tracking-widest uppercase">off</span>
                          </div>
                        )}
                        {visible.map(job => (
                          <Link
                            key={job.job_id}
                            href={`/fitter/jobs/${job.job_id}`}
                            className={`block rounded-md border px-2 py-1 mb-0.5 hover:opacity-80 hover:shadow-sm transition-all duration-100 ${JOB_COLORS[dayIdx % JOB_COLORS.length]}`}
                          >
                            <p className="font-semibold text-[11px] leading-tight truncate">{job.customer_name}</p>
                            <p className="text-[10px] opacity-70 leading-tight truncate">{job.vehicle_model ?? job.tyre_size ?? ''}</p>
                          </Link>
                        ))}
                        {overflow > 0 && (
                          <span className="text-[10px] text-zinc-400 px-1.5 py-0.5 block font-medium hover:text-zinc-600 transition-colors">
                            +{overflow} more
                          </span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer summary */}
        {!loading && (
          <div className="px-6 py-2.5 border-t border-zinc-100 bg-zinc-50/30 flex items-center justify-between text-xs text-zinc-400">
            <span>{jobs.length > 0 ? `${jobs.length} appointment${jobs.length !== 1 ? 's' : ''} this week` : 'No appointments this week'}</span>
            <button
              type="button"
              onClick={() => setMonday(getMondayOf(new Date()))}
              className="text-primary hover:underline font-medium transition-colors"
            >
              Today
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
