'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Search, X } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogClose } from '@/components/ui/dialog'
import type { Supplier } from '@/types/admin.types'
import { AdminBreadcrumb } from '@/components/admin/AdminBreadcrumb'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

interface Props {
  initialSuppliers: Supplier[]
  accessToken:      string
}

function TypeBadge({ type }: { type: Supplier['supplier_type'] }) {
  const map: Record<string, string> = {
    wholesaler:          'bg-blue-50 text-blue-700',
    factory:             'bg-purple-50 text-purple-700',
    marketplace_partner: 'bg-amber-50 text-amber-700',
    '3pl':               'bg-teal-50 text-teal-700',
  }
  const cls = type ? (map[type] ?? 'bg-zinc-100 text-zinc-600') : 'bg-zinc-100 text-zinc-600'
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${cls}`}>
      {type ?? '—'}
    </span>
  )
}

const ACCESS_LABEL: Record<string, string> = {
  owned_after_purchase: 'After Purchase',
  consignment:          'Consignment',
  live_supplier_stock:  'Live Stock',
}

function AccessBadge({ type }: { type: Supplier['stock_access_type'] }) {
  const map: Record<string, string> = {
    owned_after_purchase: 'bg-blue-50 text-blue-700',
    consignment:          'bg-amber-50 text-amber-700',
    live_supplier_stock:  'bg-green-50 text-green-700',
  }
  const cls = type ? (map[type] ?? 'bg-zinc-100 text-zinc-600') : 'bg-zinc-100 text-zinc-600'
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {type ? (ACCESS_LABEL[type] ?? type) : '—'}
    </span>
  )
}

export default function SuppliersClient({ initialSuppliers, accessToken }: Props) {
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers)
  const [search, setSearch]       = useState('')
  const [loading, setLoading]     = useState(false)
  const [showAdd, setShowAdd]     = useState(false)
  const [newName, setNewName]     = useState('')
  const [adding, setAdding]       = useState(false)
  const [addError, setAddError]   = useState<string | null>(null)

  const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }

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

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setAdding(true)
    setAddError(null)
    try {
      const res = await fetch(`${API}/api/admin/suppliers`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ supplier_name: newName.trim() }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Failed to add supplier (${res.status})`)
      }
      const data = await res.json()
      setSuppliers(prev => [...prev, { ...data, supplier_name: newName.trim(), is_active: true, api_connected: false } as Supplier])
      setNewName('')
      setShowAdd(false)
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : 'Unknown error')
    } finally { setAdding(false) }
  }

  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <AdminBreadcrumb crumbs={[{ label: 'Suppliers' }]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Suppliers</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Manage stock suppliers and CSV imports</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Supplier
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-zinc-100">
          <form onSubmit={handleSearch} className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search suppliers..."
              className="pl-8 pr-3 py-1.5 text-xs border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary w-full"
            />
          </form>
          <span className="ml-auto text-xs text-zinc-400">{suppliers.length} suppliers</span>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50">
              <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Supplier</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Type</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Stock Access</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">API</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Added</th>
              <th className="px-5 py-3 w-10" scope="col"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {loading ? (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-zinc-400">Loading...</td></tr>
            ) : suppliers.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-zinc-400">No suppliers yet. Add your first supplier.</td></tr>
            ) : (
              suppliers.map(s => (
                <tr key={s.supplier_id} className="hover:bg-zinc-50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-zinc-900">{s.supplier_name}</p>
                    <p className="text-xs text-zinc-400">{s.email ?? '—'}</p>
                  </td>
                  <td className="px-5 py-3"><TypeBadge type={s.supplier_type} /></td>
                  <td className="px-5 py-3"><AccessBadge type={s.stock_access_type} /></td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${s.api_connected ? 'text-green-700' : 'text-zinc-400'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.api_connected ? 'bg-green-500' : 'bg-zinc-300'}`} />
                      {s.api_connected ? 'Connected' : 'Not connected'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-zinc-500">{fmtDate(s.created_at)}</td>
                  <td className="px-5 py-3">
                    <Link
                      href={`/admin/suppliers/${s.supplier_id}`}
                      className="text-xs font-medium text-primary hover:text-primary/80"
                    >
                      Manage →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={showAdd} onOpenChange={o => { if (!o) { setShowAdd(false); setNewName(''); setAddError(null) } }}>
        <DialogContent className="p-0 gap-0 rounded-2xl shadow-xl ring-0 bg-white sm:max-w-sm" showCloseButton={false}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
            <DialogTitle className="text-base font-semibold text-zinc-900">Add Supplier</DialogTitle>
            <DialogClose className="p-1 text-zinc-400 hover:text-zinc-600 rounded transition-colors">
              <X className="w-4 h-4" />
            </DialogClose>
          </div>
          <form onSubmit={handleAdd}>
            <div className="px-6 py-5 space-y-3">
              {addError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{addError}</p>
              )}
              <label htmlFor="supplierName" className="block text-sm font-medium text-zinc-700 mb-1">Supplier Name</label>
              <input
                id="supplierName"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Supplier name"
                autoFocus
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <div className="flex gap-2 justify-end px-6 py-4 border-t border-zinc-100">
              <DialogClose asChild>
                <button type="button" className="px-3 py-1.5 rounded-lg text-sm text-zinc-600 hover:bg-zinc-100 transition-colors">
                  Cancel
                </button>
              </DialogClose>
              <button
                type="submit"
                disabled={adding || !newName.trim()}
                className="px-3 py-1.5 rounded-lg bg-primary text-sm text-zinc-900 font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {adding ? 'Adding...' : 'Add'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
