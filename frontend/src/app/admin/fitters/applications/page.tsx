import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const metadata = { title: 'Fitter Applications — Onyx Admin' }

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

export default async function FitterApplicationsPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token ?? ''

  let applications: Application[] = []
  let total = 0
  let fetchError = false

  try {
    const res = await fetch(`${API}/api/fitter/applications`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (res.ok) {
      const json = await res.json()
      applications = json.data  ?? []
      total        = json.total ?? 0
    } else {
      fetchError = true
    }
  } catch {
    fetchError = true
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Fitter Applications</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Review and approve fitment centre onboarding requests
        </p>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        {/* Header counts */}
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
          <span className="text-sm text-zinc-500">{total} application{total !== 1 ? 's' : ''} total</span>
          <div className="flex gap-2">
            {['pending', 'approved', 'rejected'].map(s => (
              <span key={s} className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[s]}`}>
                {applications.filter(a => a.status === s).length} {s}
              </span>
            ))}
          </div>
        </div>

        {fetchError && (
          <div className="px-6 py-4 text-sm text-red-600 bg-red-50">
            Could not connect to backend. Make sure the backend server is running on port 3001.
          </div>
        )}

        {/* Table */}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100">
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">Submitted</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {applications.length === 0 && !fetchError ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-zinc-400">
                  No applications yet.
                </td>
              </tr>
            ) : (
              applications.map(app => (
                <tr key={app.id} className="hover:bg-zinc-50 transition-colors">
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
                    <Link
                      href={`/admin/fitters/applications/${app.id}`}
                      className="text-xs font-medium text-blue-600 hover:text-blue-800"
                    >
                      Review →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
