'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useQueryClient } from '@tanstack/react-query'
import { AdminBreadcrumb } from '@/components/admin/AdminBreadcrumb'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Pencil, Trash2, Plus } from 'lucide-react'
import { toastPromise, toastError } from '@/lib/toast'
import type { Brand } from '@/types/admin.types'
import { useAdminBrands } from '@/lib/query/hooks'
import { adminKeys } from '@/lib/query/keys'
import { TableBodySpinner } from '@/components/ui/table-loader'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

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
  const queryClient               = useQueryClient()
  const { data: brands = [], isPending: loading } = useAdminBrands()
  const [deleteConfirm, setDeleteConfirm] = useState<Brand | null>(null)
  const [deleting, setDeleting]       = useState(false)

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
      setDeleteConfirm(null)
    } catch {
      // shown by toastPromise
    } finally {
      setDeleting(false)
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
          <Link
            href="/admin/products/brands/new"
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> New Brand
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 overflow-x-auto shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50">
              <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Brand</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Slug</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Positioning</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Country</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Active</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">On Site</th>
              <th className="px-5 py-3 w-20" />
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
                <tr key={brand.brand_id} className="odd:bg-white even:bg-zinc-50 hover:!bg-zinc-200 transition-colors">
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
                  <td className="px-5 py-3 font-mono text-xs text-zinc-500">{brand.brand_slug}</td>
                  <td className="px-5 py-3">
                    {brand.brand_positioning ? (
                      <Badge className={`text-xs rounded-full border-0 capitalize ${POSITIONING_COLOURS[brand.brand_positioning] ?? 'bg-zinc-100 text-zinc-600'}`}>
                        {brand.brand_positioning.replace('_', ' ')}
                      </Badge>
                    ) : <span className="text-zinc-300">—</span>}
                  </td>
                  <td className="px-5 py-3 text-zinc-600 text-xs">{brand.country_of_brand ?? '—'}</td>
                  <td className="px-5 py-3">
                    <Badge className={`text-xs rounded-full border-0 ${brand.is_active ? 'bg-green-50 text-green-700' : 'bg-zinc-100 text-zinc-500'}`}>
                      {brand.is_active ? 'Yes' : 'No'}
                    </Badge>
                  </td>
                  <td className="px-5 py-3">
                    <Badge className={`text-xs rounded-full border-0 ${brand.show_on_website ? 'bg-green-50 text-green-700' : 'bg-zinc-100 text-zinc-500'}`}>
                      {brand.show_on_website ? 'Yes' : 'No'}
                    </Badge>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/admin/products/brands/${brand.brand_id}/edit`}
                        className="inline-flex items-center justify-center w-7 h-7 rounded-md text-zinc-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        aria-label="Edit brand"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Link>
                      <Button
                        type="button" variant="ghost" size="icon-sm"
                        aria-label="Delete brand"
                        onClick={() => setDeleteConfirm(brand)}
                        className="text-zinc-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
    </div>
  )
}
