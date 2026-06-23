'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Sheet } from '@/components/ui/sheet'
import { BoolToggle } from '@/components/admin/BoolToggle'
import { toastPromise, toastError } from '@/lib/toast'
import type { WarehouseType } from '@/types/admin.types'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
const AU_STATES = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'] as const

interface Props {
  open:    boolean
  onClose: () => void
  onSaved: () => void
}

const EMPTY = {
  warehouse_name:        '',
  warehouse_type:        'own' as WarehouseType,
  state:                 '',
  suburb:                '',
  postcode:              '',
  address:               '',
  contact_name:          '',
  contact_phone:         '',
  contact_email:         '',
  is_own_warehouse:      true,
  is_supplier_warehouse: false,
  is_active:             true,
}

export function WarehouseAddSheet({ open, onClose, onSaved }: Props) {
  const [form, setForm]     = useState({ ...EMPTY })
  const [saving, setSaving] = useState(false)

  function set<K extends keyof typeof EMPTY>(key: K, val: (typeof EMPTY)[K]) {
    setForm(f => ({ ...f, [key]: val }))
  }

  function reset() { setForm({ ...EMPTY }) }

  async function handleSave() {
    if (!form.warehouse_name.trim()) return toastError('Warehouse name is required')
    if (!form.state) return toastError('State is required')
    setSaving(true)
    try {
      const { data: { session } } = await createClient().auth.getSession()
      const req = fetch(`${API}/api/admin/orders/warehouses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
        body: JSON.stringify({
          warehouse_name:        form.warehouse_name.trim(),
          warehouse_type:        form.warehouse_type,
          state:                 form.state,
          suburb:                form.suburb || null,
          postcode:              form.postcode || null,
          address:               form.address || null,
          contact_name:          form.contact_name || null,
          contact_phone:         form.contact_phone || null,
          contact_email:         form.contact_email || null,
          is_own_warehouse:      form.is_own_warehouse,
          is_supplier_warehouse: form.is_supplier_warehouse,
          is_active:             form.is_active,
        }),
      }).then(async res => {
        if (!res.ok) {
          const b = await res.json().catch(() => ({})) as { error?: string }
          throw new Error(b.error ?? 'Failed to create warehouse')
        }
        return res.json()
      })

      await toastPromise(req, {
        loading: 'Creating warehouse…',
        success: 'Warehouse created',
        error:   (e: unknown) => e instanceof Error ? e.message : 'Failed',
      })
      reset()
      onSaved()
    } catch {
      // shown by toastPromise
    } finally {
      setSaving(false)
    }
  }

  const inp = 'w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white'
  const lbl = 'block text-xs font-medium text-zinc-700 mb-1'

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="New Warehouse"
      width="w-full max-w-lg"
      footer={
        <>
          <button type="button" onClick={onClose}
            className="px-4 py-2 rounded-lg border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors">
            Cancel
          </button>
          <button type="button" disabled={saving} onClick={handleSave}
            className="px-4 py-2 rounded-lg bg-primary text-sm font-semibold text-zinc-900 hover:bg-primary/90 disabled:opacity-50 transition-colors">
            {saving ? 'Creating…' : 'Create Warehouse'}
          </button>
        </>
      }
    >
      {/* Name + Type */}
      <div>
        <label className={lbl}>Warehouse Name <span className="text-red-500">*</span></label>
        <input value={form.warehouse_name} onChange={e => set('warehouse_name', e.target.value)}
          placeholder="e.g. Sydney Main" className={inp} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Warehouse Type <span className="text-red-500">*</span></label>
          <select value={form.warehouse_type} onChange={e => set('warehouse_type', e.target.value as WarehouseType)} className={inp}>
            <option value="own">Own</option>
            <option value="supplier">Supplier</option>
            <option value="3pl">3PL</option>
          </select>
        </div>
        <div>
          <label className={lbl}>State <span className="text-red-500">*</span></label>
          <select value={form.state} onChange={e => set('state', e.target.value)} className={inp}>
            <option value="">— Select —</option>
            {AU_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Location */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Suburb</label>
          <input value={form.suburb} onChange={e => set('suburb', e.target.value)}
            placeholder="e.g. Wetherill Park" className={inp} />
        </div>
        <div>
          <label className={lbl}>Postcode</label>
          <input value={form.postcode} onChange={e => set('postcode', e.target.value)}
            placeholder="2164" maxLength={10} className={inp} />
        </div>
      </div>

      <div>
        <label className={lbl}>Full Address</label>
        <textarea value={form.address} onChange={e => set('address', e.target.value)}
          rows={2} placeholder="Street address…"
          className={`${inp} resize-none`} />
      </div>

      {/* Contact */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Contact Name</label>
          <input value={form.contact_name} onChange={e => set('contact_name', e.target.value)}
            placeholder="John Smith" className={inp} />
        </div>
        <div>
          <label className={lbl}>Contact Phone</label>
          <input value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)}
            placeholder="02 9xxx xxxx" className={inp} />
        </div>
      </div>

      <div>
        <label className={lbl}>Contact Email</label>
        <input type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)}
          placeholder="warehouse@example.com" className={inp} />
      </div>

      {/* Flags */}
      <div className="space-y-4 pt-1">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-zinc-700">Active</span>
            <p className="text-xs text-zinc-400">Available for stock routing</p>
          </div>
          <BoolToggle initial={form.is_active} onToggle={async next => set('is_active', next)} />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-zinc-700">Own Warehouse</span>
            <p className="text-xs text-zinc-400">Company-held stock location</p>
          </div>
          <BoolToggle initial={form.is_own_warehouse} onToggle={async next => set('is_own_warehouse', next)} />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-zinc-700">Supplier Warehouse</span>
            <p className="text-xs text-zinc-400">Supplier stock location</p>
          </div>
          <BoolToggle initial={form.is_supplier_warehouse} onToggle={async next => set('is_supplier_warehouse', next)} />
        </div>
      </div>
    </Sheet>
  )
}
