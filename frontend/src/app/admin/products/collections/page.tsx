'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminBreadcrumb } from '@/components/admin/AdminBreadcrumb'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pencil, Trash2, Plus, X, Check } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

type Collection = {
  collection_id: string
  collection_name: string
  collection_slug: string
  description: string | null
  is_active: boolean
  created_at: string
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [token, setToken]             = useState('')

  const [creating, setCreating]       = useState(false)
  const [newName, setNewName]         = useState('')
  const [newSlug, setNewSlug]         = useState('')
  const [newDesc, setNewDesc]         = useState('')
  const [saving, setSaving]           = useState(false)

  const [editId, setEditId]           = useState<string | null>(null)
  const [editName, setEditName]       = useState('')
  const [editSlug, setEditSlug]       = useState('')
  const [editDesc, setEditDesc]       = useState('')
  const [editSaving, setEditSaving]   = useState(false)

  useEffect(() => { document.title = 'Collections | Tyre Vault' }, [])

  useEffect(() => {
    async function load() {
      const { data: { session } } = await createClient().auth.getSession()
      const tok = session?.access_token ?? ''
      setToken(tok)
      const res = await fetch(`${API}/api/admin/products/collections`, {
        headers: { Authorization: `Bearer ${tok}` },
      })
      if (!res.ok) { setError('Failed to load collections'); setLoading(false); return }
      setCollections(await res.json())
      setLoading(false)
    }
    load()
  }, [])

  const headers = (tok: string) => ({ Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' })

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`${API}/api/admin/products/collections`, {
        method: 'POST',
        headers: headers(token),
        body: JSON.stringify({ collection_name: newName, collection_slug: newSlug || slugify(newName), description: newDesc || null }),
      })
      if (!res.ok) throw new Error(await res.json().then((b: { error?: string }) => b.error ?? 'Failed'))
      const created: Collection = await res.json()
      setCollections(prev => [...prev, created].sort((a, b) => a.collection_name.localeCompare(b.collection_name)))
      setCreating(false); setNewName(''); setNewSlug(''); setNewDesc('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create')
    } finally { setSaving(false) }
  }

  async function handleEdit(id: string) {
    setEditSaving(true)
    setError(null)
    try {
      const res = await fetch(`${API}/api/admin/products/collections/${id}`, {
        method: 'PATCH',
        headers: headers(token),
        body: JSON.stringify({ collection_name: editName, collection_slug: editSlug, description: editDesc || null }),
      })
      if (!res.ok) throw new Error(await res.json().then((b: { error?: string }) => b.error ?? 'Failed'))
      setCollections(prev => prev.map(c => c.collection_id === id
        ? { ...c, collection_name: editName, collection_slug: editSlug, description: editDesc || null }
        : c
      ))
      setEditId(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update')
    } finally { setEditSaving(false) }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete collection "${name}"? This will unlink it from all products.`)) return
    setError(null)
    try {
      const res = await fetch(`${API}/api/admin/products/collections/${id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(await res.json().then((b: { error?: string }) => b.error ?? 'Failed'))
      setCollections(prev => prev.filter(c => c.collection_id !== id))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  function startEdit(c: Collection) {
    setEditId(c.collection_id); setEditName(c.collection_name)
    setEditSlug(c.collection_slug); setEditDesc(c.description ?? '')
  }

  return (
    <div className="p-6 space-y-5">
      <AdminBreadcrumb crumbs={[
        { label: 'Products', href: '/admin/products' },
        { label: 'Collections' },
      ]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Collections</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Group products into curated collections</p>
        </div>
        <Button onClick={() => { setCreating(true); setError(null) }} className="flex items-center gap-1.5 text-sm">
          <Plus className="w-4 h-4" /> New Collection
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50">
              <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Name</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Slug</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Description</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Status</th>
              <th className="px-5 py-3 w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {creating && (
              <tr>
                <td className="px-5 py-3">
                  <Input value={newName} onChange={e => { setNewName(e.target.value); if (!newSlug) setNewSlug(slugify(e.target.value)) }}
                    placeholder="Collection name" className="h-8 text-sm" autoFocus />
                </td>
                <td className="px-5 py-3">
                  <Input value={newSlug} onChange={e => setNewSlug(e.target.value)} placeholder="slug" className="h-8 text-sm font-mono" />
                </td>
                <td className="px-5 py-3">
                  <Input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Optional description" className="h-8 text-sm" />
                </td>
                <td className="px-5 py-3" />
                <td className="px-5 py-3">
                  <form onSubmit={handleCreate} className="flex items-center gap-1">
                    <button type="submit" disabled={!newName || saving} className="p-1.5 rounded text-green-600 hover:bg-green-50 disabled:opacity-40">
                      <Check className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => { setCreating(false); setNewName(''); setNewSlug(''); setNewDesc('') }}
                      className="p-1.5 rounded text-zinc-400 hover:bg-zinc-100">
                      <X className="w-4 h-4" />
                    </button>
                  </form>
                </td>
              </tr>
            )}
            {loading ? (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-zinc-400">Loading…</td></tr>
            ) : collections.length === 0 && !creating ? (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-zinc-400">No collections yet.</td></tr>
            ) : (
              collections.map(c => (
                <tr key={c.collection_id} className="hover:bg-zinc-50">
                  {editId === c.collection_id ? (
                    <>
                      <td className="px-5 py-2">
                        <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-8 text-sm" autoFocus />
                      </td>
                      <td className="px-5 py-2">
                        <Input value={editSlug} onChange={e => setEditSlug(e.target.value)} className="h-8 text-sm font-mono" />
                      </td>
                      <td className="px-5 py-2">
                        <Input value={editDesc} onChange={e => setEditDesc(e.target.value)} className="h-8 text-sm" />
                      </td>
                      <td className="px-5 py-2" />
                      <td className="px-5 py-2">
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleEdit(c.collection_id)} disabled={!editName || editSaving}
                            className="p-1.5 rounded text-green-600 hover:bg-green-50 disabled:opacity-40">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditId(null)} className="p-1.5 rounded text-zinc-400 hover:bg-zinc-100">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-5 py-3 font-medium text-zinc-900">{c.collection_name}</td>
                      <td className="px-5 py-3 font-mono text-xs text-zinc-500">{c.collection_slug}</td>
                      <td className="px-5 py-3 text-zinc-500 max-w-xs truncate">{c.description ?? '—'}</td>
                      <td className="px-5 py-3">
                        <Badge className={`text-xs rounded-full border-0 ${c.is_active ? 'bg-green-50 text-green-700' : 'bg-zinc-100 text-zinc-500'}`}>
                          {c.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => startEdit(c)} className="p-1.5 rounded text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(c.collection_id, c.collection_name)}
                            className="p-1.5 rounded text-zinc-400 hover:text-red-600 hover:bg-red-50">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
