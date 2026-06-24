'use client'

import { useState, useEffect } from 'react'
import { Sheet } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { toastSuccess, toastError } from '@/lib/toast'
import type { Shipment, ShipmentListItem, Warehouse } from '@/types/admin.types'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

type AnyShipment = Shipment | ShipmentListItem

type FormState = {
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

const EMPTY_FORM: FormState = {
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

interface Props {
  open:     boolean
  onClose:  () => void
  onSaved:  () => void
  shipment?: AnyShipment | null
}

function getWarehouseId(s: AnyShipment): string {
  return s.warehouses?.warehouse_id ?? ''
}

function getPoId(s: AnyShipment): string {
  return s.purchase_orders?.po_id ?? ''
}

export function ShipmentSheet({ open, onClose, onSaved, shipment }: Props) {
  const isEdit = !!shipment
  const [form, setForm]         = useState<FormState>(EMPTY_FORM)
  const [warehouses, setWarehouses] = useState<Pick<Warehouse, 'warehouse_id' | 'warehouse_name'>[]>([])
  const [saving, setSaving]     = useState(false)

  useEffect(() => {
    async function load() {
      const tok = await getToken()
      const res = await fetch(`${API}/api/admin/orders/warehouses?all=true`, {
        headers: { Authorization: `Bearer ${tok}` },
      })
      if (res.ok) setWarehouses(await res.json())
    }
    load()
  }, [])

  useEffect(() => {
    if (shipment) {
      setForm({
        po_id:             getPoId(shipment),
        warehouse_id:      getWarehouseId(shipment),
        container_number:  shipment.container_number  ?? '',
        vessel_name:       shipment.vessel_name       ?? '',
        booking_reference: shipment.booking_reference ?? '',
        etd:               shipment.etd?.slice(0, 10)           ?? '',
        eta:               shipment.eta?.slice(0, 10)           ?? '',
        arrival_date:      shipment.arrival_date?.slice(0, 10)  ?? '',
        clearance_status:  shipment.clearance_status            ?? '',
        shipment_status:   shipment.shipment_status,
      })
    } else {
      setForm(EMPTY_FORM)
    }
  }, [shipment])

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleSave() {
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
      const url    = isEdit ? `${API}/api/admin/shipments/${(shipment as Shipment).shipment_id}` : `${API}/api/admin/shipments`
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? 'Save failed')
      }
      toastSuccess(isEdit ? 'Shipment updated' : 'Shipment created')
      onSaved()
      onClose()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Shipment' : 'New Shipment'}
      width="w-full max-w-xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Shipment'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-3">Shipment Details</p>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className={lbl}>Destination Warehouse <span className="text-red-500">*</span></label>
              <select value={form.warehouse_id} onChange={e => set('warehouse_id', e.target.value)} className={sel}>
                <option value="">Select warehouse…</option>
                {warehouses.map(w => <option key={w.warehouse_id} value={w.warehouse_id}>{w.warehouse_name}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Status</label>
              <select value={form.shipment_status} onChange={e => set('shipment_status', e.target.value)} className={sel}>
                {['planned', 'shipped', 'arrived', 'received', 'cancelled'].map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className={lbl}>Linked Purchase Order (PO ID)</label>
            <Input
              value={form.po_id}
              onChange={e => set('po_id', e.target.value)}
              placeholder="Paste PO UUID (optional)…"
              className="font-mono text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className={lbl}>Container Number</label>
              <Input value={form.container_number} onChange={e => set('container_number', e.target.value)} placeholder="ABCU1234567" />
            </div>
            <div>
              <label className={lbl}>Vessel Name</label>
              <Input value={form.vessel_name} onChange={e => set('vessel_name', e.target.value)} placeholder="MSC Daria" />
            </div>
          </div>

          <div>
            <label className={lbl}>Booking Reference</label>
            <Input value={form.booking_reference} onChange={e => set('booking_reference', e.target.value)} placeholder="Forwarder booking ref" />
          </div>
        </div>

        <div className="border-t border-zinc-100 pt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-3">Dates</p>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className={lbl}>ETD (Departure)</label>
              <Input type="date" value={form.etd} onChange={e => set('etd', e.target.value)} />
            </div>
            <div>
              <label className={lbl}>ETA (Arrival)</label>
              <Input type="date" value={form.eta} onChange={e => set('eta', e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Actual Arrival</label>
              <Input type="date" value={form.arrival_date} onChange={e => set('arrival_date', e.target.value)} />
            </div>
          </div>

          <div>
            <label className={lbl}>Clearance Status</label>
            <select value={form.clearance_status} onChange={e => set('clearance_status', e.target.value)} className={sel}>
              <option value="">Not set</option>
              {['pending', 'cleared', 'delayed'].map(c => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </Sheet>
  )
}
