'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { AdminBreadcrumb } from '@/components/admin/AdminBreadcrumb'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { toastError } from '@/lib/toast'
import type { AdminWheel, WheelBrand, WheelStyleCategory } from '@/types/admin.types'

const API   = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
const LIMIT = 20

const STYLE_CATEGORY_OPTIONS: { value: WheelStyleCategory; label: string }[] = [
  { value: '4x4',        label: '4x4 / Off-Road' },
  { value: 'street',     label: 'Street'          },
  { value: 'luxury',     label: 'Luxury'          },
  { value: 'commercial', label: 'Commercial'      },
]

const STYLE_COLOURS: Record<string, string> = {
  '4x4':       'bg-orange-50 text-orange-700',
  street:      'bg-blue-50 text-blue-700',
  luxury:      'bg-amber-50 text-amber-700',
  commercial:  'bg-purple-50 text-purple-700',
}

export default function WheelsPage() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const pathname     = usePathname()

  const search  = searchParams.get('search')  ?? ''
  const brandId = searchParams.get('brandId') ?? ''
  const page    = Number(searchParams.get('page') ?? 1)

  const [wheels, setWheels]   = useState<AdminWheel[]>([])
  const [brands, setBrands]   = useState<WheelBrand[]>([])
  const [total, setTotal]     = useState(0)
  const [loading, setLoading] = useState(true)
  const [token, setToken]     = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const totalPages = Math.ceil(total / LIMIT)

  const buildHref = useCallback((extra: Record<string, string>) => {
    const p = new URLSearchParams({ search, brandId, page: String(page) })
    Object.entries(extra).forEach(([k, v]) => v ? p.set(k, v) : p.delete(k))
    return `${pathname}?${p}`
  }, [search, brandId, page, pathname])

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data: { session } } = await createClient().auth.getSession()
      const tok = session?.access_token ?? ''
      setToken(tok)
      try {
        const [wheelsRes, brandsRes] = await Promise.all([
          fetch(`${API}/api/admin/wheels?search=${encodeURIComponent(search)}&brandId=${brandId}&page=${page}&limit=${LIMIT}`, {
            headers: { Authorization: `Bearer ${tok}` },
          }),
          fetch(`${API}/api/admin/wheels/brands`, {
            headers: { Authorization: `Bearer ${tok}` },
          }),
        ])
        if (!wheelsRes.ok) throw new Error(`HTTP ${wheelsRes.status}`)
        const wheelsData = await wheelsRes.json()
        setWheels(wheelsData.data ?? [])
        setTotal(wheelsData.total ?? 0)
        if (brandsRes.ok) setBrands(await brandsRes.json())
      } catch (err) {
        toastError(err instanceof Error ? err.message : 'Failed to load wheels')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [search, brandId, page, refreshKey])

  return (
    <div className="p-4 sm:p-6">
      <AdminBreadcrumb crumbs={[{ label: 'Wheels' }]} />

      <div className="mt-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Wheels</h1>
          <p className="text-sm text-zinc-500 mt-1">{total} model{total !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/wheels/brands">
            <Button variant="outline" size="sm">Manage Brands</Button>
          </Link>
          <Link href="/admin/wheels/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Add Wheel
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Input
          className="w-60"
          placeholder="Search model name…"
          defaultValue={search}
          onKeyDown={e => {
            if (e.key === 'Enter') router.push(buildHref({ search: (e.target as HTMLInputElement).value, page: '1' }))
          }}
        />
        <select
          className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
          value={brandId}
          onChange={e => router.push(buildHref({ brandId: e.target.value, page: '1' }))}
        >
          <option value="">All Brands</option>
          {brands.map(b => (
            <option key={b.wheel_brand_id} value={b.wheel_brand_id}>{b.brand_name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="mt-6 space-y-2">
          {[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-zinc-100 rounded-lg animate-pulse" />)}
        </div>
      ) : wheels.length === 0 ? (
        <div className="mt-12 text-center text-sm text-zinc-400">No wheels found.</div>
      ) : (
        <div className="mt-6 rounded-xl border border-zinc-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Model</th>
                <th className="px-4 py-3 text-left">Brand</th>
                <th className="px-4 py-3 text-left">Style</th>
                <th className="px-4 py-3 text-left">Finish / Colour</th>
                <th className="px-4 py-3 text-right">Variants</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-300">
              {wheels.map(w => (
                <tr key={w.wheel_id} className="odd:bg-white even:bg-zinc-200 [&:hover]:bg-amber-100 transition-colors duration-150 cursor-pointer" onClick={() => router.push(`/admin/wheels/${w.wheel_id}`)}>
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    <div className="flex items-center gap-3">
                      {w.main_image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={w.main_image} alt={w.model_name} className="h-10 w-10 object-contain rounded border border-zinc-100" />
                      )}
                      <div>
                        <div>{w.model_name}</div>
                        <div className="text-xs text-zinc-400">{w.model_slug}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{w.wheel_brands?.brand_name ?? '—'}</td>
                  <td className="px-4 py-3">
                    {w.style_category ? (
                      <Badge className={STYLE_COLOURS[w.style_category] ?? 'bg-zinc-100 text-zinc-600'}>
                        {w.style_category}
                      </Badge>
                    ) : <span className="text-zinc-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">
                    {[w.finish, w.colour].filter(Boolean).join(' / ') || '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-700 font-medium">{w.variant_count}</td>
                  <td className="px-4 py-3">
                    <Badge className={w.is_active ? 'bg-green-50 text-green-700' : 'bg-zinc-100 text-zinc-500'}>
                      {w.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
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

