'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useAdminWarehouses } from '@/lib/query/hooks'
import { adminKeys } from '@/lib/query/keys'
import { createClient } from '@/lib/supabase/client'
import { AdminBreadcrumb } from '@/components/admin/AdminBreadcrumb'
import { Badge } from '@/components/ui/badge'
import { BoolToggle } from '@/components/admin/BoolToggle'
import { Sheet } from '@/components/ui/sheet'
import { WarehouseAddSheet } from '@/components/admin/warehouses/WarehouseAddSheet'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Pencil, Trash2, Plus } from 'lucide-react'
import { toastSuccess, toastError } from '@/lib/toast'
import type { Warehouse } from '@/types/admin.types'
import { BoxSpinner } from '@/components/ui/table-loader'

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
  const queryClient = useQueryClient()
  const [showInactive, setShowInactive] = useState(false)
  const [deleteTarget, setDeleteTarget]   = useState<Warehouse | null>(null)
  const [deleting, setDeleting]           = useState(false)
  const [addOpen,       setAddOpen]       = useState(false)
  const [editWarehouse, setEditWarehouse] = useState<Warehouse | null>(null)
  const [wForm, setWForm]                 = useState({ warehouse_name: '', warehouse_type: 'own' as 'own'|'supplier'|'3pl', state: '', contact_name: '', contact_phone: '', is_active: true, is_own_warehouse: false, is_supplier_warehouse: false })
  const [wSaving, setWSaving]             = useState(false)

  const { data: warehouses = [], isPending: loading } = useAdminWarehouses(showInactive)

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
      queryClient.invalidateQueries({ queryKey: adminKeys.warehouseList(showInactive) })
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
          <Button onClick={() => setAddOpen(true)} className="flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Add Warehouse
          </Button>
        </div>
      </div>

      {loading ? (
        <BoxSpinner />
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Location</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Flags</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {warehouses.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-zinc-400">No warehouses yet</td></tr>
              )}
              {warehouses.map(w => (
                <tr key={w.warehouse_id} className="odd:bg-white even:bg-zinc-50 hover:!bg-zinc-200 transition-colors">
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
                    <BoolToggle initial={w.is_active} onToggle={async next => {
                      const tok = await getToken()
                      const res = await fetch(`${API}/api/admin/orders/warehouses/${w.warehouse_id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
                        body: JSON.stringify({ is_active: next }),
                      })
                      if (!res.ok) throw new Error('Failed')
                      queryClient.invalidateQueries({ queryKey: adminKeys.warehouseList(showInactive) })
                    }} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => { setEditWarehouse(w); setWForm({ warehouse_name: w.warehouse_name, warehouse_type: w.warehouse_type, state: w.state, contact_name: w.contact_name ?? '', contact_phone: w.contact_phone ?? '', is_active: w.is_active, is_own_warehouse: w.is_own_warehouse, is_supplier_warehouse: w.is_supplier_warehouse }) }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100 hover:border-blue-300 transition-colors shadow-sm"
                      >
                        <Pencil className="w-3 h-3" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(w)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 hover:border-red-300 transition-colors shadow-sm"
                      >
                        <Trash2 className="w-3 h-3" /> Delete
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

      <WarehouseAddSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={() => {
          setAddOpen(false)
          queryClient.invalidateQueries({ queryKey: adminKeys.warehouseList(showInactive) })
        }}
      />

      <Sheet
        open={!!editWarehouse}
        onClose={() => setEditWarehouse(null)}
        title={editWarehouse ? `Edit Warehouse — ${editWarehouse.warehouse_name}` : 'Edit Warehouse'}
        footer={
          <>
            <button type="button" onClick={() => setEditWarehouse(null)}
              className="px-4 py-2 rounded-lg border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors">
              Cancel
            </button>
            <button type="button" disabled={wSaving} onClick={async () => {
              if (!editWarehouse || !wForm.warehouse_name.trim()) return
              setWSaving(true)
              try {
                const tok = await getToken()
                const res = await fetch(`${API}/api/admin/orders/warehouses/${editWarehouse.warehouse_id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
                  body: JSON.stringify({ ...wForm, contact_name: wForm.contact_name || null, contact_phone: wForm.contact_phone || null }),
                })
                if (!res.ok) throw new Error('Failed')
                queryClient.invalidateQueries({ queryKey: adminKeys.warehouseList(showInactive) })
                setEditWarehouse(null)
              } catch { toastError('Failed to save warehouse') }
              finally { setWSaving(false) }
            }}
              className="px-4 py-2 rounded-lg bg-primary text-sm font-semibold text-zinc-900 hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {wSaving ? 'Saving…' : 'Save'}
            </button>
          </>
        }
      >
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1">Warehouse Name <span className="text-red-500">*</span></label>
          <input value={wForm.warehouse_name} onChange={e => setWForm(f => ({ ...f, warehouse_name: e.target.value }))}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white" />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1">Type</label>
          <select value={wForm.warehouse_type} onChange={e => setWForm(f => ({ ...f, warehouse_type: e.target.value as 'own'|'supplier'|'3pl' }))}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white">
            <option value="own">Own</option>
            <option value="supplier">Supplier</option>
            <option value="3pl">3PL</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1">State</label>
          <select value={wForm.state} onChange={e => setWForm(f => ({ ...f, state: e.target.value }))}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white">
            {['ACT','NSW','NT','QLD','SA','TAS','VIC','WA'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">Contact Name</label>
            <input value={wForm.contact_name} onChange={e => setWForm(f => ({ ...f, contact_name: e.target.value }))}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">Contact Phone</label>
            <input value={wForm.contact_phone} onChange={e => setWForm(f => ({ ...f, contact_phone: e.target.value }))}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-700">Is Active</span>
            <BoolToggle initial={wForm.is_active} onToggle={async next => setWForm(f => ({ ...f, is_active: next }))} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-700">Own Warehouse</span>
            <BoolToggle initial={wForm.is_own_warehouse} onToggle={async next => setWForm(f => ({ ...f, is_own_warehouse: next }))} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-700">Supplier Warehouse</span>
            <BoolToggle initial={wForm.is_supplier_warehouse} onToggle={async next => setWForm(f => ({ ...f, is_supplier_warehouse: next }))} />
          </div>
        </div>
      </Sheet>
    </div>
  )
}

