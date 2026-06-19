import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { AdminBreadcrumb } from '@/components/admin/AdminBreadcrumb'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Fitter Applications — Admin' }

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

interface Application {
  id: string
  full_name: string
  email: string
  status: 'pending' | 'approved' | 'rejected'
  submitted_at: string
}

const STATUS_STYLES: Record<string, string> = {
  pending:  'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
}

export default async function FitterApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>
}) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { page: pageStr = '1', status = '' } = await searchParams
  const page = Math.max(1, Number(pageStr))

  const headers = { Authorization: `Bearer ${session.access_token}` }

  const qs = new URLSearchParams({ page: String(page) })
  if (status) qs.set('status', status)

  let applications: Application[] = []
  let total = 0
  try {
    const res = await fetch(`${API}/api/fitter/applications?${qs}`, { headers, cache: 'no-store' })
    if (res.ok) {
      const json = await res.json()
      applications = json.data ?? []
      total        = json.total ?? 0
    }
  } catch { /* backend not reachable in dev */ }

  const LIMIT = 20
  const totalPages  = Math.max(1, Math.ceil(total / LIMIT))

  function buildHref(overrides: Record<string, string>) {
    const p = new URLSearchParams()
    if (status) p.set('status', status)
    p.set('page', String(page))
    Object.entries(overrides).forEach(([k, v]) => { if (v) p.set(k, v); else p.delete(k) })
    return `/admin/fitters/applications?${p}`
  }

  const counts = { pending: 0, approved: 0, rejected: 0 }
  for (const a of applications) if (a.status in counts) counts[a.status as keyof typeof counts]++

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <AdminBreadcrumb crumbs={[
          { label: 'Fitment Centre', href: '/admin/fitters' },
          { label: 'Applications' },
        ]} />
        <div className="flex items-start justify-between gap-4 mt-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">Fitter Applications</h1>
            <p className="text-sm text-zinc-500 mt-1">Review and approve fitment centre onboarding requests</p>
          </div>
          <Link
            href="/admin/fitters/create"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Create Centre
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-zinc-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-500">{total} application{total !== 1 ? 's' : ''} total</span>
            {/* Status filter links */}
            <div className="flex gap-1">
              {(['', 'pending', 'approved', 'rejected'] as const).map(s => (
                <Link
                  key={s || 'all'}
                  href={buildHref({ status: s, page: '1' })}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                    status === s
                      ? 'bg-zinc-900 text-white'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  {s || 'All'}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            {(['pending', 'approved', 'rejected'] as const).map(s => (
              <span key={s} className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[s]}`}>
                {counts[s]} {s}
              </span>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-130">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50">
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Email</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Submitted</th>
                <th className="px-6 py-3 w-20 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {applications.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-400">No applications yet.</td>
                </tr>
              ) : (
                applications.map(app => (
                  <tr key={app.id} className="odd:bg-white even:bg-zinc-50 hover:!bg-zinc-200 transition-colors">
                    <td className="px-6 py-4 font-medium text-zinc-900">{app.full_name}</td>
                    <td className="px-6 py-4 text-zinc-600">{app.email}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[app.status] ?? 'bg-zinc-100 text-zinc-700'}`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-500">
                      {new Date(app.submitted_at).toLocaleDateString('en-AU', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/admin/fitters/applications/${app.id}`} className="text-xs font-medium text-primary hover:text-primary/80">
                        Review →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-100 text-xs text-zinc-500">
            <span>{total} total</span>
            <div className="flex items-center gap-3">
              <span>Page {page} of {totalPages}</span>
              <div className="flex gap-1">
                {page > 1 ? (
                  <Link href={buildHref({ page: String(page - 1) })} className="rounded-lg border border-zinc-300 px-3 py-1.5 hover:bg-white transition-colors font-medium">Prev</Link>
                ) : (
                  <span className="cursor-not-allowed rounded-lg border border-zinc-200 px-3 py-1.5 text-zinc-300">Prev</span>
                )}
                {page < totalPages ? (
                  <Link href={buildHref({ page: String(page + 1) })} className="rounded-lg border border-zinc-300 px-3 py-1.5 hover:bg-white transition-colors font-medium">Next</Link>
                ) : (
                  <span className="cursor-not-allowed rounded-lg border border-zinc-200 px-3 py-1.5 text-zinc-300">Next</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
