'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AdminBreadcrumb } from '@/components/admin/AdminBreadcrumb'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PurchaseOrderSheet } from '@/components/admin/purchase-orders/PurchaseOrderSheet'
import { toastError, toastSuccess } from '@/lib/toast'
import { Plus, Trash2 } from 'lucide-react'
import type { PurchaseOrderListItem } from '@/types/admin.types'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
const LIMIT = 20

const PO_STATUSES = ['all', 'draft', 'ordered', 'shipped', 'arrived', 'received', 'cancelled']

const STATUS_STYLE: Record<string, string> = {
  draft:     'bg-zinc-100 text-zinc-600',
  ordered:   'bg-blue-50 text-blue-700',
  shipped:   'bg-amber-50 text-amber-700',
  arrived:   'bg-purple-50 text-purple-700',
  received:  'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-700',
}

function fmt(n: number | null | undefined, currency = 'AUD') {
  if (n == null) return '—'
  return `${currency} ${Number(n).toFixed(2)}`
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

type Props = {
  accessToken: string
  pos: PurchaseOrderListItem[]
  total: number
  totalPages: number
  page: number
  status: string
}

export default function PurchaseOrdersClient({ accessToken, pos, total, totalPages, page, status }: Props) {
  const router = useRouter()

  const [sheetOpen, setSheetOpen]       = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<PurchaseOrderListItem | null>(null)
  const [deleting, setDeleting]         = useState(false)

  function navTo(nextStatus: string, nextPage: number) {
    const params = new URLSearchParams({ status: nextStatus, page: String(nextPage) })
    router.push(`/admin/purchase-orders?${params}`)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`${API}/api/admin/purchase-orders/${deleteTarget.po_id}`, {
        method:  'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) throw new Error('Delete failed')
      toastSuccess('Purchase order deleted')
      setDeleteTarget(null)
      router.refresh()
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
          <AdminBreadcrumb crumbs={[{ label: 'Purchase Orders' }]} />
          <h1 className="mt-2 text-xl font-semibold text-zinc-900">Purchase Orders</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Inbound stock orders from suppliers</p>
        </div>
        <Button onClick={() => setSheetOpen(true)} className="flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> New PO
        </Button>
      </div>

      {/* Status filter */}
      <div className="flex gap-1 flex-wrap mb-4">
        {PO_STATUSES.map(s => (
          <button
            key={s}
            type="button"
            onClick={() => navTo(s, 1)}
            className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
              status === s ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">PO Number</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Supplier</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Warehouse</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Order Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">ETA</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Items</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {pos.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-10 text-center text-zinc-400">No purchase orders found</td></tr>
            )}
            {pos.map(po => (
              <tr
                key={po.po_id}
                className="odd:bg-white even:bg-zinc-50 hover:!bg-zinc-200 transition-colors cursor-pointer"
                onClick={() => router.push(`/admin/purchase-orders/${po.po_id}`)}
              >
                <td className="px-4 py-3 font-mono text-xs font-medium text-zinc-900">{po.po_number}</td>
                <td className="px-4 py-3 text-zinc-700">{po.suppliers?.supplier_name ?? '—'}</td>
                <td className="px-4 py-3 text-zinc-500 text-xs">{po.warehouses?.warehouse_name ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLE[po.po_status] ?? 'bg-zinc-100 text-zinc-600'}`}>
                    {po.po_status}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-500 text-xs">{fmtDate(po.order_date)}</td>
                <td className="px-4 py-3 text-zinc-500 text-xs">{fmtDate(po.eta_date)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-zinc-700">{po.purchase_order_items?.length ?? 0}</td>
                <td className="px-4 py-3 text-right tabular-nums font-medium text-zinc-900">{fmt(po.total_cost, po.currency)}</td>
                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                  {po.po_status === 'draft' && (
                    <button type="button" onClick={() => setDeleteTarget(po)} className="text-zinc-400 hover:text-red-600">
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
              <button type="button" disabled={page <= 1} onClick={() => navTo(status, page - 1)}
                className="px-2 py-1 text-xs rounded border border-zinc-200 disabled:opacity-40 hover:bg-zinc-50">← Prev</button>
              <span className="px-2 py-1 text-xs text-zinc-500">{page} / {totalPages}</span>
              <button type="button" disabled={page >= totalPages} onClick={() => navTo(status, page + 1)}
                className="px-2 py-1 text-xs rounded border border-zinc-200 disabled:opacity-40 hover:bg-zinc-50">Next →</button>
            </div>
          </div>
        )}
      </div>

      <PurchaseOrderSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSaved={d => { setSheetOpen(false); if (d.po_id) router.push(`/admin/purchase-orders/${d.po_id}`) }}
      />

      <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Purchase Order?</DialogTitle></DialogHeader>
          <p className="text-sm text-zinc-600 mt-1">
            <strong>{deleteTarget?.po_number}</strong> will be permanently deleted. Only draft POs can be deleted.
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
