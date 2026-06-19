'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useQueryClient } from '@tanstack/react-query'
import { AdminBreadcrumb } from '@/components/admin/AdminBreadcrumb'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pencil, Trash2, Plus, X, Check } from 'lucide-react'
import { toastSuccess, toastError } from '@/lib/toast'
import { useAdminCollections, type AdminCollection } from '@/lib/query/hooks'
import { adminKeys } from '@/lib/query/keys'
import { TableBodySpinner } from '@/components/ui/table-loader'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

async function getToken() {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.access_token ?? ''
}

function headers(tok: string) {
  return { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' }
}

export default function CollectionsPage() {
  const queryClient = useQueryClient()
  const { data: collections = [], isPending: loading } = useAdminCollections()

  const [creating, setCreating]     = useState(false)
  const [newName, setNewName]       = useState('')
  const [newSlug, setNewSlug]       = useState('')
  const [newDesc, setNewDesc]       = useState('')
  const [saving, setSaving]         = useState(false)

  const [editId, setEditId]         = useState<string | null>(null)
  const [editName, setEditName]     = useState('')
  const [editSlug, setEditSlug]     = useState('')
  const [editDesc, setEditDesc]     = useState('')
  const [editSaving, setEditSaving] = useState(false)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: adminKeys.productCollections() })

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const tok = await getToken()
      const res = await fetch(`${API}/api/admin/products/collections`, {
        method: 'POST',
        headers: headers(tok),
        body: JSON.stringify({ collection_name: newName, collection_slug: newSlug || slugify(newName), description: newDesc || null }),
      })
      if (!res.ok) throw new Error(await res.json().then((b: { error?: string }) => b.error ?? 'Failed'))
      await invalidate()
      toastSuccess('Collection created')
      setCreating(false); setNewName(''); setNewSlug(''); setNewDesc('')
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : 'Failed to create collection')
    } finally { setSaving(false) }
  }

  async function handleEdit(id: string) {
    setEditSaving(true)
    try {
      const tok = await getToken()
      const res = await fetch(`${API}/api/admin/products/collections/${id}`, {
        method: 'PATCH',
        headers: headers(tok),
        body: JSON.stringify({ collection_name: editName, collection_slug: editSlug, description: editDesc || null }),
      })
      if (!res.ok) throw new Error(await res.json().then((b: { error?: string }) => b.error ?? 'Failed'))
      await invalidate()
      toastSuccess('Collection updated')
      setEditId(null)
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : 'Failed to update collection')
    } finally { setEditSaving(false) }
  }

  async function handleDelete(id: string, name: string) {
    try {
      const tok = await getToken()
      const res = await fetch(`${API}/api/admin/products/collections/${id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${tok}` },
      })
      if (!res.ok) throw new Error(await res.json().then((b: { error?: string }) => b.error ?? 'Failed'))
      await invalidate()
      toastSuccess(`Collection "${name}" deleted`)
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : 'Failed to delete collection')
    }
  }

  function startEdit(c: AdminCollection) {
    setEditId(c.collection_id); setEditName(c.collection_name)
    setEditSlug(c.collection_slug); setEditDesc(c.description ?? '')
  }

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <AdminBreadcrumb crumbs={[
        { label: 'Products', href: '/admin/products' },
        { label: 'Collections' },
      ]} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Collections</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Group products into curated collections</p>
        </div>
        <Button onClick={() => setCreating(true)} className="flex items-center gap-1.5 text-sm">
          <Plus className="w-4 h-4" /> New Collection
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 overflow-x-auto shadow-sm">
        <table className="w-full text-sm min-w-lg">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50">
              <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Name</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Slug</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Description</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
              <th className="px-5 py-3 w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
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
                    <Button type="submit" variant="ghost" size="icon-sm" disabled={!newName || saving} aria-label="Save" className="text-green-600 hover:text-green-700 hover:bg-green-50">
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon-sm" aria-label="Cancel" onClick={() => { setCreating(false); setNewName(''); setNewSlug(''); setNewDesc('') }}>
                      <X className="w-4 h-4" />
                    </Button>
                  </form>
                </td>
              </tr>
            )}
            {loading ? (
              <TableBodySpinner colSpan={5} />
            ) : collections.length === 0 && !creating ? (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-zinc-400">No collections yet.</td></tr>
            ) : (
              collections.map(c => (
                <tr key={c.collection_id} className="odd:bg-white even:bg-zinc-50 hover:!bg-zinc-200 transition-colors">
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
                          <Button type="button" variant="ghost" size="icon-sm" aria-label="Save" disabled={!editName || editSaving} onClick={() => handleEdit(c.collection_id)} className="text-green-600 hover:text-green-700 hover:bg-green-50">
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button type="button" variant="ghost" size="icon-sm" aria-label="Cancel edit" onClick={() => setEditId(null)}>
                            <X className="w-4 h-4" />
                          </Button>
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
                          <Button type="button" variant="ghost" size="icon-sm" aria-label="Edit collection" onClick={() => startEdit(c)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button type="button" variant="ghost" size="icon-sm" aria-label="Delete collection" onClick={() => handleDelete(c.collection_id, c.collection_name)} className="text-zinc-400 hover:text-red-600 hover:bg-red-50">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
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
