'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Pencil, Trash2, MoreHorizontal } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogHeader } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Supplier } from '@/types/admin.types'
import { AdminBreadcrumb } from '@/components/admin/AdminBreadcrumb'
import { toastError, toastSuccess } from '@/lib/toast'

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

const TYPE_BADGE: Record<string, string> = {
  wholesaler:          'bg-blue-50 text-blue-700',
  factory:             'bg-purple-50 text-purple-700',
  marketplace_partner: 'bg-amber-50 text-amber-700',
  '3pl':               'bg-teal-50 text-teal-700',
}

const ACCESS_BADGE: Record<string, string> = {
  owned_after_purchase: 'bg-blue-50 text-blue-700',
  consignment:          'bg-amber-50 text-amber-700',
  live_supplier_stock:  'bg-green-50 text-green-700',
}

const ACCESS_LABEL: Record<string, string> = {
  owned_after_purchase: 'After Purchase',
  consignment:          'Consignment',
  live_supplier_stock:  'Live Stock',
}

type FormState = {
  supplier_name:      string
  supplier_type:      string
  contact_name:       string
  email:              string
  phone:              string
  state:              string
  country:            string
  payment_terms:      string
  stock_access_type:  string
  api_connected:      boolean
  is_active:          boolean
}

const EMPTY_FORM: FormState = {
  supplier_name:     '',
  supplier_type:     'wholesaler',
  contact_name:      '',
  email:             '',
  phone:             '',
  state:             '',
  country:           'Australia',
  payment_terms:     '',
  stock_access_type: 'owned_after_purchase',
  api_connected:     false,
  is_active:         true,
}

interface Props {
  initialSuppliers: Supplier[]
  accessToken:      string
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

function SupplierRowActions({
  supplier,
  onEdit,
  onDelete,
}: {
  supplier: Supplier
  onEdit:   () => void
  onDelete: () => void
}) {
  const router         = useRouter()
  const [open, setOpen] = useState(false)
  const ref            = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  return (
    <div ref={ref} className="relative flex justify-end">
      <button
        type="button"
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
      >
        Actions
        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 w-40 rounded-xl border border-zinc-200 bg-white py-1 shadow-xl overflow-hidden">
          <button
            type="button"
            onClick={() => { setOpen(false); router.push(`/admin/suppliers/${supplier.supplier_id}`) }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm font-semibold text-primary hover:bg-primary/5 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
            </svg>
            Manage
          </button>
          <div className="my-1 border-t border-zinc-100" />
          <button
            type="button"
            onClick={() => { setOpen(false); onEdit() }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5 text-zinc-400" />
            Edit
          </button>
          <button
            type="button"
            onClick={() => { setOpen(false); onDelete() }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>
      )}
    </div>
  )
}

export default function SuppliersClient({ initialSuppliers, accessToken }: Props) {
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers)
  const [search, setSearch]       = useState('')
  const [loading, setLoading]     = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Supplier | null>(null)
  const [form, setForm]           = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving]       = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null)
  const [deleting, setDeleting]   = useState(false)

  const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/admin/suppliers`, { headers })
      if (res.ok) {
        const data: Supplier[] = await res.json()
        const q = search.toLowerCase()
        setSuppliers(q ? data.filter(s => s.supplier_name.toLowerCase().includes(q)) : data)
      }
    } finally { setLoading(false) }
  }

  function openCreate() {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function openEdit(s: Supplier) {
    setEditTarget(s)
    setForm({
      supplier_name:     s.supplier_name,
      supplier_type:     s.supplier_type ?? 'wholesaler',
      contact_name:      s.contact_name ?? '',
      email:             s.email ?? '',
      phone:             s.phone ?? '',
      state:             s.state ?? '',
      country:           s.country ?? 'Australia',
      payment_terms:     s.payment_terms ?? '',
      stock_access_type: s.stock_access_type ?? 'owned_after_purchase',
      api_connected:     s.api_connected,
      is_active:         s.is_active,
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.supplier_name.trim()) return toastError('Supplier name is required')
    setSaving(true)
    try {
      const payload = {
        supplier_name:     form.supplier_name.trim(),
        supplier_type:     form.supplier_type || null,
        contact_name:      form.contact_name || null,
        email:             form.email || null,
        phone:             form.phone || null,
        state:             form.state || null,
        country:           form.country || null,
        payment_terms:     form.payment_terms || null,
        stock_access_type: form.stock_access_type || null,
        api_connected:     form.api_connected,
        is_active:         form.is_active,
      }
      const url    = editTarget ? `${API}/api/admin/suppliers/${editTarget.supplier_id}` : `${API}/api/admin/suppliers`
      const method = editTarget ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers, body: JSON.stringify(payload) })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Save failed')
      }
      const saved = await res.json()
      if (editTarget) {
        setSuppliers(prev => prev.map(s => s.supplier_id === editTarget.supplier_id ? { ...s, ...payload } : s))
      } else {
        setSuppliers(prev => [...prev, { ...saved, ...payload } as Supplier])
      }
      toastSuccess(editTarget ? 'Supplier updated' : 'Supplier created')
      setDialogOpen(false)
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`${API}/api/admin/suppliers/${deleteTarget.supplier_id}`, {
        method: 'DELETE',
        headers,
      })
      if (!res.ok) throw new Error('Delete failed')
      setSuppliers(prev => prev.filter(s => s.supplier_id !== deleteTarget.supplier_id))
      toastSuccess('Supplier deleted')
      setDeleteTarget(null)
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const filtered = search
    ? suppliers.filter(s => s.supplier_name.toLowerCase().includes(search.toLowerCase()))
    : suppliers

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <AdminBreadcrumb crumbs={[{ label: 'Suppliers' }]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Suppliers</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Manage stock suppliers and CSV imports</p>
        </div>
        <Button type="button" onClick={openCreate}>
          <Plus className="w-4 h-4" />
          Add Supplier
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-zinc-100">
          <form onSubmit={handleSearch} className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search suppliers..."
              className="pl-8 text-xs"
            />
          </form>
          <span className="ml-auto text-xs text-zinc-400">{filtered.length} suppliers</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Supplier</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Type</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Stock Access</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">API</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Added</th>
                <th className="px-5 py-3 w-28" scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-300">
              {loading ? (
                [1,2,3].map(i => (
                  <tr key={i}>
                    {[1,2,3,4,5,6].map(j => <td key={j} className="px-5 py-3"><div className="h-4 w-full bg-zinc-100 rounded animate-pulse" /></td>)}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-zinc-400 text-sm">No suppliers found</td>
                </tr>
              ) : (
                filtered.map(s => (
                  <tr key={s.supplier_id} className="odd:bg-white even:bg-zinc-200 [&:hover]:bg-amber-100 transition-colors duration-150">
                    <td className="px-5 py-3">
                      <p className="font-medium text-zinc-900">{s.supplier_name}</p>
                      <p className="text-xs text-zinc-400">{s.email ?? '—'}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${TYPE_BADGE[s.supplier_type ?? ''] ?? 'bg-zinc-100 text-zinc-600'}`}>
                        {s.supplier_type ?? '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ACCESS_BADGE[s.stock_access_type ?? ''] ?? 'bg-zinc-100 text-zinc-600'}`}>
                        {s.stock_access_type ? (ACCESS_LABEL[s.stock_access_type] ?? s.stock_access_type) : '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${s.api_connected ? 'text-green-700' : 'text-zinc-400'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.api_connected ? 'bg-green-500' : 'bg-zinc-300'}`} />
                        {s.api_connected ? 'Connected' : 'Not connected'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-zinc-500">{fmtDate(s.created_at)}</td>
                    <td className="px-5 py-3">
                      <SupplierRowActions
                        supplier={s}
                        onEdit={() => openEdit(s)}
                        onDelete={() => setDeleteTarget(s)}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
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

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Payment Terms</label>
              <Input value={form.payment_terms} onChange={e => set('payment_terms', e.target.value)} placeholder="COD, 30 days, 60 days…" />
            </div>

            <div className="space-y-2 pt-1">
              <Toggle checked={form.api_connected} onChange={v => set('api_connected', v)} label="API Connected (live stock feed available)" />
              <Toggle checked={form.is_active}     onChange={v => set('is_active', v)}     label="Active supplier" />
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="button" disabled={saving} onClick={handleSave}>
                {saving ? 'Saving…' : editTarget ? 'Save Changes' : 'Add Supplier'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Supplier?</DialogTitle></DialogHeader>
          <p className="text-sm text-zinc-600 mt-1">
            <strong>{deleteTarget?.supplier_name}</strong> will be permanently removed along with all product mappings.
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

