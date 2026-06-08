'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, ClipboardList } from 'lucide-react'
import { Button }   from '@/components/ui/button'
import { Input }    from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import type { FitmentJob, JobStatus } from '@/types/fitter.types'
import { StatusBadge }      from '@/components/fitter/StatusBadge'
import { FitterBreadcrumb } from '@/components/fitter/FitterBreadcrumb'
import { fmtShortDate, fmtTime } from '@/lib/fitter-format'
import { useFitterJobs } from '@/lib/query/fitter-hooks'

const STATUS_FILTERS: { key: string; label: string }[] = [
  { key: '',            label: 'All'         },
  { key: 'pending',     label: 'New'         },
  { key: 'assigned',    label: 'Assigned'    },
  { key: 'accepted',    label: 'Accepted'    },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed',   label: 'Completed'   },
  { key: 'cancelled',   label: 'Cancelled'   },
  { key: 'rejected',    label: 'Rejected'    },
]

function TableSkeleton() {
  return Array.from({ length: 6 }).map((_, i) => (
    <TableRow key={i}>
      <TableCell><Skeleton className="h-3.5 w-20" /></TableCell>
      <TableCell>
        <Skeleton className="h-4 w-28 mb-1.5" />
        <Skeleton className="h-3 w-20" />
      </TableCell>
      <TableCell><Skeleton className="h-3.5 w-24" /></TableCell>
      <TableCell><Skeleton className="h-3.5 w-20" /></TableCell>
      <TableCell><Skeleton className="h-3.5 w-24" /></TableCell>
      <TableCell><Skeleton className="h-3.5 w-16" /></TableCell>
      <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
    </TableRow>
  ))
}

function EmptyState({ search, hasFilter }: { search: string; hasFilter: boolean }) {
  const filtered = search || hasFilter
  return (
    <TableRow className="hover:bg-transparent border-0">
      <TableCell colSpan={7} className="py-16 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 border border-zinc-200 flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-zinc-300" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-500">
              {filtered ? 'No matching jobs' : 'No jobs yet'}
            </p>
            <p className="text-xs text-zinc-400 mt-0.5">
              {filtered ? 'Try adjusting your search or filters' : 'Jobs will appear here once assigned'}
            </p>
          </div>
        </div>
      </TableCell>
    </TableRow>
  )
}

export default function JobsClient() {
  const [statusFilter, setStatusFilter] = useState('')
  const [search,       setSearch]       = useState('')

  const { data: jobs = [], isPending: loading } = useFitterJobs()

  const filtered = jobs.filter(j => {
    const matchStatus = !statusFilter || j.job_status === statusFilter
    const matchSearch = !search ||
      j.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      j.task_number.toLowerCase().includes(search.toLowerCase()) ||
      (j.vehicle_model ?? '').toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  return (
    <div className="p-4 sm:p-6">
      <FitterBreadcrumb crumbs={[{ label: 'Jobs' }]} />

      <div className="mb-6 mt-5">
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">Jobs</h1>
        <p className="text-sm text-zinc-500 mt-0.5">All your tyre fitting jobs</p>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 px-5 py-4 border-b border-zinc-200 bg-zinc-50/50">
          <div className="flex flex-wrap items-center gap-1">
            {STATUS_FILTERS.map(f => (
              <Button
                key={f.key}
                size="sm"
                variant={statusFilter === f.key ? 'default' : 'ghost'}
                onClick={() => setStatusFilter(f.key)}
                className={`rounded-lg h-8 text-xs font-medium transition-all duration-150 ${
                  statusFilter === f.key
                    ? 'bg-primary text-zinc-900 hover:bg-primary/90 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800 hover:!bg-zinc-100'
                }`}
              >
                {f.label}
              </Button>
            ))}
          </div>

          <div className="relative w-full sm:w-56 sm:ml-auto">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search customer, task, vehicle…"
              className="pl-8 h-8 text-xs border-zinc-200 focus-visible:ring-primary/30 focus-visible:border-primary w-full rounded-lg bg-white transition-shadow duration-150 focus-visible:shadow-sm"
            />
          </div>
        </div>

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow className="border-b border-zinc-200 bg-zinc-50 hover:bg-zinc-50 odd:bg-zinc-50 even:bg-zinc-50">
              <TableHead>Task #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Tyre</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeleton />
            ) : filtered.length === 0 ? (
              <EmptyState search={search} hasFilter={!!statusFilter} />
            ) : (
              filtered.map((job) => (
                <TableRow key={job.job_id}>
                  <TableCell>
                    <Link
                      href={`/fitter/jobs/${job.job_id}`}
                      className="text-xs font-mono font-semibold text-primary hover:underline hover:text-primary/80 transition-colors"
                    >
                      {job.task_number}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <p className="font-semibold text-foreground text-sm leading-tight">{job.customer_name}</p>
                    {job.customer_phone && (
                      <p className="text-xs text-muted-foreground mt-0.5">{job.customer_phone}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {job.vehicle_model ?? <span className="text-muted-foreground/30">—</span>}
                  </TableCell>
                  <TableCell>
                    {job.tyre_size ? (
                      <span className="text-sm text-foreground">
                        {job.tyre_size}
                        <span className="text-muted-foreground text-xs ml-1">× {job.quantity}</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground/30">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {fmtShortDate(job.scheduled_date)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {fmtTime(job.scheduled_time)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={job.job_status as JobStatus} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-zinc-200 bg-zinc-50/30 text-xs text-muted-foreground flex items-center justify-between">
            <span>Showing {filtered.length} of {jobs.length} jobs</span>
            {statusFilter && (
              <button
                type="button"
                onClick={() => { setStatusFilter(''); setSearch('') }}
                className="text-primary hover:underline font-medium transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

