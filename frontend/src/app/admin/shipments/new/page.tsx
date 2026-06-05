'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AdminBreadcrumb } from '@/components/admin/AdminBreadcrumb'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toastError, toastSuccess } from '@/lib/toast'
import type { Warehouse } from '@/types/admin.types'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

const CLEARANCE_STATUSES = ['pending', 'cleared', 'delayed']

type CreateForm = {
  po_id:             string
  warehouse_id:      string
  container_number:  string
  vessel_name:       string
  booking_reference: string
  etd:               string
  eta:               string
  arrival_date:      string
  clearance_status:  string
  shipment_status:   string
}

const EMPTY_FORM: CreateForm = {
  po_id:             '',
  warehouse_id:      '',
  container_number:  '',
  vessel_name:       '',
  booking_reference: '',
  etd:               '',
  eta:               '',
  arrival_date:      '',
  clearance_status:  '',
  shipment_status:   'planned',
}

const sel = 'w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary'
const lbl = 'block text-sm font-medium text-zinc-700 mb-1'

async function getToken() {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.access_token ?? ''
}

export default function NewShipmentPage() {
  const router = useRouter()
  const [warehouses, setWarehouses] = useState<Pick<Warehouse, 'warehouse_id' | 'warehouse_name'>[]>([])
  const [form, setForm]             = useState<CreateForm>(EMPTY_FORM)
  const [saving, setSaving]         = useState(false)

  useEffect(() => { document.title = 'New Shipment | Tyre Vault' }, [])

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

  function setField<K extends keyof CreateForm>(k: K, v: CreateForm[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.warehouse_id) return toastError('Destination warehouse is required')

    setSaving(true)
    try {
      const tok = await getToken()
      const payload = {
        po_id:             form.po_id             || null,
        warehouse_id:      form.warehouse_id,
        container_number:  form.container_number  || null,
        vessel_name:       form.vessel_name       || null,
        booking_reference: form.booking_reference || null,
        etd:               form.etd               || null,
        eta:               form.eta               || null,
        arrival_date:      form.arrival_date       || null,
        clearance_status:  form.clearance_status  || null,
        shipment_status:   form.shipment_status,
      }
      const res = await fetch(`${API}/api/admin/shipments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? 'Create failed')
      }
      const data = await res.json()
      toastSuccess('Shipment created')
      router.push(`/admin/shipments/${data.shipment_id}`)
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Create failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-2xl">
      <AdminBreadcrumb crumbs={[
        { label: 'Shipments', href: '/admin/shipments' },
        { label: 'New Shipment' },
      ]} />

      <div>
        <h1 className="text-xl font-semibold text-zinc-900">New Shipment</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Create a container or freight shipment to track inbound stock</p>
      </div>

      <form onSubmit={handleCreate} className="space-y-6">

        {/* Core details */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 space-y-5">
          <h2 className="text-sm font-semibold text-zinc-700">Shipment Details</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Destination Warehouse <span className="text-red-500">*</span></label>
              <select value={form.warehouse_id} onChange={e => setField('warehouse_id', e.target.value)} className={sel} required>
                <option value="">Select warehouse…</option>
                {warehouses.map(w => <option key={w.warehouse_id} value={w.warehouse_id}>{w.warehouse_name}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Status</label>
              <select value={form.shipment_status} onChange={e => setField('shipment_status', e.target.value)} className={sel}>
                {['planned', 'shipped', 'arrived', 'received', 'cancelled'].map(s => (
                  <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={lbl}>Linked Purchase Order (PO ID)</label>
            <Input
              value={form.po_id}
              onChange={e => setField('po_id', e.target.value)}
              placeholder="Paste PO UUID (optional)…"
              className="font-mono text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Container Number</label>
              <Input value={form.container_number} onChange={e => setField('container_number', e.target.value)} placeholder="ABCU1234567" />
            </div>
            <div>
              <label className={lbl}>Vessel Name</label>
              <Input value={form.vessel_name} onChange={e => setField('vessel_name', e.target.value)} placeholder="MSC Daria" />
            </div>
          </div>

          <div>
            <label className={lbl}>Booking Reference</label>
            <Input value={form.booking_reference} onChange={e => setField('booking_reference', e.target.value)} placeholder="Forwarder booking ref" />
          </div>
        </div>

        {/* Dates */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 space-y-5">
          <h2 className="text-sm font-semibold text-zinc-700">Dates</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={lbl}>ETD (Departure)</label>
              <Input type="date" value={form.etd} onChange={e => setField('etd', e.target.value)} />
            </div>
            <div>
              <label className={lbl}>ETA (Arrival)</label>
              <Input type="date" value={form.eta} onChange={e => setField('eta', e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Actual Arrival</label>
              <Input type="date" value={form.arrival_date} onChange={e => setField('arrival_date', e.target.value)} />
            </div>
          </div>

          <div>
            <label className={lbl}>Clearance Status</label>
            <select value={form.clearance_status} onChange={e => setField('clearance_status', e.target.value)} className={sel}>
              <option value="">Not set</option>
              {CLEARANCE_STATUSES.map(c => (
                <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 pb-6">
          <Button type="button" variant="outline" onClick={() => router.push('/admin/shipments')} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Creating…' : 'Create Shipment'}
          </Button>
        </div>
      </form>
    </div>
  )
}

