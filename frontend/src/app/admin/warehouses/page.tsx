'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AdminBreadcrumb } from '@/components/admin/AdminBreadcrumb'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Pencil, Trash2, Plus } from 'lucide-react'
import { toastSuccess, toastError } from '@/lib/toast'
import type { Warehouse } from '@/types/admin.types'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

const TYPE_COLOURS: Record<string, string> = {
  own:      'bg-green-50 text-green-700',
  supplier: 'bg-blue-50 text-blue-700',
  '3pl':    'bg-purple-50 text-purple-700',
}

async function getToken() {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.access_token ?? ''
}

export default function WarehousesPage() {
  const router = useRouter()
  const [warehouses, setWarehouses]     = useState<Warehouse[]>([])
  const [loading, setLoading]           = useState(true)
  const [showInactive, setShowInactive] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Warehouse | null>(null)
  const [deleting, setDeleting]         = useState(false)

  useEffect(() => { document.title = 'Warehouses | Tyre Vault' }, [])

  const fetchWarehouses = useCallback(async () => {
    setLoading(true)
    try {
      const tok = await getToken()
      const res = await fetch(`${API}/api/admin/orders/warehouses?all=${showInactive}`, {
        headers: { Authorization: `Bearer ${tok}` },
      })
      if (!res.ok) throw new Error('Failed to load warehouses')
      setWarehouses(await res.json())
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [showInactive])

  useEffect(() => { fetchWarehouses() }, [fetchWarehouses])

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const tok = await getToken()
      const res = await fetch(`${API}/api/admin/orders/warehouses/${deleteTarget.warehouse_id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tok}` },
      })
      if (!res.ok) throw new Error('Delete failed')
      toastSuccess('Warehouse deleted')
      setDeleteTarget(null)
      fetchWarehouses()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <AdminBreadcrumb crumbs={[{ label: 'Warehouses' }]} />
          <h1 className="mt-2 text-xl font-semibold text-zinc-900">Warehouses</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Manage own, supplier, and 3PL warehouse locations</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-sm text-zinc-500 cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={e => setShowInactive(e.target.checked)}
              className="rounded border-zinc-300"
            />
            Show inactive
          </label>
          <Button onClick={() => router.push('/admin/warehouses/new')} className="flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Add Warehouse
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-zinc-100 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Location</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Flags</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {warehouses.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-zinc-400">No warehouses yet</td></tr>
              )}
              {warehouses.map(w => (
                <tr key={w.warehouse_id} className="odd:bg-background even:bg-muted/30 hover:bg-muted/60 transition-colors">
                  <td className="px-4 py-3 font-medium text-zinc-900">{w.warehouse_name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium uppercase ${TYPE_COLOURS[w.warehouse_type] ?? 'bg-zinc-100 text-zinc-600'}`}>
                      {w.warehouse_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">
                    {[w.suburb, w.state, w.postcode].filter(Boolean).join(', ') || w.state}
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">
                    {w.contact_name
                      ? <span>{w.contact_name}{w.contact_phone && <><br />{w.contact_phone}</>}</span>
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {w.is_own_warehouse      && <span className="text-[10px] bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded">Own</span>}
                      {w.is_supplier_warehouse && <span className="text-[10px] bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded">Supplier</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={w.is_active ? 'default' : 'secondary'}>
                      {w.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => router.push(`/admin/warehouses/${w.warehouse_id}/edit`)}
                        className="text-zinc-400 hover:text-blue-600 transition-colors"
                        aria-label="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(w)}
                        className="text-zinc-400 hover:text-red-600 transition-colors"
                        aria-label="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Warehouse?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-600 mt-1">
            <strong>{deleteTarget?.warehouse_name}</strong> will be permanently removed. This will fail if stock is assigned to this warehouse.
          </p>
          <div className="flex gap-3 justify-end mt-4">
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button type="button" variant="destructive" disabled={deleting} onClick={handleDelete}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

