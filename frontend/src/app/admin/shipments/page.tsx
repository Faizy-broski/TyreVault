'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AdminBreadcrumb } from '@/components/admin/AdminBreadcrumb'
import { BoxSpinner } from '@/components/ui/table-loader'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toastError, toastSuccess } from '@/lib/toast'
import { Plus, Trash2 } from 'lucide-react'
import type { ShipmentListItem } from '@/types/admin.types'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

const STATUSES = ['all', 'planned', 'shipped', 'arrived', 'received', 'cancelled']

const STATUS_STYLE: Record<string, string> = {
  planned:   'bg-zinc-100 text-zinc-600',
  shipped:   'bg-blue-50 text-blue-700',
  arrived:   'bg-purple-50 text-purple-700',
  received:  'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-700',
}

const CLEARANCE_STYLE: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  cleared: 'bg-green-50 text-green-700',
  delayed: 'bg-red-50 text-red-700',
}

async function getToken() {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.access_token ?? ''
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function ShipmentsPage() {
  const router = useRouter()

  const [shipments, setShipments] = useState<ShipmentListItem[]>([])
  const [total, setTotal]         = useState(0)
  const [loading, setLoading]     = useState(true)
  const [status, setStatus]       = useState('all')
  const [page, setPage]           = useState(1)

  const [deleteTarget, setDeleteTarget] = useState<ShipmentListItem | null>(null)
  const [deleting, setDeleting]         = useState(false)

  const LIMIT = 20

  const fetchShipments = useCallback(async () => {
    setLoading(true)
    try {
      const tok = await getToken()
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) })
      if (status !== 'all') params.set('status', status)
      const res = await fetch(`${API}/api/admin/shipments?${params}`, {
        headers: { Authorization: `Bearer ${tok}` },
      })
      if (!res.ok) throw new Error('Failed to load shipments')
      const json = await res.json()
      setShipments(json.data ?? [])
      setTotal(json.total ?? 0)
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [status, page])

  useEffect(() => { fetchShipments() }, [fetchShipments])
  useEffect(() => { document.title = 'Shipments | Tyre Vault' }, [])

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const tok = await getToken()
      const res = await fetch(`${API}/api/admin/shipments/${deleteTarget.shipment_id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tok}` },
      })
      if (!res.ok) throw new Error('Delete failed')
      toastSuccess('Shipment deleted')
      setDeleteTarget(null)
      fetchShipments()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <AdminBreadcrumb crumbs={[{ label: 'Shipments' }]} />
          <h1 className="mt-2 text-xl font-semibold text-zinc-900">Inbound Shipments</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Container & freight tracking from suppliers</p>
        </div>
        <Button onClick={() => router.push('/admin/shipments/new')} className="flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> New Shipment
        </Button>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 flex-wrap mb-4">
        {STATUSES.map(s => (
          <button
            key={s}
            type="button"
            onClick={() => { setStatus(s); setPage(1) }}
            className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
              status === s ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <BoxSpinner />
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Container</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vessel</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">PO</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Warehouse</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Clearance</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">ETD</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">ETA</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Arrived</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {shipments.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-10 text-center text-zinc-400">No shipments found</td></tr>
              )}
              {shipments.map(s => (
                <tr
                  key={s.shipment_id}
                  className="odd:bg-white even:bg-zinc-50 hover:!bg-zinc-200 transition-colors cursor-pointer"
                  onClick={() => router.push(`/admin/shipments/${s.shipment_id}`)}
                >
                  <td className="px-4 py-3 font-mono text-xs font-medium text-zinc-900">
                    {s.container_number ?? <span className="text-zinc-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 text-xs">{s.vessel_name ?? '—'}</td>
                  <td className="px-4 py-3 text-xs">
                    {s.purchase_orders
                      ? <span className="text-primary font-mono">{s.purchase_orders.po_number}</span>
                      : <span className="text-zinc-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">{s.warehouses?.warehouse_name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLE[s.shipment_status] ?? 'bg-zinc-100 text-zinc-600'}`}>
                      {s.shipment_status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {s.clearance_status
                      ? <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${CLEARANCE_STYLE[s.clearance_status] ?? 'bg-zinc-100 text-zinc-600'}`}>{s.clearance_status}</span>
                      : <span className="text-zinc-400 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">{fmtDate(s.etd)}</td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">{fmtDate(s.eta)}</td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">{fmtDate(s.arrival_date)}</td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    {['planned', 'cancelled'].includes(s.shipment_status) && (
                      <button type="button" onClick={() => setDeleteTarget(s)} className="text-zinc-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100">
              <span className="text-xs text-zinc-500">{total} total</span>
              <div className="flex gap-1">
                <button type="button" disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                  className="px-2 py-1 text-xs rounded border border-zinc-200 disabled:opacity-40 hover:bg-zinc-50">← Prev</button>
                <span className="px-2 py-1 text-xs text-zinc-500">{page} / {totalPages}</span>
                <button type="button" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                  className="px-2 py-1 text-xs rounded border border-zinc-200 disabled:opacity-40 hover:bg-zinc-50">Next →</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Shipment?</DialogTitle></DialogHeader>
          <p className="text-sm text-zinc-600 mt-1">
            Shipment <strong>{deleteTarget?.container_number ?? deleteTarget?.shipment_id.slice(0, 8)}</strong> will be permanently deleted.
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

