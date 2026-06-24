'use client'

import { useState, useEffect } from 'react'
import { Sheet } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { toastSuccess, toastError } from '@/lib/toast'
import type { AdminShippingMethod, ShippingMethodType } from '@/types/admin.types'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

const METHOD_TYPES: { value: ShippingMethodType; label: string }[] = [
  { value: 'own_fleet',       label: 'Own Fleet' },
  { value: 'courier_api',     label: 'Courier API' },
  { value: '3pl',             label: '3PL' },
  { value: 'supplier_direct', label: 'Supplier Direct' },
  { value: 'pickup',          label: 'Pickup' },
]

type FormState = {
  method_name:  string
  method_type:  ShippingMethodType
  api_provider: string
  is_active:    boolean
}

const EMPTY_FORM: FormState = {
  method_name:  '',
  method_type:  'own_fleet',
  api_provider: '',
  is_active:    true,
}

interface Props {
  open:    boolean
  onClose: () => void
  onSaved: () => void
  method?: AdminShippingMethod | null
}

async function getToken() {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.access_token ?? ''
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 rounded-full border-2 border-transparent transition-colors ${checked ? 'bg-primary' : 'bg-zinc-300'}`}
      >
        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
      </button>
      <span className="text-sm text-zinc-700">{label}</span>
    </label>
  )
}

export function ShippingMethodSheet({ open, onClose, onSaved, method }: Props) {
  const isEdit = !!method
  const [form, setForm]     = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (method) {
      setForm({
        method_name:  method.method_name,
        method_type:  method.method_type ?? 'own_fleet',
        api_provider: method.api_provider ?? '',
        is_active:    method.is_active,
      })
    } else {
      setForm(EMPTY_FORM)
    }
  }, [method])

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSave() {
    if (!form.method_name.trim()) return toastError('Method name is required')
    setSaving(true)
    try {
      const tok = await getToken()
      const payload = {
        method_name:  form.method_name.trim(),
        method_type:  form.method_type,
        api_provider: form.api_provider.trim() || null,
        is_active:    form.is_active,
      }
      const url    = isEdit ? `${API}/api/admin/shipping/methods/${method!.shipping_method_id}` : `${API}/api/admin/shipping/methods`
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? 'Save failed')
      }
      toastSuccess(isEdit ? 'Shipping method updated' : 'Shipping method created')
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
      title={isEdit ? 'Edit Shipping Method' : 'New Shipping Method'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1.5">Method Name *</label>
          <Input
            value={form.method_name}
            onChange={e => set('method_name', e.target.value)}
            placeholder="e.g. StarTrack Express"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1.5">Type *</label>
          <Select value={form.method_type} onValueChange={v => set('method_type', v as ShippingMethodType)}>
            <SelectTrigger className="w-full rounded-lg border-zinc-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METHOD_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1.5">API / Provider Name</label>
          <Input
            value={form.api_provider}
            onChange={e => set('api_provider', e.target.value)}
            placeholder="e.g. StarTrack API, Sendle"
          />
          <p className="text-[11px] text-zinc-400 mt-1">Leave blank if no external API</p>
        </div>

        <Toggle checked={form.is_active} onChange={v => set('is_active', v)} label="Active" />
      </div>
    </Sheet>
  )
}
