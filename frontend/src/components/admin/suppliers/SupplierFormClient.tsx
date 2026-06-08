'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AdminBreadcrumb } from '@/components/admin/AdminBreadcrumb'
import { toastError, toastSuccess } from '@/lib/toast'
import type { Supplier } from '@/types/admin.types'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

const SUPPLIER_TYPES = [
  { value: 'wholesaler',          label: 'Wholesaler' },
  { value: 'factory',             label: 'Factory' },
  { value: 'marketplace_partner', label: 'Marketplace Partner' },
  { value: '3pl',                 label: '3PL' },
]

const ACCESS_TYPES = [
  { value: 'owned_after_purchase', label: 'Owned After Purchase' },
  { value: 'consignment',          label: 'Consignment' },
  { value: 'live_supplier_stock',  label: 'Live Supplier Stock' },
]

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
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

interface Props {
  supplier?:   Supplier
  accessToken: string
}

type FormState = {
  supplier_name:     string
  supplier_type:     string
  contact_name:      string
  email:             string
  phone:             string
  state:             string
  country:           string
  payment_terms:     string
  stock_access_type: string
  api_connected:     boolean
  api_endpoint:      string
  api_key:           string
  api_auth_type:     string
  is_active:         boolean
}

export default function SupplierFormClient({ supplier, accessToken }: Props) {
  const router  = useRouter()
  const isEdit  = !!supplier

  const [form, setForm] = useState<FormState>({
    supplier_name:     supplier?.supplier_name     ?? '',
    supplier_type:     supplier?.supplier_type     ?? 'wholesaler',
    contact_name:      supplier?.contact_name      ?? '',
    email:             supplier?.contact_email     ?? '',
    phone:             supplier?.contact_phone     ?? '',
    state:             supplier?.state             ?? '',
    country:           supplier?.country           ?? 'Australia',
    payment_terms:     supplier?.payment_terms     ?? '',
    stock_access_type: supplier?.stock_access_type ?? 'owned_after_purchase',
    api_connected:     supplier?.api_connected     ?? false,
    api_endpoint:      supplier?.api_endpoint      ?? '',
    api_key:           supplier?.api_key           ?? '',
    api_auth_type:     supplier?.api_auth_type     ?? 'api_key',
    is_active:         supplier?.is_active         ?? true,
  })

  const [saving, setSaving] = useState(false)

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSave() {
    if (!form.supplier_name.trim()) return toastError('Supplier name is required')
    if (form.api_connected && !form.api_endpoint.trim()) return toastError('API endpoint URL is required')
    if (form.api_connected && !form.api_key.trim()) return toastError('API key / token is required')

    setSaving(true)
    try {
      const payload = {
        supplier_name:     form.supplier_name.trim(),
        supplier_type:     form.supplier_type     || null,
        contact_name:      form.contact_name      || null,
        email:             form.email             || null,
        phone:             form.phone             || null,
        state:             form.state             || null,
        country:           form.country           || null,
        payment_terms:     form.payment_terms     || null,
        stock_access_type: form.stock_access_type || null,
        api_connected:     form.api_connected,
        api_endpoint:      form.api_connected ? (form.api_endpoint || null) : null,
        api_key:           form.api_connected ? (form.api_key      || null) : null,
        api_auth_type:     form.api_connected ? (form.api_auth_type || null) : null,
        is_active:         form.is_active,
      }

      const url    = isEdit ? `${API}/api/admin/suppliers/${supplier!.supplier_id}` : `${API}/api/admin/suppliers`
      const method = isEdit ? 'PUT' : 'POST'
      const res    = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Save failed')
      }

      toastSuccess(isEdit ? 'Supplier updated' : 'Supplier created')
      router.push('/admin/suppliers')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const authLabel = form.api_auth_type === 'bearer' ? 'Bearer Token' : form.api_auth_type === 'basic' ? 'Password / Secret' : 'API Key'

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-2xl">
      <AdminBreadcrumb crumbs={[
        { label: 'Suppliers', href: '/admin/suppliers' },
        { label: isEdit ? `Edit — ${supplier!.supplier_name}` : 'Add Supplier' },
      ]} />

      <div>
        <h1 className="text-xl font-semibold text-zinc-900">{isEdit ? 'Edit Supplier' : 'Add Supplier'}</h1>
        <p className="text-sm text-zinc-500 mt-0.5">{isEdit ? 'Update supplier details and settings.' : 'Fill in the details to register a new stock supplier.'}</p>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm divide-y divide-zinc-100">

        {/* Basic info */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Basic Information</p>

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">Supplier Name <span className="text-red-500">*</span></label>
            <Input value={form.supplier_name} onChange={e => set('supplier_name', e.target.value)} placeholder="Acme Tyres Pty Ltd" autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Supplier Type</label>
              <select value={form.supplier_type} onChange={e => set('supplier_type', e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white">
                {SUPPLIER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Stock Access</label>
              <select value={form.stock_access_type} onChange={e => set('stock_access_type', e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white">
                {ACCESS_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Contact Details</p>

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">Contact Name</label>
            <Input value={form.contact_name} onChange={e => set('contact_name', e.target.value)} placeholder="John Smith" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Email</label>
              <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="orders@acme.com" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Phone</label>
              <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+61 7 1234 5678" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">State</label>
              <Input value={form.state} onChange={e => set('state', e.target.value)} placeholder="QLD" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Country</label>
              <Input value={form.country} onChange={e => set('country', e.target.value)} placeholder="Australia" />
            </div>
          </div>
        </div>

        {/* Terms */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Terms</p>
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">Payment Terms</label>
            <Input value={form.payment_terms} onChange={e => set('payment_terms', e.target.value)} placeholder="COD, 30 days, 60 days…" />
          </div>
        </div>

        {/* API */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">API Integration</p>
          <Toggle checked={form.api_connected} onChange={v => set('api_connected', v)} label="Enable live API stock feed" />

          {form.api_connected && (
            <div className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Endpoint URL <span className="text-red-500">*</span></label>
                <Input
                  value={form.api_endpoint}
                  onChange={e => set('api_endpoint', e.target.value)}
                  placeholder="https://api.supplier.com/v1/stock"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Auth Type</label>
                <select
                  value={form.api_auth_type}
                  onChange={e => set('api_auth_type', e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
                >
                  <option value="api_key">API Key</option>
                  <option value="bearer">Bearer Token</option>
                  <option value="basic">Basic Auth</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  {authLabel} <span className="text-red-500">*</span>
                </label>
                <Input
                  type="password"
                  value={form.api_key}
                  onChange={e => set('api_key', e.target.value)}
                  placeholder={form.api_auth_type === 'bearer' ? 'eyJ...' : form.api_auth_type === 'basic' ? 'password' : 'sk-...'}
                  autoComplete="off"
                />
              </div>
            </div>
          )}
        </div>

        {/* Status */}
        <div className="px-6 py-5">
          <Toggle checked={form.is_active} onChange={v => set('is_active', v)} label="Active supplier" />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button type="button" disabled={saving} onClick={handleSave} className="px-6">
          {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Supplier'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push('/admin/suppliers')}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
