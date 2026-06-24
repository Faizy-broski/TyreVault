'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminBreadcrumb } from '@/components/admin/AdminBreadcrumb'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { ShippingMethodSheet } from '@/components/admin/shipping/ShippingMethodSheet'
import { Pencil, Trash2, Plus } from 'lucide-react'
import { toastSuccess, toastError } from '@/lib/toast'
import type { AdminShippingMethod, ShippingMethodType } from '@/types/admin.types'

const API = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

const METHOD_TYPES: { value: ShippingMethodType; label: string }[] = [
  { value: 'own_fleet',       label: 'Own Fleet' },
  { value: 'courier_api',     label: 'Courier API' },
  { value: '3pl',             label: '3PL' },
  { value: 'supplier_direct', label: 'Supplier Direct' },
  { value: 'pickup',          label: 'Pickup' },
]

const TYPE_COLOURS: Record<ShippingMethodType, string> = {
  own_fleet:       'bg-green-50 text-green-700',
  courier_api:     'bg-blue-50 text-blue-700',
  '3pl':           'bg-purple-50 text-purple-700',
  supplier_direct: 'bg-amber-50 text-amber-700',
  pickup:          'bg-zinc-100 text-zinc-600',
}

async function getToken() {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.access_token ?? ''
}

export default function ShippingMethodsPage() {
  const [methods, setMethods]           = useState<AdminShippingMethod[]>([])
  const [loading, setLoading]           = useState(true)
  const [showInactive, setShowInactive] = useState(false)
  const [sheetOpen, setSheetOpen]       = useState(false)
  const [editTarget, setEditTarget]     = useState<AdminShippingMethod | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminShippingMethod | null>(null)
  const [deleting, setDeleting]         = useState(false)

  useEffect(() => { document.title = 'Shipping Methods | Tyre Vault' }, [])

  async function fetchMethods() {
    setLoading(true)
    try {
      const tok = await getToken()
      const res = await fetch(`${API}/api/admin/shipping/methods?all=${showInactive}`, {
        headers: { Authorization: `Bearer ${tok}` },
      })
      if (!res.ok) throw new Error('Failed to load shipping methods')
      setMethods(await res.json())
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchMethods() }, [showInactive])

  function openCreate() {
    setEditTarget(null)
    setSheetOpen(true)
  }

  function openEdit(m: AdminShippingMethod) {
    setEditTarget(m)
    setSheetOpen(true)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const tok = await getToken()
      const res = await fetch(`${API}/api/admin/shipping/methods/${deleteTarget.shipping_method_id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tok}` },
      })
      if (!res.ok) throw new Error('Delete failed')
      toastSuccess('Shipping method deleted')
      setDeleteTarget(null)
      fetchMethods()
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
          <AdminBreadcrumb crumbs={[{ label: 'Shipping Methods' }]} />
          <h1 className="mt-2 text-xl font-semibold text-zinc-900">Shipping Methods</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Configure couriers, own fleet, 3PL, and pickup options</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-sm text-zinc-500 cursor-pointer">
            <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} className="rounded border-zinc-300" />
            Show inactive
          </label>
          <Button onClick={openCreate} className="flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Add Method
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-14 bg-zinc-100 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Method Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">API / Provider</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {methods.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-zinc-400">No shipping methods yet</td></tr>
              )}
              {methods.map(m => (
                <tr key={m.shipping_method_id} className="odd:bg-white even:bg-zinc-50 hover:!bg-zinc-200 transition-colors">
                  <td className="px-4 py-3 font-medium text-zinc-900">{m.method_name}</td>
                  <td className="px-4 py-3">
                    {m.method_type ? (
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLOURS[m.method_type] ?? 'bg-zinc-100 text-zinc-600'}`}>
                        {METHOD_TYPES.find(t => t.value === m.method_type)?.label ?? m.method_type}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">{m.api_provider ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Badge variant={m.is_active ? 'default' : 'secondary'}>
                      {m.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button type="button" onClick={() => openEdit(m)} className="text-zinc-400 hover:text-zinc-700">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => setDeleteTarget(m)} className="text-zinc-400 hover:text-red-600">
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

      <ShippingMethodSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSaved={fetchMethods}
        method={editTarget}
      />

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Shipping Method</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-600 py-2">
            Delete <span className="font-medium">{deleteTarget?.method_name}</span>? This cannot be undone and will fail if the method is linked to existing quotes or shipments.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

