'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AdminBreadcrumb } from '@/components/admin/AdminBreadcrumb'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2 } from 'lucide-react'
import { toastSuccess, toastError } from '@/lib/toast'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

// ── Row types ─────────────────────────────────────────────────────────────────

type TyreRow = {
  _key:         number
  front_size:   string
  rear_size:    string
  is_staggered: boolean
  notes:        string
}

type WheelRow = {
  _key:          number
  pcd:           string
  diameter_range: string
  width_range:   string
  offset_min:    string
  offset_max:    string
  centre_bore:   string
  notes:         string
}

let _tyreKey  = 1
let _wheelKey = 1

function newTyreRow(): TyreRow {
  return { _key: _tyreKey++, front_size: '', rear_size: '', is_staggered: false, notes: '' }
}
function newWheelRow(): WheelRow {
  return { _key: _wheelKey++, pcd: '', diameter_range: '', width_range: '', offset_min: '', offset_max: '', centre_bore: '', notes: '' }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NewVehiclePage() {
  const router = useRouter()

  const [token, setToken]   = useState('')
  const [saving, setSaving] = useState(false)

  // Vehicle fields
  const [make,     setMake]     = useState('')
  const [model,    setModel]    = useState('')
  const [yearFrom, setYearFrom] = useState('')
  const [yearTo,   setYearTo]   = useState('')
  const [series,   setSeries]   = useState('')
  const [variant,  setVariant]  = useState('')
  const [bodyType, setBodyType] = useState('')

  // Fitment rows
  const [tyreRows,  setTyreRows]  = useState<TyreRow[]>([])
  const [wheelRows, setWheelRows] = useState<WheelRow[]>([])

  useEffect(() => {
    createClient().auth.getSession().then(({ data: { session } }) => {
      setToken(session?.access_token ?? '')
    })
  }, [])

  // ── Tyre row helpers ───────────────────────────────────────────────────────

  function updateTyre(key: number, field: keyof Omit<TyreRow, '_key'>, val: string | boolean) {
    setTyreRows(prev => prev.map(r => r._key === key ? { ...r, [field]: val } : r))
  }

  // ── Wheel row helpers ──────────────────────────────────────────────────────

  function updateWheel(key: number, field: keyof Omit<WheelRow, '_key'>, val: string) {
    setWheelRows(prev => prev.map(r => r._key === key ? { ...r, [field]: val } : r))
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!make.trim())  { toastError('Make is required'); return }
    if (!model.trim()) { toastError('Model is required'); return }
    if (!yearFrom)     { toastError('Year From is required'); return }

    // Validate tyre rows that have been started
    const filledTyres = tyreRows.filter(r => r.front_size.trim())
    for (const r of filledTyres) {
      if (!r.front_size.trim()) { toastError('Tyre fitment: Front size is required'); return }
    }

    // Validate wheel rows that have been started
    const filledWheels = wheelRows.filter(r => r.pcd.trim())
    for (const r of filledWheels) {
      if (!r.pcd.trim()) { toastError('Wheel fitment: PCD is required'); return }
    }

    setSaving(true)
    try {
      // 1. Create vehicle
      const vRes = await fetch(`${API}/api/admin/vehicles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          make:      make.trim(),
          model:     model.trim(),
          year_from: Number(yearFrom),
          year_to:   yearTo ? Number(yearTo) : null,
          series:    series.trim()   || null,
          variant:   variant.trim()  || null,
          body_type: bodyType.trim() || null,
        }),
      })
      if (!vRes.ok) {
        const b = await vRes.json().catch(() => ({}))
        throw new Error(b.error ?? `HTTP ${vRes.status}`)
      }
      const vehicle = await vRes.json()
      const vehicleId = vehicle.vehicle_id

      // 2. Create tyre fitments
      for (const r of filledTyres) {
        const res = await fetch(`${API}/api/admin/vehicles/${vehicleId}/tyre-fitments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            front_size:   r.front_size.trim(),
            rear_size:    r.rear_size.trim()  || null,
            is_staggered: r.is_staggered,
            notes:        r.notes.trim()      || null,
          }),
        })
        if (!res.ok) {
          const b = await res.json().catch(() => ({}))
          throw new Error(`Tyre fitment "${r.front_size}": ${b.error ?? `HTTP ${res.status}`}`)
        }
      }

      // 3. Create wheel fitments
      for (const r of filledWheels) {
        const res = await fetch(`${API}/api/admin/vehicles/${vehicleId}/wheel-fitments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            pcd:            r.pcd.trim(),
            diameter_range: r.diameter_range.trim() || null,
            width_range:    r.width_range.trim()    || null,
            offset_min:     r.offset_min  ? Number(r.offset_min)  : null,
            offset_max:     r.offset_max  ? Number(r.offset_max)  : null,
            centre_bore:    r.centre_bore ? Number(r.centre_bore) : null,
            notes:          r.notes.trim()           || null,
          }),
        })
        if (!res.ok) {
          const b = await res.json().catch(() => ({}))
          throw new Error(`Wheel fitment "${r.pcd}": ${b.error ?? `HTTP ${res.status}`}`)
        }
      }

      toastSuccess('Vehicle created successfully')
      router.push(`/admin/vehicles/${vehicleId}`)
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to create vehicle')
    } finally {
      setSaving(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-6 max-w-4xl">
      <AdminBreadcrumb crumbs={[
        { label: 'Vehicles', href: '/admin/vehicles' },
        { label: 'New Vehicle' },
      ]} />

      <div className="mt-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Add Vehicle</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Enter the vehicle details, then optionally add tyre and wheel fitment records below.
        </p>
      </div>

      {/* ── Vehicle Details ── */}
      <div className="mt-8 rounded-xl border border-zinc-200 p-6">
        <h2 className="text-base font-semibold text-zinc-800 mb-4">Vehicle Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          <div>
            <label className="text-sm font-medium text-zinc-700">Make <span className="text-red-500">*</span></label>
            <Input
              className="mt-1"
              value={make}
              onChange={e => setMake(e.target.value)}
              placeholder="e.g. Toyota"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-700">Model <span className="text-red-500">*</span></label>
            <Input
              className="mt-1"
              value={model}
              onChange={e => setModel(e.target.value)}
              placeholder="e.g. Hilux"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-700">Year From <span className="text-red-500">*</span></label>
            <Input
              type="number"
              className="mt-1"
              value={yearFrom}
              onChange={e => setYearFrom(e.target.value)}
              placeholder="e.g. 2015"
              min={1900}
              max={2100}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-700">Year To</label>
            <Input
              type="number"
              className="mt-1"
              value={yearTo}
              onChange={e => setYearTo(e.target.value)}
              placeholder="e.g. 2024 (blank = current)"
              min={1900}
              max={2100}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-700">Series</label>
            <Input
              className="mt-1"
              value={series}
              onChange={e => setSeries(e.target.value)}
              placeholder="e.g. SR5"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-700">Variant / Trim</label>
            <Input
              className="mt-1"
              value={variant}
              onChange={e => setVariant(e.target.value)}
              placeholder="e.g. 4x4 Dual Cab"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-sm font-medium text-zinc-700">Body Type</label>
            <Input
              className="mt-1"
              value={bodyType}
              onChange={e => setBodyType(e.target.value)}
              placeholder="e.g. Ute, Sedan, SUV, Wagon"
            />
          </div>

        </div>
      </div>

      {/* ── Tyre Fitments ── */}
      <div className="mt-6 rounded-xl border border-zinc-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-zinc-800">Tyre Fitments</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Add the compatible tyre sizes for this vehicle. Optional — can be added later.</p>
          </div>
          <Button size="sm" variant="outline" className="gap-2" onClick={() => setTyreRows(prev => [...prev, newTyreRow()])}>
            <Plus className="h-4 w-4" /> Add Row
          </Button>
        </div>

        {tyreRows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-400">
            No tyre fitments added.{' '}
            <button
              type="button"
              className="text-zinc-600 underline hover:text-zinc-900"
              onClick={() => setTyreRows([newTyreRow()])}
            >
              Add one
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {tyreRows.map((r, idx) => (
              <div key={r._key} className="rounded-lg border border-zinc-200 p-4 bg-zinc-50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Fitment {idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => setTyreRows(prev => prev.filter(x => x._key !== r._key))}
                    className="text-zinc-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs font-medium text-zinc-600">Front Size <span className="text-red-500">*</span></label>
                    <Input
                      className="mt-1 h-8 text-sm"
                      value={r.front_size}
                      onChange={e => updateTyre(r._key, 'front_size', e.target.value)}
                      placeholder="e.g. 265/65R17"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-600">Rear Size</label>
                    <Input
                      className="mt-1 h-8 text-sm"
                      value={r.rear_size}
                      onChange={e => updateTyre(r._key, 'rear_size', e.target.value)}
                      placeholder="if staggered"
                    />
                  </div>
                  <div className="flex items-end pb-1">
                    <label className="flex items-center gap-2 text-xs font-medium text-zinc-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={r.is_staggered}
                        onChange={e => updateTyre(r._key, 'is_staggered', e.target.checked)}
                        className="rounded"
                      />
                      Staggered
                    </label>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-600">Notes</label>
                    <Input
                      className="mt-1 h-8 text-sm"
                      value={r.notes}
                      onChange={e => updateTyre(r._key, 'notes', e.target.value)}
                      placeholder="Optional notes"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tyreRows.length > 0 && (
          <Button size="sm" variant="outline" className="mt-3 gap-2 w-full border-dashed" onClick={() => setTyreRows(prev => [...prev, newTyreRow()])}>
            <Plus className="h-4 w-4" /> Add Another Tyre Fitment
          </Button>
        )}
      </div>

      {/* ── Wheel Fitments ── */}
      <div className="mt-6 rounded-xl border border-zinc-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-zinc-800">Wheel Fitments</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Add compatible wheel specifications for this vehicle. Optional — can be added later.</p>
          </div>
          <Button size="sm" variant="outline" className="gap-2" onClick={() => setWheelRows(prev => [...prev, newWheelRow()])}>
            <Plus className="h-4 w-4" /> Add Row
          </Button>
        </div>

        {wheelRows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-400">
            No wheel fitments added.{' '}
            <button
              type="button"
              className="text-zinc-600 underline hover:text-zinc-900"
              onClick={() => setWheelRows([newWheelRow()])}
            >
              Add one
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {wheelRows.map((r, idx) => (
              <div key={r._key} className="rounded-lg border border-zinc-200 p-4 bg-zinc-50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Fitment {idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => setWheelRows(prev => prev.filter(x => x._key !== r._key))}
                    className="text-zinc-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs font-medium text-zinc-600">PCD <span className="text-red-500">*</span></label>
                    <Input
                      className="mt-1 h-8 text-sm"
                      value={r.pcd}
                      onChange={e => updateWheel(r._key, 'pcd', e.target.value)}
                      placeholder="e.g. 5x114.3"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-600">Diameter Range</label>
                    <Input
                      className="mt-1 h-8 text-sm"
                      value={r.diameter_range}
                      onChange={e => updateWheel(r._key, 'diameter_range', e.target.value)}
                      placeholder="e.g. 17-20"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-600">Width Range</label>
                    <Input
                      className="mt-1 h-8 text-sm"
                      value={r.width_range}
                      onChange={e => updateWheel(r._key, 'width_range', e.target.value)}
                      placeholder="e.g. 8-9.5"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-600">Offset Min</label>
                    <Input
                      type="number"
                      className="mt-1 h-8 text-sm"
                      value={r.offset_min}
                      onChange={e => updateWheel(r._key, 'offset_min', e.target.value)}
                      placeholder="e.g. 20"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-600">Offset Max</label>
                    <Input
                      type="number"
                      className="mt-1 h-8 text-sm"
                      value={r.offset_max}
                      onChange={e => updateWheel(r._key, 'offset_max', e.target.value)}
                      placeholder="e.g. 45"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-600">Centre Bore (mm)</label>
                    <Input
                      type="number" step="0.1"
                      className="mt-1 h-8 text-sm"
                      value={r.centre_bore}
                      onChange={e => updateWheel(r._key, 'centre_bore', e.target.value)}
                      placeholder="e.g. 60.1"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-zinc-600">Notes</label>
                    <Input
                      className="mt-1 h-8 text-sm"
                      value={r.notes}
                      onChange={e => updateWheel(r._key, 'notes', e.target.value)}
                      placeholder="Optional notes"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {wheelRows.length > 0 && (
          <Button size="sm" variant="outline" className="mt-3 gap-2 w-full border-dashed" onClick={() => setWheelRows(prev => [...prev, newWheelRow()])}>
            <Plus className="h-4 w-4" /> Add Another Wheel Fitment
          </Button>
        )}
      </div>

      {/* ── Actions ── */}
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.push('/admin/vehicles')} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={saving} className="min-w-36">
          {saving ? 'Creating…' : 'Create Vehicle'}
        </Button>
      </div>
    </div>
  )
}

