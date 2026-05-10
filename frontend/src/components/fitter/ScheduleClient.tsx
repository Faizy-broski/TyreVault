'use client'

import { useState, useEffect } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

interface ScheduleJob {
  job_id:         string
  customer_name:  string
  vehicle_model:  string | null
  scheduled_date: string
  scheduled_time: string
  status:         string
  tyre_size:      string | null
  quantity:       number
}

// ── Calendar config ────────────────────────────────────────────────────────

const HOURS = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00']
const DAY_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

// Colors cycle for jobs
const JOB_COLORS = [
  'bg-blue-100 text-blue-800 border-blue-200',
  'bg-green-100 text-green-800 border-green-200',
  'bg-purple-100 text-purple-800 border-purple-200',
  'bg-amber-100 text-amber-800 border-amber-200',
]

// ── Date helpers ──────────────────────────────────────────────────────────────

function getMondayOf(d: Date): Date {
  const day  = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.getFullYear(), d.getMonth(), diff)
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

function toISO(d: Date): string {
  return d.toISOString().split('T')[0]
}

function formatWeekHeader(monday: Date): string {
  const sunday = addDays(monday, 6)
  const opts: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric' }
  return `${monday.toLocaleDateString('en-AU', opts)} – ${sunday.toLocaleDateString('en-AU', opts)}`
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ScheduleClient({ accessToken }: { accessToken: string }) {
  const [monday, setMonday] = useState<Date>(() => getMondayOf(new Date()))
  const [jobs, setJobs]     = useState<ScheduleJob[]>([])
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

  // Map jobs into {date: {hourStr: job[]}}
  const jobMap: Record<string, Record<string, ScheduleJob[]>> = {}
  jobs.forEach((job, idx) => {
    const d = job.scheduled_date
    const h = job.scheduled_time ? job.scheduled_time.slice(0, 5) : '09:00'
    const hourKey = HOURS.find(hr => hr <= h) ?? '09:00'
    if (!jobMap[d]) jobMap[d] = {}
    if (!jobMap[d][hourKey]) jobMap[d][hourKey] = []
    jobMap[d][hourKey].push(job)
  })

  // Is a day "blocked" (weekend by default if fitter has closed those days)
  const isBlocked = (d: Date) => d.getDay() === 0 || d.getDay() === 6

  function getColorClass(job: ScheduleJob, dayIdx: number) {
    return JOB_COLORS[dayIdx % JOB_COLORS.length]
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-900">Schedule</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Manage your weekly job schedule</p>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        {/* Week navigation */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
          <button
            onClick={() => setMonday(prev => addDays(prev, -7))}
            className="p-1.5 rounded-lg border border-zinc-300 hover:bg-zinc-50 text-zinc-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <p className="text-sm font-semibold text-zinc-800">{formatWeekHeader(monday)}</p>
          <button
            onClick={() => setMonday(prev => addDays(prev, 7))}
            className="p-1.5 rounded-lg border border-zinc-300 hover:bg-zinc-50 text-zinc-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>

        {/* Calendar grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                {/* Time column header */}
                <th className="w-16 border-r border-zinc-100 bg-zinc-50" />
                {weekDays.map((day, i) => {
                  const iso     = toISO(day)
                  const isToday = iso === todayISO
                  return (
                    <th
                      key={iso}
                      className={`border-r border-zinc-100 py-3 text-center font-medium ${
                        isToday ? 'bg-yellow-50 text-yellow-700' : 'bg-zinc-50 text-zinc-600'
                      }`}
                    >
                      <p className="text-xs font-semibold">{DAY_LABELS[i]}</p>
                      <p className={`text-lg font-bold mt-0.5 ${isToday ? 'text-yellow-600' : 'text-zinc-800'}`}>
                        {day.getDate()}
                      </p>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {HOURS.map(hour => (
                <tr key={hour} className="border-t border-zinc-100">
                  <td className="w-16 px-2 py-2 text-right text-xs text-zinc-400 border-r border-zinc-100 align-top">
                    {hour}
                  </td>
                  {weekDays.map((day, dayIdx) => {
                    const iso      = toISO(day)
                    const blocked  = isBlocked(day)
                    const dayJobs  = jobMap[iso]?.[hour] ?? []

                    return (
                      <td
                        key={iso}
                        className={`border-r border-zinc-100 p-1 align-top min-h-[52px] ${
                          blocked ? 'bg-zinc-100' : 'bg-white'
                        }`}
                      >
                        {blocked && dayJobs.length === 0 && (
                          <div className="h-10 flex items-center justify-center">
                            <span className="text-zinc-400 text-[10px]">Blocked</span>
                          </div>
                        )}
                        {dayJobs.map(job => (
                          <div
                            key={job.job_id}
                            className={`rounded-md border px-2 py-1.5 mb-1 ${getColorClass(job, dayIdx)}`}
                          >
                            <p className="font-semibold text-[11px] leading-tight">{job.customer_name}</p>
                            <p className="text-[10px] opacity-75 leading-tight">{job.vehicle_model ?? job.tyre_size ?? ''}</p>
                          </div>
                        ))}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {loading && (
          <div className="py-4 text-center text-xs text-zinc-400">Loading schedule...</div>
        )}
      </div>
    </div>
  )
}
