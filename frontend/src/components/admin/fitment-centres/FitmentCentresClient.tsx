'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { AdminFitmentCentreSummary } from '@/types/admin.types'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
const PAGE_LIMIT = 20

interface Props {
  initialCentres: AdminFitmentCentreSummary[]
  initialTotal:   number
  accessToken:    string
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
      active ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-green-500' : 'bg-amber-500'}`} />
      {active ? 'Active' : 'Hold'}
    </span>
  )
}

export default function FitmentCentresClient({ initialCentres, initialTotal, accessToken }: Props) {
  const [centres, setCentres] = useState<AdminFitmentCentreSummary[]>(initialCentres)
  const [total, setTotal]     = useState(initialTotal)
  const [search, setSearch]   = useState('')
  const [status, setStatus]   = useState('')
  const [page, setPage]       = useState(1)
  const [loading, setLoading] = useState(false)

  const totalPages = Math.ceil(total / PAGE_LIMIT)
  const headers    = { Authorization: `Bearer ${accessToken}` }

  async function fetchCentres(opts: { search?: string; status?: string; page?: number }) {
    setLoading(true)
    const qs = new URLSearchParams()
    if (opts.search) qs.set('search', opts.search)
    if (opts.status) qs.set('status', opts.status)
    qs.set('page', String(opts.page ?? 1))
    try {
      const res = await fetch(`${API}/api/admin/fitment-centres?${qs}`, { headers })
      if (res.ok) {
        const json = await res.json()
        setCentres(json.data  ?? [])
        setTotal(json.total   ?? 0)
      }
    } finally { setLoading(false) }
  }

  function applyStatus(s: string) {
    const next = s === status ? '' : s
    setStatus(next); setPage(1)
    fetchCentres({ search, status: next, page: 1 })
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    fetchCentres({ search, status, page: 1 })
  }

  function goPage(p: number) {
    setPage(p)
    fetchCentres({ search, status, page: p })
  }

  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Fitment Centres</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Manage all registered fitment centres</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        {/* Filters */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-zinc-100">
          {(['active', 'hold'] as const).map(s => (
            <button
              key={s}
              onClick={() => applyStatus(s)}
              className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition-colors ${
                status === s
                  ? 'border-zinc-900 bg-zinc-900 text-white'
                  : 'border-zinc-300 text-zinc-600 hover:border-zinc-500'
              }`}
            >
              <span className="text-zinc-400">+</span>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
          <div className="flex-1" />
          <form onSubmit={handleSearch} className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search centres..."
              className="pl-8 pr-3 py-1.5 text-xs border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400/30 focus:border-yellow-400 w-48"
            />
          </form>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50">
              <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Centre</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Partner ID</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Contact</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">ABN</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Status</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Joined</th>
              <th className="px-5 py-3 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {loading ? (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-sm text-zinc-400">Loading...</td></tr>
            ) : centres.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-sm text-zinc-400">No fitment centres found.</td></tr>
            ) : (
              centres.map(c => (
                <tr key={c.fitment_centre_id} className="hover:bg-zinc-50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-zinc-900">{c.centre_name}</p>
                    <p className="text-xs text-zinc-400">{c.profiles?.email ?? '—'}</p>
                  </td>
                  <td className="px-5 py-3 text-xs font-mono text-zinc-600">{c.partner_id}</td>
                  <td className="px-5 py-3 text-xs text-zinc-600">{c.contact_phone ?? '—'}</td>
                  <td className="px-5 py-3 text-xs text-zinc-600">{c.business_number ?? '—'}</td>
                  <td className="px-5 py-3"><StatusBadge active={c.is_active} /></td>
                  <td className="px-5 py-3 text-xs text-zinc-500">{fmtDate(c.created_at)}</td>
                  <td className="px-5 py-3">
                    <Link
                      href={`/admin/fitters/${c.fitment_centre_id}`}
                      className="text-xs font-medium text-yellow-600 hover:text-yellow-700"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-100 text-xs text-zinc-500">
          <span>Showing {centres.length} of {total}</span>
          <div className="flex items-center gap-3">
            <span>{page} of {totalPages || 1} pages</span>
            <div className="flex gap-1">
              <button
                onClick={() => page > 1 && goPage(page - 1)}
                disabled={page <= 1}
                className="px-2 py-1 rounded border border-zinc-300 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
              >Prev</button>
              <button
                onClick={() => page < totalPages && goPage(page + 1)}
                disabled={page >= totalPages}
                className="px-2 py-1 rounded border border-zinc-300 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
              >Next</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
