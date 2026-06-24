'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useQueryClient } from '@tanstack/react-query'
import { AdminBreadcrumb } from '@/components/admin/AdminBreadcrumb'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BoolToggle } from '@/components/admin/BoolToggle'
import { BrandEditSheet } from '@/components/admin/brands/BrandEditSheet'
import { BrandAddSheet } from '@/components/admin/brands/BrandAddSheet'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Pencil, Trash2, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { toastPromise, toastError, toastSuccess } from '@/lib/toast'
import type { Brand } from '@/types/admin.types'
import { useAdminBrands } from '@/lib/query/hooks'
import { adminKeys } from '@/lib/query/keys'
import { TableBodySpinner } from '@/components/ui/table-loader'

const API = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

const POSITIONING_COLOURS: Record<string, string> = {
  budget:     'bg-zinc-100 text-zinc-600',
  mid_range:  'bg-blue-50 text-blue-700',
  premium:    'bg-amber-50 text-amber-700',
  commercial: 'bg-purple-50 text-purple-700',
}

async function getToken() {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.access_token ?? ''
}

export default function BrandsPage() {
  const queryClient                    = useQueryClient()
  const [page, setPage]                = useState(1)
  const [limit, setLimit]              = useState(50)
  const [search, setSearch]            = useState('')
  const [searchInput, setSearchInput]  = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<Brand | null>(null)
  const [deleting, setDeleting]        = useState(false)
  const [editBrand, setEditBrand]      = useState<Brand | null>(null)
  const [addOpen,   setAddOpen]        = useState(false)
  const [selected,  setSelected]       = useState<Set<string>>(new Set())
  const [bulkUpdating, setBulkUpdating] = useState(false)

  const { data: result, isPending: loading } = useAdminBrands({ page, limit, search })
  const brands     = result?.data     ?? []
  const totalPages = result?.totalPages ?? 1
  const total      = result?.total    ?? 0

  async function handleDelete(brand: Brand) {
    setDeleting(true)
    const tok = await getToken()
    const req = fetch(`${API}/api/admin/products/brands/${brand.brand_id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tok}` },
    }).then(async res => {
      if (!res.ok) throw new Error(await res.json().then((b: { error?: string }) => b.error ?? 'Failed'))
    })

    try {
      await toastPromise(req, {
        loading: `Deleting "${brand.brand_name}"…`,
        success: `"${brand.brand_name}" deleted`,
        error:   (err: unknown) => err instanceof Error ? err.message : 'Failed to delete',
      })
      queryClient.invalidateQueries({ queryKey: adminKeys.brandList() })
      queryClient.invalidateQueries({ queryKey: adminKeys.brandListAll() })
      setDeleteConfirm(null)
    } catch {
      // shown by toastPromise
    } finally {
      setDeleting(false)
    }
  }

  async function handleBulkUpdate(field: 'is_active' | 'show_on_website', value: boolean) {
    if (selected.size === 0) return
    setBulkUpdating(true)
    const tok = await getToken()
    const ids = Array.from(selected)
    
    // Optimistic UI Update
    queryClient.setQueriesData({ queryKey: ['admin', 'brands', 'list'] }, (oldData: any) => {
      if (!oldData || !oldData.data) return oldData
      return {
        ...oldData,
        data: oldData.data.map((b: any) => 
          selected.has(b.brand_id) ? { ...b, [field]: value } : b
        )
      }
    })

    const updatePromise = Promise.all(ids.map(id => fetch(`${API}/api/admin/products/brands/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
      body: JSON.stringify({ [field]: value }),
    }).then(res => { if (!res.ok) throw new Error('Failed') })))

    try {
      await toastPromise(updatePromise, {
        loading: `Updating ${ids.length} brands...`,
        success: `Updated ${ids.length} brands successfully`,
        error: 'Failed to update some brands'
      })
      queryClient.invalidateQueries({ queryKey: adminKeys.brandList() })
    } catch (err: unknown) {
      // Revert will happen automatically on next fetch or we could manually revert,
      // but invalidating is usually enough to repair state
      queryClient.invalidateQueries({ queryKey: adminKeys.brandList() })
    } finally {
      setBulkUpdating(false)
      setSelected(new Set()) // Clear selection after successful bulk action
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <AdminBreadcrumb crumbs={[
        { label: 'Products', href: '/admin/products' },
        { label: 'Brands' },
      ]} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Brands</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Manage tyre brand identities, logos, and positioning</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/products/import?type=brands"
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-300 bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            Bulk Import
          </Link>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> New Brand
          </button>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={e => { e.preventDefault(); setSearch(searchInput); setPage(1) }} className="flex gap-2">
        <input
          type="text"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          placeholder="Search brands…"
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-primary/30 w-56"
        />
        <Button type="submit" variant="outline" size="sm">Search</Button>
        {search && (
          <Button type="button" variant="ghost" size="sm" onClick={() => { setSearch(''); setSearchInput(''); setPage(1) }}>
            Clear
          </Button>
        )}
      </form>

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
                    <button onClick={() => handleBulkUpdate('is_active', true)} disabled={bulkUpdating} className="px-4 py-1.5 text-xs font-semibold text-zinc-300 rounded-md hover:bg-emerald-500 hover:text-white hover:shadow-md disabled:opacity-50 transition-all">Yes</button>
                    <button onClick={() => handleBulkUpdate('is_active', false)} disabled={bulkUpdating} className="px-4 py-1.5 text-xs font-semibold text-zinc-300 rounded-md hover:bg-rose-500 hover:text-white hover:shadow-md disabled:opacity-50 transition-all">No</button>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Website</span>
                  <div className="flex rounded-lg bg-zinc-800/80 p-1 border border-zinc-700/50 shadow-inner">
                    <button onClick={() => handleBulkUpdate('show_on_website', true)} disabled={bulkUpdating} className="px-4 py-1.5 text-xs font-semibold text-zinc-300 rounded-md hover:bg-emerald-500 hover:text-white hover:shadow-md disabled:opacity-50 transition-all">Yes</button>
                    <button onClick={() => handleBulkUpdate('show_on_website', false)} disabled={bulkUpdating} className="px-4 py-1.5 text-xs font-semibold text-zinc-300 rounded-md hover:bg-rose-500 hover:text-white hover:shadow-md disabled:opacity-50 transition-all">No</button>
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

      <div className="bg-white rounded-2xl border border-zinc-200 overflow-x-auto shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50">
              <th className="px-5 py-3 w-12 text-left">
                <input 
                  type="checkbox" 
                  checked={brands.length > 0 && selected.size === brands.length}
                  ref={el => { if (el) el.indeterminate = selected.size > 0 && selected.size < brands.length }}
                  onChange={e => {
                    if (e.target.checked) setSelected(new Set(brands.map(b => b.brand_id)))
                    else setSelected(new Set())
                  }}
                  className="rounded border-zinc-300 text-primary focus:ring-primary h-4 w-4 transition-all"
                />
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Brand</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tier</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Country</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Active</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">On Website</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide pr-8">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {loading ? (
              <TableBodySpinner />
            ) : brands.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-16 text-center text-zinc-400">
                  No brands yet.{' '}
                  <Link href="/admin/products/brands/new" className="text-primary hover:underline">Create one</Link>.
                </td>
              </tr>
            ) : (
              brands.map(brand => (
                <tr key={brand.brand_id} className={`odd:bg-white even:bg-zinc-50 hover:!bg-zinc-200 transition-colors ${selected.has(brand.brand_id) ? '!bg-amber-50/30' : ''}`}>
                  <td className="px-5 py-3">
                    <input 
                      type="checkbox" 
                      checked={selected.has(brand.brand_id)}
                      onChange={e => {
                        const next = new Set(selected)
                        if (e.target.checked) next.add(brand.brand_id)
                        else next.delete(brand.brand_id)
                        setSelected(next)
                      }}
                      className="rounded border-zinc-300 text-primary focus:ring-primary h-4 w-4 transition-all"
                    />
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {brand.brand_logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={brand.brand_logo} alt="" className="h-8 w-8 object-contain rounded-lg border border-zinc-200 bg-zinc-50 p-0.5 shrink-0" />
                      ) : (
                        <div className="h-8 w-8 rounded-lg border border-zinc-200 bg-zinc-100 flex items-center justify-center text-zinc-400 text-xs font-bold shrink-0">
                          {brand.brand_name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <Link href={`/admin/products/brands/${brand.brand_id}`} className="font-bold text-primary hover:underline">
                          {brand.brand_name}
                        </Link>
                        {brand.brand_short_description && (
                          <p className="text-xs text-zinc-400 truncate max-w-xs">{brand.brand_short_description}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    {brand.brand_positioning ? (
                      <Badge className={`text-xs rounded-full border-0 capitalize ${POSITIONING_COLOURS[brand.brand_positioning] ?? 'bg-zinc-100 text-zinc-600'}`}>
                        {brand.brand_positioning.replace('_', ' ')}
                      </Badge>
                    ) : <span className="text-zinc-300">—</span>}
                  </td>
                  <td className="px-5 py-3 text-zinc-600 text-xs">{brand.country_of_brand ?? '—'}</td>
                  <td className="px-5 py-3">
                    <BoolToggle initial={brand.is_active} onToggle={async next => {
                      const tok = await getToken()
                      const res = await fetch(`${API}/api/admin/products/brands/${brand.brand_id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
                        body: JSON.stringify({ is_active: next }),
                      })
                      if (!res.ok) throw new Error('Failed')
                      queryClient.invalidateQueries({ queryKey: adminKeys.brandList() })
                    }} />
                  </td>
                  <td className="px-5 py-3">
                    <BoolToggle initial={brand.show_on_website} onToggle={async next => {
                      const tok = await getToken()
                      const res = await fetch(`${API}/api/admin/products/brands/${brand.brand_id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
                        body: JSON.stringify({ show_on_website: next }),
                      })
                      if (!res.ok) throw new Error('Failed')
                      queryClient.invalidateQueries({ queryKey: adminKeys.brandList() })
                    }} />
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditBrand(brand)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100 hover:border-blue-300 transition-colors shadow-sm"
                        aria-label="Edit brand"
                      >
                        <Pencil className="w-3 h-3" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirm(brand)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 hover:border-red-300 transition-colors shadow-sm"
                        aria-label="Delete brand"
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {/* Pagination footer */}
        {!loading && total > 0 && (
          <div className="px-5 py-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
            <div className="flex items-center gap-4">
              <span>{total} brand{total !== 1 ? 's' : ''} total</span>
              <div className="flex items-center gap-2">
                <span>Rows per page:</span>
                <select
                  value={limit}
                  onChange={e => {
                    setLimit(Number(e.target.value))
                    setPage(1)
                  }}
                  className="rounded border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700 focus:outline-none focus:ring-1 focus:ring-primary/30"
                >
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline" size="icon-sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <span>Page {page} of {totalPages}</span>
              <Button
                variant="outline" size="icon-sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={Boolean(deleteConfirm)} onOpenChange={v => !v && setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Brand</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-600">
            Are you sure you want to delete <span className="font-semibold">{deleteConfirm?.brand_name}</span>?
            This cannot be undone and may affect products linked to this brand.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete Brand'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BrandAddSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={() => {
          setAddOpen(false)
          queryClient.invalidateQueries({ queryKey: adminKeys.brandList() })
          queryClient.invalidateQueries({ queryKey: adminKeys.brandListAll() })
        }}
      />

      <BrandEditSheet
        brand={editBrand}
        open={!!editBrand}
        onClose={() => setEditBrand(null)}
        onSaved={() => {
          setEditBrand(null)
          queryClient.invalidateQueries({ queryKey: adminKeys.brandList() })
          queryClient.invalidateQueries({ queryKey: adminKeys.brandListAll() })
        }}
      />
    </div>
  )
}
