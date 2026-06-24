'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useQueryClient } from '@tanstack/react-query'
import { AdminBreadcrumb } from '@/components/admin/AdminBreadcrumb'
import { Badge } from '@/components/ui/badge'
import { BoolToggle } from '@/components/admin/BoolToggle'
import { PatternEditSheet } from '@/components/admin/brands/PatternEditSheet'
import { toastError, toastSuccess, toastPromise } from '@/lib/toast'
import { Pencil, Trash2, Upload } from 'lucide-react'
import { useAdminBrandsAll, useAdminPatterns, type AdminPattern } from '@/lib/query/hooks'
import { adminKeys } from '@/lib/query/keys'
import { TableBodySpinner } from '@/components/ui/table-loader'

const API = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

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

function RowActions({ pattern, onDelete, onEdit }: { pattern: PatternWithBrand; onDelete: (p: PatternWithBrand) => void; onEdit: (p: PatternWithBrand) => void }) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      <button
        type="button"
        onClick={e => { e.stopPropagation(); onEdit(pattern) }}
        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100 hover:border-blue-300 transition-colors shadow-sm"
      >
        <Pencil className="w-3 h-3" /> Edit
      </button>
      <button
        type="button"
        onClick={e => { e.stopPropagation(); onDelete(pattern) }}
        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 hover:border-red-300 transition-colors shadow-sm"
      >
        <Trash2 className="w-3 h-3" /> Delete
      </button>
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
  const [limit,       setLimit]       = useState(50)
  const [filterBrand, setFilterBrand] = useState(searchParams.get('brand') ?? '')
  const [filterApp,   setFilterApp]   = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search,      setSearch]      = useState('')
  const [toDelete,     setToDelete]     = useState<PatternWithBrand | null>(null)
  const [deleting,     setDeleting]     = useState(false)
  const [skuError,     setSkuError]     = useState(false)
  const [editPattern,  setEditPattern]  = useState<PatternWithBrand | null>(null)
  
  const [selected,     setSelected]     = useState<Set<string>>(new Set())
  const [bulkUpdating, setBulkUpdating] = useState(false)

  const { data: result,  isPending: patternsLoading } = useAdminPatterns({ page, limit, search, brandId: filterBrand || undefined, appType: filterApp || undefined })
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

  async function handleBulkUpdate(field: 'isActive' | 'showOnWebsite', value: boolean) {
    if (selected.size === 0) return
    setBulkUpdating(true)
    const tok = await getToken()
    const ids = Array.from(selected)
    
    // Optimistic UI Update
    queryClient.setQueriesData({ queryKey: ['admin', 'patterns', 'list'] }, (oldData: any) => {
      if (!oldData || !oldData.data) return oldData
      return {
        ...oldData,
        data: oldData.data.map((p: any) => 
          selected.has(`${p.brand_id}:${p.pattern_id}`) 
            ? { ...p, [field === 'isActive' ? 'is_active' : 'show_on_website']: value } 
            : p
        )
      }
    })

    const updatePromise = Promise.all(ids.map(idStr => {
      const [bId, pId] = idStr.split(':')
      return fetch(`${API}/api/admin/products/brands/${bId}/patterns/${pId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify({ [field === 'isActive' ? 'is_active' : 'show_on_website']: value }),
      }).then(res => { if (!res.ok) throw new Error('Failed') })
    }))

    try {
      await toastPromise(updatePromise, {
        loading: `Updating ${ids.length} patterns...`,
        success: `Updated ${ids.length} patterns successfully`,
        error: 'Failed to update some patterns'
      })
      queryClient.invalidateQueries({ queryKey: adminKeys.patternList() })
    } catch (err: unknown) {
      queryClient.invalidateQueries({ queryKey: adminKeys.patternList() })
    } finally {
      setBulkUpdating(false)
      setSelected(new Set())
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

      {/* Bulk Action Bar */}
      {selected.size > 0 && (
        <div className="animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-zinc-900 text-white rounded-2xl px-5 py-3 shadow-md flex items-center justify-between border border-zinc-800">
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center bg-primary text-primary-foreground text-sm font-bold w-8 h-8 rounded-full shadow-sm">
                  {selected.size}
                </div>
                <span className="text-sm font-semibold tracking-wide">Selected</span>
              </div>
              
              <div className="hidden sm:block w-px h-8 bg-zinc-700/60"></div>

              <div className="flex items-center gap-4 sm:gap-6">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Active</span>
                  <div className="flex rounded-lg bg-zinc-800/80 p-1 border border-zinc-700/50 shadow-inner">
                    <button onClick={() => handleBulkUpdate('isActive', true)} disabled={bulkUpdating} className="px-4 py-1.5 text-xs font-semibold text-zinc-300 rounded-md hover:bg-emerald-500 hover:text-white hover:shadow-md disabled:opacity-50 transition-all">Yes</button>
                    <button onClick={() => handleBulkUpdate('isActive', false)} disabled={bulkUpdating} className="px-4 py-1.5 text-xs font-semibold text-zinc-300 rounded-md hover:bg-rose-500 hover:text-white hover:shadow-md disabled:opacity-50 transition-all">No</button>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Website</span>
                  <div className="flex rounded-lg bg-zinc-800/80 p-1 border border-zinc-700/50 shadow-inner">
                    <button onClick={() => handleBulkUpdate('showOnWebsite', true)} disabled={bulkUpdating} className="px-4 py-1.5 text-xs font-semibold text-zinc-300 rounded-md hover:bg-emerald-500 hover:text-white hover:shadow-md disabled:opacity-50 transition-all">Yes</button>
                    <button onClick={() => handleBulkUpdate('showOnWebsite', false)} disabled={bulkUpdating} className="px-4 py-1.5 text-xs font-semibold text-zinc-300 rounded-md hover:bg-rose-500 hover:text-white hover:shadow-md disabled:opacity-50 transition-all">No</button>
                  </div>
                </div>
              </div>
            </div>

            <button onClick={() => setSelected(new Set())} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors ml-4 shrink-0" title="Clear selection">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-primary/10">
              <th className="px-5 py-3 w-12 text-left">
                <input 
                  type="checkbox" 
                  checked={displayed.length > 0 && selected.size === displayed.length}
                  ref={el => { if (el) el.indeterminate = selected.size > 0 && selected.size < displayed.length }}
                  onChange={e => {
                    if (e.target.checked) setSelected(new Set(displayed.map(p => `${p.brand_id}:${p.pattern_id}`)))
                    else setSelected(new Set())
                  }}
                  className="rounded border-zinc-300 text-primary focus:ring-primary h-4 w-4 transition-all"
                />
              </th>
              <th className="px-5 py-3 text-left text-xs font-bold text-zinc-800 uppercase tracking-wide">Pattern</th>
              <th className="px-5 py-3 text-left text-xs font-bold text-zinc-800 uppercase tracking-wide">Brand</th>
              <th className="px-5 py-3 text-left text-xs font-bold text-zinc-800 uppercase tracking-wide">Application</th>
              <th className="px-5 py-3 text-left text-xs font-bold text-zinc-800 uppercase tracking-wide">Season</th>
              <th className="px-5 py-3 text-left text-xs font-bold text-zinc-800 uppercase tracking-wide">Terrain</th>
              <th className="px-5 py-3 text-left text-xs font-bold text-zinc-800 uppercase tracking-wide">Status</th>
              <th className="px-5 py-3 text-left text-xs font-bold text-zinc-800 uppercase tracking-wide">Website</th>
              <th className="px-5 py-3 text-right text-xs font-bold text-zinc-800 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {loading ? (
              <TableBodySpinner />
            ) : displayed.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center text-zinc-400">
                  {patterns.length === 0 ? 'No patterns yet. Add brands and create patterns under each brand.' : 'No patterns match your filters.'}
                </td>
              </tr>
            ) : (
              displayed.map(p => (
                <tr key={p.pattern_id}
                  className={`odd:bg-white even:bg-zinc-50 hover:!bg-zinc-200 transition-colors cursor-pointer ${selected.has(`${p.brand_id}:${p.pattern_id}`) ? '!bg-amber-50/30' : ''}`}
                  onClick={() => router.push(`/admin/products/brands/${p.brand_id}/patterns/${p.pattern_id}`)}
                >
                  <td className="px-5 py-3" onClick={e => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      checked={selected.has(`${p.brand_id}:${p.pattern_id}`)}
                      onChange={e => {
                        const next = new Set(selected)
                        const id = `${p.brand_id}:${p.pattern_id}`
                        if (e.target.checked) next.add(id)
                        else next.delete(id)
                        setSelected(next)
                      }}
                      className="rounded border-zinc-300 text-primary focus:ring-primary h-4 w-4 transition-all"
                    />
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
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
                    <BoolToggle initial={p.is_active} onToggle={async next => {
                      const tok = await getToken()
                      const res = await fetch(`${API}/api/admin/products/brands/${p.brand_id}/patterns/${p.pattern_id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
                        body: JSON.stringify({ isActive: next }),
                      })
                      if (!res.ok) throw new Error('Failed')
                      queryClient.invalidateQueries({ queryKey: adminKeys.patternList() })
                    }} />
                  </td>
                  <td className="px-5 py-3">
                    <BoolToggle initial={p.show_on_website} onToggle={async next => {
                      const tok = await getToken()
                      const res = await fetch(`${API}/api/admin/products/brands/${p.brand_id}/patterns/${p.pattern_id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
                        body: JSON.stringify({ showOnWebsite: next }),
                      })
                      if (!res.ok) throw new Error('Failed')
                      queryClient.invalidateQueries({ queryKey: adminKeys.patternList() })
                    }} />
                  </td>
                  <td className="px-5 py-3" onClick={e => e.stopPropagation()}>
                    <RowActions pattern={p} onDelete={setToDelete} onEdit={setEditPattern} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {!loading && total > 0 && (
          <div className="px-5 py-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
            <div className="flex items-center gap-4">
              <span>{total.toLocaleString()} pattern{total !== 1 ? 's' : ''} total</span>
              <div className="flex items-center gap-2">
                <span>Rows per page:</span>
                <select
                  value={limit}
                  onChange={e => {
                    setLimit(Number(e.target.value))
                    setPage(1)
                  }}
                  className="rounded border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700 focus:outline-none focus:ring-1 focus:ring-primary/30 cursor-pointer"
                >
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
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

      <PatternEditSheet
        pattern={editPattern}
        open={!!editPattern}
        onClose={() => setEditPattern(null)}
        onSaved={() => {
          setEditPattern(null)
          queryClient.invalidateQueries({ queryKey: adminKeys.patternList() })
        }}
      />
    </div>
  )
}
