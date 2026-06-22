'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useQueryClient } from '@tanstack/react-query'
import { AdminBreadcrumb } from '@/components/admin/AdminBreadcrumb'
import { Badge } from '@/components/ui/badge'
import { toastError, toastSuccess } from '@/lib/toast'
import { MoreHorizontal, Pencil, Trash2, Upload } from 'lucide-react'
import { useAdminBrandsAll, useAdminPatterns, type AdminPattern } from '@/lib/query/hooks'
import { adminKeys } from '@/lib/query/keys'
import { TableBodySpinner } from '@/components/ui/table-loader'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

type PatternWithBrand = AdminPattern & { brand_name: string }

const APP_COLOURS: Record<string, string> = {
  passenger:   'bg-blue-50 text-blue-700',
  suv:         'bg-indigo-50 text-indigo-700',
  truck:       'bg-orange-50 text-orange-700',
  commercial:  'bg-purple-50 text-purple-700',
  trailer:     'bg-zinc-100 text-zinc-600',
  motorcycle:  'bg-pink-50 text-pink-700',
  atv:         'bg-amber-50 text-amber-700',
}

async function getToken() {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.access_token ?? ''
}

function RowActions({ pattern, onDelete }: { pattern: PatternWithBrand; onDelete: (p: PatternWithBrand) => void }) {
  const router      = useRouter()
  const [open, setOpen] = useState(false)
  const ref         = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative flex justify-end">
      <button
        type="button"
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        className="rounded-lg p-1.5 text-zinc-400 hover:!bg-zinc-100 hover:text-zinc-700 transition-colors"
        aria-label="Actions"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 w-36 rounded-xl border border-zinc-200 bg-white shadow-lg py-1 overflow-hidden">
          <button
            type="button"
            onClick={e => { e.stopPropagation(); setOpen(false); router.push(`/admin/products/brands/${pattern.brand_id}/patterns/${pattern.pattern_id}/edit`) }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5 text-zinc-400" />
            Edit
          </button>
          <button
            type="button"
            onClick={e => { e.stopPropagation(); setOpen(false); onDelete(pattern) }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>
      )}
    </div>
  )
}

function DeleteDialog({ pattern, onClose, onConfirm, deleting, skuError }: {
  pattern: PatternWithBrand; onClose: () => void; onConfirm: () => void
  deleting: boolean; skuError: boolean
}) {
  const router = useRouter()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl border border-zinc-200 p-6 w-full max-w-sm">
        {skuError ? (
          <>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-50 mx-auto mb-4">
              <Trash2 className="w-5 h-5 text-amber-500" />
            </div>
            <h2 className="text-base font-semibold text-zinc-900 text-center">Cannot Delete</h2>
            <p className="text-sm text-zinc-500 text-center mt-1 mb-2">
              <span className="font-medium text-zinc-700">{pattern.pattern_name}</span> has SKUs linked to it.
              Remove all associated SKUs before deleting.
            </p>
            <div className="flex gap-3 mt-5">
              <button type="button" onClick={onClose}
                className="flex-1 rounded-xl border border-zinc-200 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors">
                Cancel
              </button>
              <button type="button" onClick={() => { onClose(); router.push(`/admin/products/brands/${pattern.brand_id}/patterns/${pattern.pattern_id}/edit`) }}
                className="flex-1 rounded-xl bg-primary py-2 text-sm font-medium text-zinc-900 hover:bg-primary/90 transition-colors">
                Edit Pattern
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-50 mx-auto mb-4">
              <Trash2 className="w-5 h-5 text-red-500" />
            </div>
            <h2 className="text-base font-semibold text-zinc-900 text-center">Delete Pattern</h2>
            <p className="text-sm text-zinc-500 text-center mt-1 mb-5">
              Are you sure you want to delete <span className="font-medium text-zinc-700">{pattern.pattern_name}</span>? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={onClose} disabled={deleting}
                className="flex-1 rounded-xl border border-zinc-200 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors">
                Cancel
              </button>
              <button type="button" onClick={onConfirm} disabled={deleting}
                className="flex-1 rounded-xl bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60 transition-colors">
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function PatternsPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const queryClient  = useQueryClient()

  const [page,        setPage]        = useState(1)
  const [filterBrand, setFilterBrand] = useState(searchParams.get('brand') ?? '')
  const [filterApp,   setFilterApp]   = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search,      setSearch]      = useState('')
  const [toDelete,    setToDelete]    = useState<PatternWithBrand | null>(null)
  const [deleting,    setDeleting]    = useState(false)
  const [skuError,    setSkuError]    = useState(false)

  const { data: result,  isPending: patternsLoading } = useAdminPatterns({ page, search, brandId: filterBrand || undefined, appType: filterApp || undefined })
  const { data: brands = [], isPending: brandsLoading } = useAdminBrandsAll()

  const loading    = patternsLoading || brandsLoading
  const rawPatterns = result?.data       ?? []
  const total       = result?.total      ?? 0
  const totalPages  = result?.totalPages ?? 1

  const brandMap = useMemo(
    () => Object.fromEntries(brands.map(b => [b.brand_id, b.brand_name])),
    [brands],
  )
  const patterns: PatternWithBrand[] = useMemo(
    () => rawPatterns.map(p => ({ ...p, brand_name: brandMap[p.brand_id] ?? '' })),
    [rawPatterns, brandMap],
  )

  async function handleDelete() {
    if (!toDelete) return
    setDeleting(true)
    try {
      const tok = await getToken()
      const res = await fetch(
        `${API}/api/admin/products/brands/${toDelete.brand_id}/patterns/${toDelete.pattern_id}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${tok}` } },
      )
      if (!res.ok) {
        const b = await res.json().catch(() => ({})) as { error?: string }
        const raw = b.error ?? ''
        if (raw.includes('skus_pattern_id_fkey') || raw.includes('skus')) {
          setSkuError(true)
          return
        }
        throw new Error(raw || 'Failed to delete pattern')
      }
      queryClient.invalidateQueries({ queryKey: adminKeys.patternList() })
      queryClient.invalidateQueries({ queryKey: adminKeys.brandListAll() })
      toastSuccess(`"${toDelete.pattern_name}" deleted`)
      setToDelete(null)
      setSkuError(false)
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to delete pattern')
      setToDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  // Patterns come pre-filtered from server; appTypes derived from current page for the dropdown
  const displayed = patterns
  const appTypes  = useMemo(() => ['PCR', '4x4', 'TBR'], [])
  const sel = 'rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-primary/30'

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <AdminBreadcrumb crumbs={[
        { label: 'Products', href: '/admin/products' },
        { label: 'Patterns' },
      ]} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Patterns</h1>
          <p className="text-sm text-zinc-500 mt-0.5">All tyre patterns across every brand</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/products/import?type=patterns"
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-200 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Bulk Import
          </Link>
          <Link
            href="/admin/products/patterns/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-primary/90 transition-colors"
          >
            + New Pattern
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <form onSubmit={e => { e.preventDefault(); setSearch(searchInput); setPage(1) }} className="flex gap-2">
          <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)}
            placeholder="Search patterns…" className={sel + ' w-48'} />
          <button type="submit" className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors">Search</button>
        </form>
        <select value={filterBrand} onChange={e => { setFilterBrand(e.target.value); setPage(1) }} className={sel}>
          <option value="">All Brands</option>
          {brands.map(b => <option key={b.brand_id} value={b.brand_id}>{b.brand_name}</option>)}
        </select>
        <select value={filterApp} onChange={e => { setFilterApp(e.target.value); setPage(1) }} className={sel}>
          <option value="">All Applications</option>
          {appTypes.map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        {(filterBrand || filterApp || search) && (
          <button type="button" onClick={() => { setFilterBrand(''); setFilterApp(''); setSearch(''); setSearchInput(''); setPage(1) }}
            className="text-xs text-zinc-400 hover:text-zinc-700 px-2">
            Clear
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-primary/10">
              <th className="px-5 py-3 text-left text-xs font-bold text-zinc-800 uppercase tracking-wide">Pattern</th>
              <th className="px-5 py-3 text-left text-xs font-bold text-zinc-800 uppercase tracking-wide">Brand</th>
              <th className="px-5 py-3 text-left text-xs font-bold text-zinc-800 uppercase tracking-wide">Application</th>
              <th className="px-5 py-3 text-left text-xs font-bold text-zinc-800 uppercase tracking-wide">Season</th>
              <th className="px-5 py-3 text-left text-xs font-bold text-zinc-800 uppercase tracking-wide">Terrain</th>
              <th className="px-5 py-3 text-left text-xs font-bold text-zinc-800 uppercase tracking-wide">Status</th>
              <th className="px-5 py-3 text-left text-xs font-bold text-zinc-800 uppercase tracking-wide">Website</th>
              <th className="px-5 py-3 w-16" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {loading ? (
              <TableBodySpinner />
            ) : displayed.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-zinc-400">
                  {patterns.length === 0 ? 'No patterns yet. Add brands and create patterns under each brand.' : 'No patterns match your filters.'}
                </td>
              </tr>
            ) : (
              displayed.map(p => (
                <tr key={p.pattern_id}
                  className="odd:bg-white even:bg-zinc-50 hover:!bg-zinc-200 transition-colors cursor-pointer"
                  onClick={() => router.push(`/admin/products/brands/${p.brand_id}/patterns/${p.pattern_id}`)}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      {p.main_image && (p.main_image.startsWith('http://') || p.main_image.startsWith('https://')) && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.main_image} alt="" className="h-8 w-8 object-contain rounded border border-zinc-200 bg-zinc-50 shrink-0" />
                      )}
                      <div>
                        <p className="font-medium text-zinc-900">{p.pattern_name}</p>
                        <p className="text-xs text-zinc-400 font-mono">{p.pattern_slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <Link href={`/admin/products/brands/${p.brand_id}`} onClick={e => e.stopPropagation()}
                      className="text-xs text-primary hover:underline font-bold">
                      {p.brand_name}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <Badge className={`text-xs rounded-full border-0 capitalize ${APP_COLOURS[p.application_type] ?? 'bg-zinc-100 text-zinc-600'}`}>
                      {p.application_type}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-xs text-zinc-500 capitalize">
                    {p.season_type?.replace(/_/g, ' ') ?? <span className="text-zinc-300">—</span>}
                  </td>
                  <td className="px-5 py-3 text-xs text-zinc-500 capitalize">
                    {p.terrain_type?.replace(/_/g, ' ') ?? <span className="text-zinc-300">—</span>}
                  </td>
                  <td className="px-5 py-3">
                    <Badge className={`text-xs rounded-full border-0 ${p.is_active ? 'bg-green-50 text-green-700' : 'bg-zinc-100 text-zinc-500'}`}>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-5 py-3">
                    <Badge className={`text-xs rounded-full border-0 ${p.show_on_website ? 'bg-blue-50 text-blue-700' : 'bg-zinc-100 text-zinc-500'}`}>
                      {p.show_on_website ? 'Visible' : 'Hidden'}
                    </Badge>
                  </td>
                  <td className="px-5 py-3" onClick={e => e.stopPropagation()}>
                    <RowActions pattern={p} onDelete={setToDelete} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {!loading && total > 0 && (
          <div className="px-5 py-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
            <span>{total.toLocaleString()} pattern{total !== 1 ? 's' : ''} total</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-zinc-500 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Prev
              </button>
              <span>Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-zinc-500 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {toDelete && (
        <DeleteDialog
          pattern={toDelete}
          onClose={() => { setToDelete(null); setSkuError(false) }}
          onConfirm={handleDelete}
          deleting={deleting}
          skuError={skuError}
        />
      )}
    </div>
  )
}
