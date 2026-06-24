'use client'

import { useState, useEffect } from 'react'
import { Sheet } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BACKEND_API_URL, createBackendHeaders, readBackendError } from '@/lib/backend-api'
import { toastSuccess, toastError } from '@/lib/toast'
import type { CustomerGroup } from '@/types/admin.types'

const DISCOUNT_TYPES = ['percent', 'fixed_amount']
const PRICE_TYPES    = ['retail', 'wholesale', 'price_a', 'price_b', 'special', 'clearance']

type FormState = {
  name:               string
  description:        string
  default_discount:   string
  discount_type:      string
  discount_value:     string
  price_type:         string
  can_view_wholesale: boolean
  is_active:          boolean
}

const EMPTY_FORM: FormState = {
  name:               '',
  description:        '',
  default_discount:   '',
  discount_type:      '',
  discount_value:     '',
  price_type:         '',
  can_view_wholesale: false,
  is_active:          true,
}

function BoolRow({ checked, onChange, label, description }: {
  checked:     boolean
  onChange:    (v: boolean) => void
  label:       string
  description: string
}) {
  return (
    <div
      className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${checked ? 'border-green-200 bg-green-50/50' : 'border-zinc-200'}`}
      onClick={() => onChange(!checked)}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors mt-0.5 ${checked ? 'bg-green-500' : 'bg-zinc-300'}`}
      >
        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
      </button>
      <div>
        <p className="text-sm font-medium text-zinc-800">{label}</p>
        <p className="text-xs text-zinc-500">{description}</p>
      </div>
    </div>
  )
}

interface Props {
  open:        boolean
  onClose:     () => void
  onSaved:     (saved: CustomerGroup) => void
  accessToken: string
  group?:      CustomerGroup | null
}

export default function CustomerGroupSheet({ open, onClose, onSaved, accessToken, group }: Props) {
  const isEdit = !!group
  const [form, setForm]     = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (group) {
      setForm({
        name:               group.group_name,
        description:        group.description       ?? '',
        default_discount:   group.default_discount  != null ? String(group.default_discount) : '',
        discount_type:      group.discount_type     ?? '',
        discount_value:     group.discount_value    != null ? String(group.discount_value) : '',
        price_type:         group.price_type        ?? '',
        can_view_wholesale: group.can_view_wholesale ?? false,
        is_active:          group.is_active          ?? true,
      })
    } else {
      setForm(EMPTY_FORM)
    }
  }, [group])

  function f<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!form.name.trim()) { toastError('Group name is required'); return }

    setSaving(true)
    try {
      const url    = isEdit ? `${BACKEND_API_URL}/api/admin/customers/groups/${group!.group_id}` : `${BACKEND_API_URL}/api/admin/customers/groups`
      const method = isEdit ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: createBackendHeaders(accessToken, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          name:               form.name.trim(),
          description:        form.description        || null,
          default_discount:   form.default_discount   ? Number(form.default_discount)  : null,
          discount_type:      form.discount_type      || null,
          discount_value:     form.discount_value     ? Number(form.discount_value)    : null,
          price_type:         form.price_type         || null,
          can_view_wholesale: form.can_view_wholesale,
          is_active:          form.is_active,
        }),
      })
      if (!res.ok) throw new Error(await readBackendError(res, `Failed to ${isEdit ? 'update' : 'create'} group`))
      const saved: CustomerGroup = await res.json()
      toastSuccess(isEdit ? 'Group updated' : 'Group created')
      onSaved(saved)
      onClose()
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Group' : 'Create Customer Group'}
      width="w-full max-w-lg"
    >
      <form onSubmit={handleSubmit} className="flex flex-col h-full">
        <div className="flex-1 space-y-4">
          <div>
            <Label htmlFor="cg-name" className="block text-sm font-medium text-zinc-700 mb-1">
              Group Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="cg-name"
              autoFocus
              placeholder="e.g. Wholesale, VIP, Trade"
              value={form.name}
              onChange={e => f('name', e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="cg-desc" className="block text-sm font-medium text-zinc-700 mb-1">Description</Label>
            <Input
              id="cg-desc"
              placeholder="Optional description…"
              value={form.description}
              onChange={e => f('description', e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="cg-dd" className="block text-sm font-medium text-zinc-700 mb-1">Default Discount (%)</Label>
            <Input
              id="cg-dd"
              type="number"
              step="0.01"
              min="0"
              max="100"
              placeholder="e.g. 10.00"
              value={form.default_discount}
              onChange={e => f('default_discount', e.target.value)}
            />
            <p className="mt-1 text-xs text-zinc-400">Applied automatically to all orders from this group.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cg-dtype" className="block text-sm font-medium text-zinc-700 mb-1">Discount Type</Label>
              <select
                id="cg-dtype"
                value={form.discount_type}
                onChange={e => f('discount_type', e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">None</option>
                {DISCOUNT_TYPES.map(t => (
                  <option key={t} value={t}>{t === 'percent' ? 'Percent (%)' : 'Fixed Amount ($)'}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="cg-dval" className="block text-sm font-medium text-zinc-700 mb-1">Discount Value</Label>
              <Input
                id="cg-dval"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 10 or 15.00"
                value={form.discount_value}
                onChange={e => f('discount_value', e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="cg-price" className="block text-sm font-medium text-zinc-700 mb-1">Price Tier Override</Label>
            <select
              id="cg-price"
              value={form.price_type}
              onChange={e => f('price_type', e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Default (retail)</option>
              {PRICE_TYPES.map(t => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1).replace('_', ' ')}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2 pt-1">
            <BoolRow
              checked={form.can_view_wholesale}
              onChange={v => f('can_view_wholesale', v)}
              label="Wholesale Portal Access"
              description="Members can see wholesale pricing and place wholesale orders"
            />
            <BoolRow
              checked={form.is_active}
              onChange={v => f('is_active', v)}
              label="Active"
              description={form.is_active ? 'Group is active and assignable to customers' : 'Group is disabled — customers will not be affected'}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-5 border-t border-zinc-100 mt-5">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Group'}
          </Button>
        </div>
      </form>
    </Sheet>
  )
}
