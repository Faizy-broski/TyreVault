'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AdminBreadcrumb } from '@/components/admin/AdminBreadcrumb'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toastError, toastSuccess } from '@/lib/toast'
import { Pencil, ArrowLeft } from 'lucide-react'
import type { Shipment, ShipmentStatus, ClearanceStatus, Warehouse } from '@/types/admin.types'

const API = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

const STATUS_FLOW: ShipmentStatus[] = ['planned', 'shipped', 'arrived', 'received', 'cancelled']

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

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-2.5 border-b border-zinc-100 last:border-0">
      <span className="w-40 flex-shrink-0 text-xs text-zinc-500">{label}</span>
      <span className="text-sm text-zinc-800">{value ?? '—'}</span>
    </div>
  )
}

type EditForm = {
  container_number:  string
  vessel_name:       string
  booking_reference: string
  etd:               string
  eta:               string
  arrival_date:      string
  clearance_status:  string
  warehouse_id:      string
}

export default function ShipmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()

  const [shipment, setShipment] = useState<Shipment | null>(null)
  const [loading, setLoading]   = useState(true)
  const [token, setToken]       = useState('')

  const [warehouses, setWarehouses] = useState<Pick<Warehouse, 'warehouse_id' | 'warehouse_name'>[]>([])

  const [editOpen, setEditOpen]   = useState(false)
  const [editForm, setEditForm]   = useState<EditForm>({
    container_number: '', vessel_name: '', booking_reference: '',
    etd: '', eta: '', arrival_date: '', clearance_status: '', warehouse_id: '',
  })
  const [saving, setSaving] = useState(false)

  const [statusUpdating, setStatusUpdating] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const tok = await getToken()
      setToken(tok)
      const res = await fetch(`${API}/api/admin/shipments/${id}`, {
        headers: { Authorization: `Bearer ${tok}` },
      })
      if (!res.ok) throw new Error('Failed to load shipment')
      const data = await res.json()
      setShipment(data)
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    document.title = shipment ? `${shipment.container_number ?? 'Shipment'} | Tyre Vault` : 'Shipment | Tyre Vault'
  }, [shipment])

  useEffect(() => {
    async function loadMeta() {
      const tok = await getToken()
      const res = await fetch(`${API}/api/admin/orders/warehouses?all=true`, {
        headers: { Authorization: `Bearer ${tok}` },
      })
      if (res.ok) setWarehouses(await res.json())
    }
    loadMeta()
  }, [])

  function openEdit() {
    if (!shipment) return
    setEditForm({
      container_number:  shipment.container_number  ?? '',
      vessel_name:       shipment.vessel_name       ?? '',
      booking_reference: shipment.booking_reference ?? '',
      etd:               shipment.etd?.slice(0, 10)        ?? '',
      eta:               shipment.eta?.slice(0, 10)        ?? '',
      arrival_date:      shipment.arrival_date?.slice(0, 10) ?? '',
      clearance_status:  shipment.clearance_status  ?? '',
      warehouse_id:      shipment.warehouses?.warehouse_id ?? '',
    })
    setEditOpen(true)
  }

  async function handleSaveEdit() {
    if (!shipment) return
    setSaving(true)
    try {
      const res = await fetch(`${API}/api/admin/shipments/${shipment.shipment_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          container_number:  editForm.container_number  || null,
          vessel_name:       editForm.vessel_name       || null,
          booking_reference: editForm.booking_reference || null,
          etd:               editForm.etd               || null,
          eta:               editForm.eta               || null,
          arrival_date:      editForm.arrival_date       || null,
          clearance_status:  editForm.clearance_status  || null,
          warehouse_id:      editForm.warehouse_id       || undefined,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Update failed')
      }
      toastSuccess('Shipment updated')
      setEditOpen(false)
      load()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(newStatus: ShipmentStatus) {
    if (!shipment || statusUpdating) return
    setStatusUpdating(true)
    try {
      const res = await fetch(`${API}/api/admin/shipments/${shipment.shipment_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ shipment_status: newStatus }),
      })
      if (!res.ok) throw new Error('Status update failed')
      toastSuccess(`Status → ${newStatus}`)
      setShipment(prev => prev ? { ...prev, shipment_status: newStatus } : prev)
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setStatusUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="h-8 w-48 bg-zinc-100 rounded animate-pulse mb-6" />
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-32 bg-zinc-100 rounded-xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  if (!shipment) {
    return (
      <div className="p-4 sm:p-6">
        <AdminBreadcrumb crumbs={[{ label: 'Shipments', href: '/admin/shipments' }, { label: 'Not Found' }]} />
        <p className="mt-6 text-sm text-zinc-500">Shipment not found.</p>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <AdminBreadcrumb crumbs={[
          { label: 'Shipments', href: '/admin/shipments' },
          { label: shipment.container_number ?? shipment.shipment_id.slice(0, 8) },
        ]} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main card */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-zinc-200 p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-lg font-semibold text-zinc-900">
                  {shipment.container_number ?? <span className="text-zinc-400">No container number</span>}
                </h1>
                {shipment.vessel_name && (
                  <p className="text-sm text-zinc-500 mt-0.5">{shipment.vessel_name}</p>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={openEdit} className="flex items-center gap-1.5">
                <Pencil className="w-3.5 h-3.5" /> Edit
              </Button>
            </div>

            <Field label="Booking Reference" value={shipment.booking_reference} />
            <Field label="Destination Warehouse" value={shipment.warehouses?.warehouse_name} />
            <Field label="ETD (Estimated Departure)" value={fmtDate(shipment.etd)} />
            <Field label="ETA (Estimated Arrival)" value={fmtDate(shipment.eta)} />
            <Field label="Actual Arrival" value={fmtDate(shipment.arrival_date)} />
            <Field label="Clearance Status" value={
              shipment.clearance_status
                ? <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${CLEARANCE_STYLE[shipment.clearance_status]}`}>
                    {shipment.clearance_status}
                  </span>
                : '—'
            } />
            <Field label="Created" value={fmtDate(shipment.created_at)} />
          </div>

          {/* Linked PO */}
          {shipment.purchase_orders && (
            <div className="bg-white rounded-xl border border-zinc-200 p-5">
              <h2 className="text-sm font-semibold text-zinc-700 mb-3">Linked Purchase Order</h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono font-medium text-zinc-900">{shipment.purchase_orders.po_number}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {shipment.purchase_orders.suppliers?.supplier_name ?? '—'} · Ordered {fmtDate(shipment.purchase_orders.order_date)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/admin/purchase-orders/${shipment.purchase_orders!.po_id}`)}
                >
                  View PO →
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status card */}
          <div className="bg-white rounded-xl border border-zinc-200 p-5">
            <h2 className="text-sm font-semibold text-zinc-700 mb-3">Shipment Status</h2>
            <div className="flex items-center gap-2 mb-4">
              <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium capitalize ${STATUS_STYLE[shipment.shipment_status]}`}>
                {shipment.shipment_status}
              </span>
            </div>

            <p className="text-xs text-zinc-500 mb-2">Transition to:</p>
            <div className="flex flex-col gap-1.5">
              {STATUS_FLOW.filter(s => s !== shipment.shipment_status).map(s => (
                <button
                  key={s}
                  type="button"
                  disabled={statusUpdating}
                  onClick={() => handleStatusChange(s)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium capitalize border transition-colors hover:opacity-80 disabled:opacity-40 ${STATUS_STYLE[s]}`}
                >
                  → {s}
                </button>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-xl border border-zinc-200 p-5">
            <h2 className="text-sm font-semibold text-zinc-700 mb-3">Timeline</h2>
            <div className="space-y-3">
              {[
                { label: 'ETD', date: shipment.etd, done: !!shipment.etd },
                { label: 'ETA', date: shipment.eta, done: !!shipment.arrival_date },
                { label: 'Arrived', date: shipment.arrival_date, done: !!shipment.arrival_date },
                { label: 'Cleared', date: null, done: shipment.clearance_status === 'cleared' },
                { label: 'Received', date: null, done: shipment.shipment_status === 'received' },
              ].map(step => (
                <div key={step.label} className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    step.done ? 'border-green-500 bg-green-500' : 'border-zinc-300 bg-white'
                  }`}>
                    {step.done && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className={`text-xs font-medium ${step.done ? 'text-zinc-800' : 'text-zinc-400'}`}>{step.label}</p>
                    {step.date && <p className="text-xs text-zinc-400">{fmtDate(step.date)}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Shipment</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Destination Warehouse</label>
              <select value={editForm.warehouse_id} onChange={e => setEditForm(f => ({ ...f, warehouse_id: e.target.value }))}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">Select warehouse…</option>
                {warehouses.map(w => <option key={w.warehouse_id} value={w.warehouse_id}>{w.warehouse_name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Container Number</label>
                <Input value={editForm.container_number} onChange={e => setEditForm(f => ({ ...f, container_number: e.target.value }))} placeholder="ABCU1234567" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Vessel Name</label>
                <Input value={editForm.vessel_name} onChange={e => setEditForm(f => ({ ...f, vessel_name: e.target.value }))} placeholder="MSC Daria" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Booking Reference</label>
              <Input value={editForm.booking_reference} onChange={e => setEditForm(f => ({ ...f, booking_reference: e.target.value }))} placeholder="Forwarder booking ref" />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">ETD</label>
                <Input type="date" value={editForm.etd} onChange={e => setEditForm(f => ({ ...f, etd: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">ETA</label>
                <Input type="date" value={editForm.eta} onChange={e => setEditForm(f => ({ ...f, eta: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Actual Arrival</label>
                <Input type="date" value={editForm.arrival_date} onChange={e => setEditForm(f => ({ ...f, arrival_date: e.target.value }))} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Clearance Status</label>
              <select value={editForm.clearance_status} onChange={e => setEditForm(f => ({ ...f, clearance_status: e.target.value }))}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">Not set</option>
                <option value="pending">Pending</option>
                <option value="cleared">Cleared</option>
                <option value="delayed">Delayed</option>
              </select>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="button" disabled={saving} onClick={handleSaveEdit}>
                {saving ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
