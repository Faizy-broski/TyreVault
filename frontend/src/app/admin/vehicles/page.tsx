'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { AdminBreadcrumb } from '@/components/admin/AdminBreadcrumb'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { toastError } from '@/lib/toast'
import type { AdminVehicle } from '@/types/admin.types'

const API   = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
const LIMIT = 50


export default function VehiclesPage() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const pathname     = usePathname()

  const search = searchParams.get('search') ?? ''
  const make   = searchParams.get('make')   ?? ''
  const page   = Number(searchParams.get('page') ?? 1)

  const [vehicles, setVehicles] = useState<AdminVehicle[]>([])
  const [makes, setMakes]       = useState<string[]>([])
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(true)
  const [token, setToken]       = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const totalPages = Math.ceil(total / LIMIT)

  const buildHref = useCallback((extra: Record<string, string>) => {
    const p = new URLSearchParams({ search, make, page: String(page) })
    Object.entries(extra).forEach(([k, v]) => v ? p.set(k, v) : p.delete(k))
    return `${pathname}?${p}`
  }, [search, make, page, pathname])

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data: { session } } = await createClient().auth.getSession()
      const tok = session?.access_token ?? ''
      setToken(tok)
      try {
        const [vehiclesRes, makesRes] = await Promise.all([
          fetch(`${API}/api/admin/vehicles?search=${encodeURIComponent(search)}&make=${encodeURIComponent(make)}&page=${page}&limit=${LIMIT}`, {
            headers: { Authorization: `Bearer ${tok}` },
          }),
          fetch(`${API}/api/admin/vehicles/makes`, {
            headers: { Authorization: `Bearer ${tok}` },
          }),
        ])
        if (!vehiclesRes.ok) throw new Error(`HTTP ${vehiclesRes.status}`)
        const vData = await vehiclesRes.json()
        setVehicles(vData.data ?? [])
        setTotal(vData.total ?? 0)
        if (makesRes.ok) setMakes(await makesRes.json())
      } catch (err) {
        toastError(err instanceof Error ? err.message : 'Failed to load vehicles')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [search, make, page, refreshKey])

  return (
    <div className="p-4 sm:p-6">
      <AdminBreadcrumb crumbs={[{ label: 'Vehicles' }]} />

      <div className="mt-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Vehicle Database</h1>
          <p className="text-sm text-zinc-500 mt-1">{total} vehicle{total !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/admin/vehicles/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> Add Vehicle
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Input
          className="w-60"
          placeholder="Search make, model, variant…"
          defaultValue={search}
          onKeyDown={e => {
            if (e.key === 'Enter') router.push(buildHref({ search: (e.target as HTMLInputElement).value, page: '1' }))
          }}
        />
        <select
          className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
          value={make}
          onChange={e => router.push(buildHref({ make: e.target.value, page: '1' }))}
        >
          <option value="">All Makes</option>
          {makes.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="mt-6 space-y-2">
          {[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-zinc-100 rounded-lg animate-pulse" />)}
        </div>
      ) : vehicles.length === 0 ? (
        <div className="mt-12 text-center text-sm text-zinc-400">No vehicles found.</div>
      ) : (
        <div className="mt-6 rounded-xl border border-zinc-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Make</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Model</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Series / Variant</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Years</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Body Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {vehicles.map(v => (
                <tr
                  key={v.vehicle_id}
                  className="odd:bg-white even:bg-zinc-50 hover:!bg-zinc-200 transition-colors cursor-pointer"
                  onClick={() => router.push(`/admin/vehicles/${v.vehicle_id}`)}
                >
                  <td className="px-4 py-3 font-medium text-zinc-900">{v.make}</td>
                  <td className="px-4 py-3 text-zinc-800">{v.model}</td>
                  <td className="px-4 py-3 text-zinc-500">
                    {[v.series, v.variant].filter(Boolean).join(' — ') || '—'}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {v.year_from}{v.year_to ? `–${v.year_to}` : '+'}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{v.body_type ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-zinc-600">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => router.push(buildHref({ page: String(page - 1) }))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => router.push(buildHref({ page: String(page + 1) }))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

    </div>
  )
}

