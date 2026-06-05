'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AdminBreadcrumb } from '@/components/admin/AdminBreadcrumb'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Pencil, Trash2, Plus, Save, Torus, CircleDot } from 'lucide-react'
import { toastSuccess, toastError } from '@/lib/toast'
import type {
  AdminVehicleDetail, VehicleTyreFitment, VehicleWheelFitment,
} from '@/types/admin.types'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

// ── Tyre Fitment Dialog ────────────────────────────────────────────────────────

type TyreForm = { front_size: string; rear_size: string; is_staggered: boolean; notes: string }
const EMPTY_TYRE: TyreForm = { front_size: '', rear_size: '', is_staggered: false, notes: '' }

function TyreFitmentDialog({
  open, onClose, initial, vehicleId, token, onSaved,
}: {
  open: boolean
  onClose: () => void
  initial: TyreForm & { fitment_id?: string }
  vehicleId: string
  token: string
  onSaved: (f: VehicleTyreFitment) => void
}) {
  const [form, setForm]   = useState<TyreForm>(initial)
  const [saving, setSaving] = useState(false)

  useEffect(() => { setForm(initial) }, [initial, open])

  async function handleSubmit() {
    if (!form.front_size.trim()) { toastError('Front size is required'); return }
    setSaving(true)
    try {
      const isEdit = Boolean(initial.fitment_id)
      const url = isEdit
        ? `${API}/api/admin/vehicles/${vehicleId}/tyre-fitments/${initial.fitment_id}`
        : `${API}/api/admin/vehicles/${vehicleId}/tyre-fitments`
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          front_size:   form.front_size.trim(),
          rear_size:    form.rear_size.trim()  || null,
          is_staggered: form.is_staggered,
          notes:        form.notes.trim()      || null,
        }),
      })
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error ?? `HTTP ${res.status}`) }
      const data = isEdit
        ? { fitment_id: initial.fitment_id!, vehicle_id: vehicleId, ...form, rear_size: form.rear_size || null, notes: form.notes || null } as VehicleTyreFitment
        : await res.json() as VehicleTyreFitment
      toastSuccess(isEdit ? 'Fitment updated' : 'Fitment added')
      onSaved(data)
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{initial.fitment_id ? 'Edit Tyre Fitment' : 'Add Tyre Fitment'}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium text-zinc-700">Front Size *</label>
            <Input className="mt-1" value={form.front_size} onChange={e => setForm(p => ({ ...p, front_size: e.target.value }))} placeholder="225/45R17" />
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-700">Rear Size</label>
            <Input className="mt-1" value={form.rear_size} onChange={e => setForm(p => ({ ...p, rear_size: e.target.value }))} placeholder="245/40R17 (if staggered)" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_staggered}
              onChange={e => setForm(p => ({ ...p, is_staggered: e.target.checked }))}
              className="rounded"
            />
            Staggered fitment (different front / rear)
          </label>
          <div>
            <label className="text-sm font-medium text-zinc-700">Notes</label>
            <Textarea className="mt-1" rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional OEM notes" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Wheel Fitment Dialog ───────────────────────────────────────────────────────

type WheelForm = { pcd: string; diameter_range: string; width_range: string; offset_min: string; offset_max: string; centre_bore: string; notes: string }
const EMPTY_WHEEL: WheelForm = { pcd: '', diameter_range: '', width_range: '', offset_min: '', offset_max: '', centre_bore: '', notes: '' }

function WheelFitmentDialog({
  open, onClose, initial, vehicleId, token, onSaved,
}: {
  open: boolean
  onClose: () => void
  initial: WheelForm & { fitment_id?: string }
  vehicleId: string
  token: string
  onSaved: (f: VehicleWheelFitment) => void
}) {
  const [form, setForm]   = useState<WheelForm>(initial)
  const [saving, setSaving] = useState(false)

  useEffect(() => { setForm(initial) }, [initial, open])

  async function handleSubmit() {
    if (!form.pcd.trim()) { toastError('PCD is required'); return }
    setSaving(true)
    try {
      const isEdit = Boolean(initial.fitment_id)
      const url = isEdit
        ? `${API}/api/admin/vehicles/${vehicleId}/wheel-fitments/${initial.fitment_id}`
        : `${API}/api/admin/vehicles/${vehicleId}/wheel-fitments`
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          pcd:            form.pcd.trim(),
          diameter_range: form.diameter_range.trim() || null,
          width_range:    form.width_range.trim()    || null,
          offset_min:     form.offset_min ? Number(form.offset_min) : null,
          offset_max:     form.offset_max ? Number(form.offset_max) : null,
          centre_bore:    form.centre_bore ? Number(form.centre_bore) : null,
          notes:          form.notes.trim() || null,
        }),
      })
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error ?? `HTTP ${res.status}`) }
      const data = isEdit
        ? { fitment_id: initial.fitment_id!, vehicle_id: vehicleId, pcd: form.pcd, diameter_range: form.diameter_range || null, width_range: form.width_range || null, offset_min: form.offset_min ? Number(form.offset_min) : null, offset_max: form.offset_max ? Number(form.offset_max) : null, centre_bore: form.centre_bore ? Number(form.centre_bore) : null, notes: form.notes || null } as VehicleWheelFitment
        : await res.json() as VehicleWheelFitment
      toastSuccess(isEdit ? 'Fitment updated' : 'Fitment added')
      onSaved(data)
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{initial.fitment_id ? 'Edit Wheel Fitment' : 'Add Wheel Fitment'}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium text-zinc-700">PCD *</label>
            <Input className="mt-1" value={form.pcd} onChange={e => setForm(p => ({ ...p, pcd: e.target.value }))} placeholder="5x114.3" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-zinc-700">Diameter Range</label>
              <Input className="mt-1" value={form.diameter_range} onChange={e => setForm(p => ({ ...p, diameter_range: e.target.value }))} placeholder="17-20" />
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-700">Width Range</label>
              <Input className="mt-1" value={form.width_range} onChange={e => setForm(p => ({ ...p, width_range: e.target.value }))} placeholder="8-9.5" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-zinc-700">Offset Min (ET)</label>
              <Input type="number" className="mt-1" value={form.offset_min} onChange={e => setForm(p => ({ ...p, offset_min: e.target.value }))} placeholder="30" />
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-700">Offset Max (ET)</label>
              <Input type="number" className="mt-1" value={form.offset_max} onChange={e => setForm(p => ({ ...p, offset_max: e.target.value }))} placeholder="45" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-700">Centre Bore (mm)</label>
            <Input type="number" step="0.1" className="mt-1" value={form.centre_bore} onChange={e => setForm(p => ({ ...p, centre_bore: e.target.value }))} placeholder="67.1" />
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-700">Notes</label>
            <Textarea className="mt-1" rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Tab = 'tyre' | 'wheel'

export default function VehicleDetailPage() {
  const { id }  = useParams<{ id: string }>()
  const router  = useRouter()

  const [vehicle, setVehicle] = useState<AdminVehicleDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken]     = useState('')
  const [tab, setTab]         = useState<Tab>('tyre')

  // Edit vehicle fields
  const [editForm, setEditForm] = useState<{
    make: string; model: string; year_from: string; year_to: string
    series: string; variant: string; body_type: string
  } | null>(null)
  const [saving, setSaving] = useState(false)

  // Tyre fitment dialog
  const [tyreDialogOpen, setTyreDialogOpen]   = useState(false)
  const [tyreInitial, setTyreInitial]         = useState<TyreForm & { fitment_id?: string }>(EMPTY_TYRE)
  const [deletingTyre, setDeletingTyre]       = useState<VehicleTyreFitment | null>(null)

  // Wheel fitment dialog
  const [wheelDialogOpen, setWheelDialogOpen] = useState(false)
  const [wheelInitial, setWheelInitial]       = useState<WheelForm & { fitment_id?: string }>(EMPTY_WHEEL)
  const [deletingWheel, setDeletingWheel]     = useState<VehicleWheelFitment | null>(null)

  const reload = useCallback(async (tok: string) => {
    const res = await fetch(`${API}/api/admin/vehicles/${id}`, {
      headers: { Authorization: `Bearer ${tok}` },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data: AdminVehicleDetail = await res.json()
    setVehicle(data)
    setEditForm({
      make:      data.make,
      model:     data.model,
      year_from: String(data.year_from),
      year_to:   data.year_to != null ? String(data.year_to) : '',
      series:    data.series    ?? '',
      variant:   data.variant   ?? '',
      body_type: data.body_type ?? '',
    })
  }, [id])

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data: { session } } = await createClient().auth.getSession()
      const tok = session?.access_token ?? ''
      setToken(tok)
      try { await reload(tok) }
      catch { toastError('Failed to load vehicle') }
      finally { setLoading(false) }
    }
    load()
  }, [id, reload])

  async function saveVehicle() {
    if (!editForm) return
    setSaving(true)
    try {
      const res = await fetch(`${API}/api/admin/vehicles/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          make:      editForm.make.trim(),
          model:     editForm.model.trim(),
          year_from: Number(editForm.year_from),
          year_to:   editForm.year_to ? Number(editForm.year_to)  : null,
          series:    editForm.series.trim()    || null,
          variant:   editForm.variant.trim()   || null,
          body_type: editForm.body_type.trim() || null,
        }),
      })
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error ?? `HTTP ${res.status}`) }
      toastSuccess('Vehicle updated')
      await reload(token)
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  async function deleteVehicle() {
    if (!vehicle) return
    if (!confirm(`Delete ${vehicle.make} ${vehicle.model}? All fitments will also be deleted.`)) return
    try {
      const res = await fetch(`${API}/api/admin/vehicles/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error ?? `HTTP ${res.status}`) }
      toastSuccess('Vehicle deleted')
      router.push('/admin/vehicles')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  // ── Tyre fitment handlers ─────────────────────────────────────────────────

  function handleTyreSaved(f: VehicleTyreFitment) {
    setVehicle(prev => {
      if (!prev) return prev
      const list = prev.vehicle_tyre_fitments ?? []
      const idx = list.findIndex(x => x.fitment_id === f.fitment_id)
      return {
        ...prev,
        vehicle_tyre_fitments: idx >= 0
          ? list.map((x, i) => i === idx ? f : x)
          : [...list, f],
      }
    })
    setTyreDialogOpen(false)
  }

  async function confirmDeleteTyre() {
    if (!deletingTyre) return
    try {
      const res = await fetch(`${API}/api/admin/vehicles/${id}/tyre-fitments/${deletingTyre.fitment_id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error ?? `HTTP ${res.status}`) }
      setVehicle(prev => prev ? { ...prev, vehicle_tyre_fitments: prev.vehicle_tyre_fitments.filter(f => f.fitment_id !== deletingTyre.fitment_id) } : prev)
      toastSuccess('Fitment deleted')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setDeletingTyre(null)
    }
  }

  // ── Wheel fitment handlers ────────────────────────────────────────────────

  function handleWheelSaved(f: VehicleWheelFitment) {
    setVehicle(prev => {
      if (!prev) return prev
      const list = prev.vehicle_wheel_fitments ?? []
      const idx = list.findIndex(x => x.fitment_id === f.fitment_id)
      return {
        ...prev,
        vehicle_wheel_fitments: idx >= 0
          ? list.map((x, i) => i === idx ? f : x)
          : [...list, f],
      }
    })
    setWheelDialogOpen(false)
  }

  async function confirmDeleteWheel() {
    if (!deletingWheel) return
    try {
      const res = await fetch(`${API}/api/admin/vehicles/${id}/wheel-fitments/${deletingWheel.fitment_id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error ?? `HTTP ${res.status}`) }
      setVehicle(prev => prev ? { ...prev, vehicle_wheel_fitments: prev.vehicle_wheel_fitments.filter(f => f.fitment_id !== deletingWheel.fitment_id) } : prev)
      toastSuccess('Fitment deleted')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setDeletingWheel(null)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="h-8 w-48 bg-zinc-100 rounded animate-pulse mb-6" />
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-28 bg-zinc-100 rounded-xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  if (!vehicle || !editForm) {
    return (
      <div className="p-4 sm:p-6">
        <AdminBreadcrumb crumbs={[{ label: 'Vehicles', href: '/admin/vehicles' }, { label: 'Vehicle' }]} />
        <p className="mt-6 text-sm text-zinc-500">Vehicle not found.</p>
      </div>
    )
  }

  const tyreFitments  = vehicle.vehicle_tyre_fitments  ?? []
  const wheelFitments = vehicle.vehicle_wheel_fitments ?? []

  return (
    <div className="p-4 sm:p-6 max-w-4xl">
      <AdminBreadcrumb crumbs={[
        { label: 'Vehicles', href: '/admin/vehicles' },
        { label: `${vehicle.make} ${vehicle.model}` },
      ]} />

      {/* Header */}
      <div className="mt-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            {vehicle.make} {vehicle.model}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            {vehicle.year_from}{vehicle.year_to ? `–${vehicle.year_to}` : '+'}{vehicle.series ? ` · ${vehicle.series}` : ''}{vehicle.variant ? ` · ${vehicle.variant}` : ''}
          </p>
        </div>
        <Button variant="destructive" size="sm" onClick={deleteVehicle}>Delete Vehicle</Button>
      </div>

      {/* Edit card */}
      <div className="mt-6 rounded-xl border border-zinc-200 p-6">
        <h2 className="text-base font-semibold text-zinc-800 mb-4">Vehicle Details</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-zinc-700">Make</label>
            <Input className="mt-1" value={editForm.make} onChange={e => setEditForm(p => p ? { ...p, make: e.target.value } : p)} />
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-700">Model</label>
            <Input className="mt-1" value={editForm.model} onChange={e => setEditForm(p => p ? { ...p, model: e.target.value } : p)} />
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-700">Body Type</label>
            <Input className="mt-1" value={editForm.body_type} onChange={e => setEditForm(p => p ? { ...p, body_type: e.target.value } : p)} placeholder="Ute, SUV…" />
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-700">Year From</label>
            <Input type="number" className="mt-1" value={editForm.year_from} onChange={e => setEditForm(p => p ? { ...p, year_from: e.target.value } : p)} />
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-700">Year To</label>
            <Input type="number" className="mt-1" value={editForm.year_to} onChange={e => setEditForm(p => p ? { ...p, year_to: e.target.value } : p)} placeholder="blank = current" />
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-700">Series</label>
            <Input className="mt-1" value={editForm.series} onChange={e => setEditForm(p => p ? { ...p, series: e.target.value } : p)} placeholder="SR5" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium text-zinc-700">Variant / Trim</label>
            <Input className="mt-1" value={editForm.variant} onChange={e => setEditForm(p => p ? { ...p, variant: e.target.value } : p)} placeholder="4x4 Dual Cab" />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={saveVehicle} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Fitment Tabs */}
      <div className="mt-8">
        <div className="flex gap-1 border-b border-zinc-200 mb-6">
          <button
            onClick={() => setTab('tyre')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'tyre' ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}
          >
            <CircleDot className="h-4 w-4" />
            Tyre Fitments <span className="ml-1 text-xs text-zinc-400">({tyreFitments.length})</span>
          </button>
          <button
            onClick={() => setTab('wheel')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'wheel' ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}
          >
            <Torus className="h-4 w-4" />
            Wheel Fitments <span className="ml-1 text-xs text-zinc-400">({wheelFitments.length})</span>
          </button>
        </div>

        {/* Tyre fitments tab */}
        {tab === 'tyre' && (
          <div>
            <div className="flex justify-end mb-3">
              <Button size="sm" className="gap-2" onClick={() => { setTyreInitial(EMPTY_TYRE); setTyreDialogOpen(true) }}>
                <Plus className="h-4 w-4" /> Add Tyre Fitment
              </Button>
            </div>
            {tyreFitments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-400">
                No tyre fitments recorded. Add the OEM tyre size for this vehicle.
              </div>
            ) : (
              <div className="rounded-xl border border-zinc-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wide">
                    <tr>
                      <th className="px-4 py-3 text-left">Front Size</th>
                      <th className="px-4 py-3 text-left">Rear Size</th>
                      <th className="px-4 py-3 text-left">Staggered</th>
                      <th className="px-4 py-3 text-left">Notes</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {tyreFitments.map(f => (
                      <tr key={f.fitment_id} className="even:bg-zinc-50/50 hover:bg-amber-50/40 transition-colors">
                        <td className="px-4 py-3 font-medium text-zinc-900">{f.front_size}</td>
                        <td className="px-4 py-3 text-zinc-600">{f.rear_size ?? '—'}</td>
                        <td className="px-4 py-3 text-zinc-600">{f.is_staggered ? 'Yes' : 'No'}</td>
                        <td className="px-4 py-3 text-zinc-500 max-w-xs truncate">{f.notes ?? '—'}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => {
                              setTyreInitial({ fitment_id: f.fitment_id, front_size: f.front_size, rear_size: f.rear_size ?? '', is_staggered: f.is_staggered, notes: f.notes ?? '' })
                              setTyreDialogOpen(true)
                            }}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => setDeletingTyre(f)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Wheel fitments tab */}
        {tab === 'wheel' && (
          <div>
            <div className="flex justify-end mb-3">
              <Button size="sm" className="gap-2" onClick={() => { setWheelInitial(EMPTY_WHEEL); setWheelDialogOpen(true) }}>
                <Plus className="h-4 w-4" /> Add Wheel Fitment
              </Button>
            </div>
            {wheelFitments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-400">
                No wheel fitments recorded. Add the compatible wheel specs for this vehicle.
              </div>
            ) : (
              <div className="rounded-xl border border-zinc-200 overflow-x-auto">
                <table className="w-full text-sm whitespace-nowrap">
                  <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wide">
                    <tr>
                      <th className="px-4 py-3 text-left">PCD</th>
                      <th className="px-4 py-3 text-left">Diameter</th>
                      <th className="px-4 py-3 text-left">Width</th>
                      <th className="px-4 py-3 text-left">Offset Range</th>
                      <th className="px-4 py-3 text-left">Centre Bore</th>
                      <th className="px-4 py-3 text-left">Notes</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {wheelFitments.map(f => (
                      <tr key={f.fitment_id} className="even:bg-zinc-50/50 hover:bg-amber-50/40 transition-colors">
                        <td className="px-4 py-3 font-medium text-zinc-900">{f.pcd}</td>
                        <td className="px-4 py-3 text-zinc-600">{f.diameter_range ?? '—'}</td>
                        <td className="px-4 py-3 text-zinc-600">{f.width_range ?? '—'}</td>
                        <td className="px-4 py-3 text-zinc-600">
                          {f.offset_min != null && f.offset_max != null
                            ? `ET${f.offset_min}–ET${f.offset_max}`
                            : f.offset_min != null ? `ET${f.offset_min}+`
                            : f.offset_max != null ? `≤ET${f.offset_max}`
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-zinc-500">{f.centre_bore ?? '—'}</td>
                        <td className="px-4 py-3 text-zinc-500 max-w-xs truncate">{f.notes ?? '—'}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => {
                              setWheelInitial({ fitment_id: f.fitment_id, pcd: f.pcd, diameter_range: f.diameter_range ?? '', width_range: f.width_range ?? '', offset_min: f.offset_min != null ? String(f.offset_min) : '', offset_max: f.offset_max != null ? String(f.offset_max) : '', centre_bore: f.centre_bore != null ? String(f.centre_bore) : '', notes: f.notes ?? '' })
                              setWheelDialogOpen(true)
                            }}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => setDeletingWheel(f)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <TyreFitmentDialog
        open={tyreDialogOpen}
        onClose={() => setTyreDialogOpen(false)}
        initial={tyreInitial}
        vehicleId={id}
        token={token}
        onSaved={handleTyreSaved}
      />
      <WheelFitmentDialog
        open={wheelDialogOpen}
        onClose={() => setWheelDialogOpen(false)}
        initial={wheelInitial}
        vehicleId={id}
        token={token}
        onSaved={handleWheelSaved}
      />

      {/* Delete confirms */}
      <Dialog open={Boolean(deletingTyre)} onOpenChange={v => { if (!v) setDeletingTyre(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Tyre Fitment</DialogTitle></DialogHeader>
          <p className="text-sm text-zinc-600 py-2">Delete fitment for <strong>{deletingTyre?.front_size}</strong>?</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeletingTyre(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDeleteTyre}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deletingWheel)} onOpenChange={v => { if (!v) setDeletingWheel(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Wheel Fitment</DialogTitle></DialogHeader>
          <p className="text-sm text-zinc-600 py-2">Delete wheel fitment for PCD <strong>{deletingWheel?.pcd}</strong>?</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeletingWheel(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDeleteWheel}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
