'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { AdminBreadcrumb } from '@/components/admin/AdminBreadcrumb'
import { toastError } from '@/lib/toast'

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

export default function FitterApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [total, setTotal]               = useState(0)
  const [loading, setLoading]           = useState(true)

  useEffect(() => { document.title = 'Fitter Applications | Tyre Vault' }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const { data: { session } } = await createClient().auth.getSession()
        const tok = session?.access_token ?? ''

        const res = await fetch(`${API}/api/fitter/applications`, {
          headers: { Authorization: `Bearer ${tok}` },
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error ?? `API returned ${res.status}`)
        }
        const json = await res.json()
        if (!cancelled) {
          setApplications(json.data ?? [])
          setTotal(json.total ?? 0)
        }
      } catch (err) {
        if (!cancelled) toastError(err instanceof Error ? err.message : 'Failed to load applications')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <AdminBreadcrumb crumbs={[
          { label: 'Fitment Centre', href: '/admin/fitters' },
          { label: 'Applications' },
        ]} />
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 mt-4">Fitter Applications</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Review and approve fitment centre onboarding requests
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-zinc-100 flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm text-zinc-500">{total} application{total !== 1 ? 's' : ''} total</span>
          <div className="flex gap-2">
            {['pending', 'approved', 'rejected'].map(s => (
              <span key={s} className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[s]}`}>
                {applications.filter(a => a.status === s).length} {s}
              </span>
            ))}
          </div>
        </div>

        {loading && (
          <div className="space-y-2 p-4">
            {[1,2,3].map(i => <div key={i} className="h-12 bg-zinc-100 rounded animate-pulse" />)}
          </div>
        )}

        {!loading && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[520px]">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Submitted</th>
                  <th className="px-6 py-3 w-20 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {applications.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-zinc-400">No applications yet.</td>
                  </tr>
                ) : (
                  applications.map(app => (
                    <tr key={app.id} className="even:bg-zinc-50/40 hover:bg-amber-50/30 transition-colors duration-150">
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
        )}
      </div>
    </div>
  )
}
