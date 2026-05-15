'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { dummyjobs } from '@/dummydata/fitter/ScheduleFitterData'

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

// ── Calendar config ────────────────────────────────────────────────────────────

const HOURS      = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00']
const DAY_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

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
  return d.toISOString().split('T')[0]
}

function formatWeekHeader(monday: Date): string {
  const sunday    = addDays(monday, 6)
  const monthName = monday.toLocaleDateString('en-AU', { month: 'long' })
  const year      = monday.getFullYear()
  const startDay  = monday.getDate()
  const endDay    = sunday.getDate()

  if (monday.getMonth() === sunday.getMonth()) {
    return `${monthName} ${startDay} - ${endDay}, ${year}`
  }
  const endMonth  = sunday.toLocaleDateString('en-AU', { month: 'short' })
  const startMon  = monday.toLocaleDateString('en-AU', { month: 'short' })
  return `${startMon} ${startDay} - ${endMonth} ${endDay}, ${year}`
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ScheduleClient({ accessToken }: { accessToken: string }) {
  const [monday,  setMonday]  = useState<Date>(() => getMondayOf(new Date()))
  // const [jobs, setJobs]    = useState<ScheduleJob[]>([])
  const [jobs, setJobs]       = useState<ScheduleJob[]>(dummyjobs)
  const [loading, setLoading] = useState(false)

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
  const todayISO = toISO(new Date())

  // ── Data fetch (API logic unchanged) ────────────────────────────────────────
  // useEffect(() => {
  //   const weekStart = toISO(monday)
  //   const weekEnd   = toISO(addDays(monday, 6))
  //   setLoading(true)
  //   fetch(`${API}/api/fitter/portal/schedule?weekStart=${weekStart}&weekEnd=${weekEnd}`, {
  //     headers: { Authorization: `Bearer ${accessToken}` },
  //   })
  //     .then(r => r.ok ? r.json() : [])
  //     .then(data => setJobs(Array.isArray(data) ? data : []))
  //     .catch(() => {})
  //     .finally(() => setLoading(false))
  // }, [monday, accessToken])

  // Build: { [isoDate]: { [hourKey]: ScheduleJob[] } }
  const jobMap: Record<string, Record<string, ScheduleJob[]>> = {}
  jobs.forEach(job => {
    const d        = job.scheduled_date
    const h        = job.scheduled_time ? job.scheduled_time.slice(0, 5) : '09:00'
    const hourKey  = [...HOURS].reverse().find(hr => hr <= h) ?? HOURS[0]
    if (!jobMap[d])          jobMap[d]          = {}
    if (!jobMap[d][hourKey]) jobMap[d][hourKey] = []
    jobMap[d][hourKey].push(job)
  })

  const isBlocked = (d: Date) => d.getDay() === 0 || d.getDay() === 6

  return (
    <div className="p-4 sm:p-6">
      {/* Page heading */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">Schedule</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Manage your weekly job schedule</p>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
        {/* Week navigation bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-200">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMonday(prev => addDays(prev, -7))}
            className="h-7 w-7 rounded-lg text-zinc-500 hover:bg-zinc-100"
            aria-label="Previous week"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <p className="text-sm font-semibold text-zinc-800">{formatWeekHeader(monday)}</p>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMonday(prev => addDays(prev, 7))}
            className="h-7 w-7 rounded-lg text-zinc-500 hover:bg-zinc-100"
            aria-label="Next week"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Calendar grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="w-16 border-r border-zinc-100 bg-white" />
                {weekDays.map((day, i) => {
                  const iso     = toISO(day)
                  const isToday = iso === todayISO
                  return (
                    <th
                      key={iso}
                      className={`border-r border-zinc-100 py-3 text-center ${isToday ? 'bg-blue-50' : 'bg-white'}`}
                    >
                      <p className={`text-xs font-medium ${isToday ? 'text-blue-500' : 'text-zinc-400'}`}>
                        {DAY_LABELS[i]}
                      </p>
                      {isToday ? (
                        <span className="inline-flex items-center justify-center w-8 h-8 mt-0.5 rounded-full bg-blue-500 text-white text-base font-bold">
                          {day.getDate()}
                        </span>
                      ) : (
                        <p className="text-lg font-bold text-zinc-800 mt-0.5">{day.getDate()}</p>
                      )}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {HOURS.map(hour => (
                <tr key={hour} className="border-t border-zinc-100">
                  <td className="w-16 px-3 py-2 text-right text-[11px] text-zinc-400 border-r border-zinc-100 align-top whitespace-nowrap">
                    {hour}
                  </td>
                  {weekDays.map((day, dayIdx) => {
                    const iso     = toISO(day)
                    const blocked = isBlocked(day)
                    const dayJobs = jobMap[iso]?.[hour] ?? []
                    return (
                      <td
                        key={iso}
                        className={`border-r border-zinc-100 p-1 align-top h-14 ${blocked ? 'bg-zinc-50' : 'bg-white'}`}
                      >
                        {blocked && dayJobs.length === 0 && (
                          <div className="h-full flex items-center justify-center">
                            <span className="text-[10px] text-zinc-300">Blocked</span>
                          </div>
                        )}
                        {dayJobs.map(job => (
                          <div
                            key={job.job_id}
                            className={`rounded-md border px-2 py-1.5 mb-1 cursor-pointer hover:opacity-90 transition-opacity ${JOB_COLORS[dayIdx % JOB_COLORS.length]}`}
                          >
                            <p className="font-semibold text-[11px] leading-tight truncate">{job.customer_name}</p>
                            <p className="text-[10px] opacity-70 leading-tight truncate">{job.vehicle_model ?? job.tyre_size ?? ''}</p>
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
          <div className="py-3 text-center text-xs text-zinc-400 border-t border-zinc-100">
            Loading schedule…
          </div>
        )}
      </div>
    </div>
  )
}
