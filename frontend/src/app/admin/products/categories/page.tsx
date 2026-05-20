'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminBreadcrumb } from '@/components/admin/AdminBreadcrumb'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pencil, Trash2, Plus, X, Check } from 'lucide-react'
import { toastSuccess, toastError } from '@/lib/toast'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

const CATEGORY_TYPES = ['season', 'application', 'performance', 'position', 'terrain'] as const
type CategoryType = typeof CATEGORY_TYPES[number]

type Category = {
  category_id: string
  category_name: string
  category_slug: string
  category_type: CategoryType
  description: string | null
  is_active: boolean
  sort_order: number
  created_at: string
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

const TYPE_COLOURS: Record<CategoryType, string> = {
  season:      'bg-blue-50 text-blue-700',
  application: 'bg-purple-50 text-purple-700',
  performance: 'bg-amber-50 text-amber-700',
  position:    'bg-teal-50 text-teal-700',
  terrain:     'bg-orange-50 text-orange-700',
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading]       = useState(true)
  const [token, setToken]           = useState('')

  const [creating, setCreating]     = useState(false)
  const [newName, setNewName]       = useState('')
  const [newSlug, setNewSlug]       = useState('')
  const [newType, setNewType]       = useState<CategoryType>('application')
  const [newDesc, setNewDesc]       = useState('')
  const [saving, setSaving]         = useState(false)

  const [editId, setEditId]         = useState<string | null>(null)
  const [editName, setEditName]     = useState('')
  const [editSlug, setEditSlug]     = useState('')
  const [editType, setEditType]     = useState<CategoryType>('application')
  const [editDesc, setEditDesc]     = useState('')
  const [editSaving, setEditSaving] = useState(false)

  useEffect(() => { document.title = 'Categories | Tyre Vault' }, [])

  useEffect(() => {
    async function load() {
      const { data: { session } } = await createClient().auth.getSession()
      const tok = session?.access_token ?? ''
      setToken(tok)
      const res = await fetch(`${API}/api/admin/products/categories`, {
        headers: { Authorization: `Bearer ${tok}` },
      })
      if (!res.ok) { toastError('Failed to load categories'); setLoading(false); return }
      setCategories(await res.json())
      setLoading(false)
    }
    load()
  }, [])

  const headers = (tok: string) => ({ Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' })

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`${API}/api/admin/products/categories`, {
        method: 'POST', headers: headers(token),
        body: JSON.stringify({ category_name: newName, category_slug: newSlug || slugify(newName), category_type: newType, description: newDesc || null }),
      })
      if (!res.ok) throw new Error(await res.json().then((b: { error?: string }) => b.error ?? 'Failed'))
      const created: Category = await res.json()
      setCategories(prev => [...prev, created])
      toastSuccess('Category created')
      setCreating(false); setNewName(''); setNewSlug(''); setNewDesc(''); setNewType('application')
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : 'Failed to create category')
    } finally { setSaving(false) }
  }

  async function handleEdit(id: string) {
    setEditSaving(true)
    try {
      const res = await fetch(`${API}/api/admin/products/categories/${id}`, {
        method: 'PATCH', headers: headers(token),
        body: JSON.stringify({ category_name: editName, category_slug: editSlug, category_type: editType, description: editDesc || null }),
      })
      if (!res.ok) throw new Error(await res.json().then((b: { error?: string }) => b.error ?? 'Failed'))
      setCategories(prev => prev.map(c => c.category_id === id
        ? { ...c, category_name: editName, category_slug: editSlug, category_type: editType, description: editDesc || null }
        : c
      ))
      toastSuccess('Category updated')
      setEditId(null)
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : 'Failed to update category')
    } finally { setEditSaving(false) }
  }

  async function handleDelete(id: string, name: string) {
    try {
      const res = await fetch(`${API}/api/admin/products/categories/${id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(await res.json().then((b: { error?: string }) => b.error ?? 'Failed'))
      setCategories(prev => prev.filter(c => c.category_id !== id))
      toastSuccess(`Category "${name}" deleted`)
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : 'Failed to delete category')
    }
  }

  function startEdit(c: Category) {
    setEditId(c.category_id); setEditName(c.category_name)
    setEditSlug(c.category_slug); setEditType(c.category_type); setEditDesc(c.description ?? '')
  }

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <AdminBreadcrumb crumbs={[
        { label: 'Products', href: '/admin/products' },
        { label: 'Categories' },
      ]} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Categories</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Classify tyres by season, application, performance, and more</p>
        </div>
        <Button onClick={() => setCreating(true)} className="flex items-center gap-1.5 text-sm">
          <Plus className="w-4 h-4" /> New Category
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 overflow-x-auto shadow-sm">
        <table className="w-full text-sm min-w-160">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50">
              <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Name</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Slug</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Type</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Description</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Status</th>
              <th className="px-5 py-3 w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {creating && (
              <tr>
                <td className="px-5 py-3">
                  <Input value={newName} onChange={e => { setNewName(e.target.value); if (!newSlug) setNewSlug(slugify(e.target.value)) }}
                    placeholder="Category name" className="h-8 text-sm" autoFocus />
                </td>
                <td className="px-5 py-3">
                  <Input value={newSlug} onChange={e => setNewSlug(e.target.value)} placeholder="slug" className="h-8 text-sm font-mono" />
                </td>
                <td className="px-5 py-3">
                  <select value={newType} onChange={e => setNewType(e.target.value as CategoryType)}
                    className="h-8 rounded-lg border border-zinc-300 px-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30">
                    {CATEGORY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </td>
                <td className="px-5 py-3">
                  <Input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Optional" className="h-8 text-sm" />
                </td>
                <td className="px-5 py-3" />
                <td className="px-5 py-3">
                  <form onSubmit={handleCreate} className="flex items-center gap-1">
                    <Button type="submit" variant="ghost" size="icon-sm" disabled={!newName || saving} aria-label="Save" className="text-green-600 hover:text-green-700 hover:bg-green-50">
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon-sm" aria-label="Cancel" onClick={() => { setCreating(false); setNewName(''); setNewSlug('') }}>
                      <X className="w-4 h-4" />
                    </Button>
                  </form>
                </td>
              </tr>
            )}
            {loading ? (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-zinc-400">Loading…</td></tr>
            ) : categories.length === 0 && !creating ? (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-zinc-400">No categories yet.</td></tr>
            ) : (
              categories.map(c => (
                <tr key={c.category_id} className="even:bg-zinc-50/40 hover:bg-amber-50/30 transition-colors duration-150">
                  {editId === c.category_id ? (
                    <>
                      <td className="px-5 py-2">
                        <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-8 text-sm" autoFocus />
                      </td>
                      <td className="px-5 py-2">
                        <Input value={editSlug} onChange={e => setEditSlug(e.target.value)} className="h-8 text-sm font-mono" />
                      </td>
                      <td className="px-5 py-2">
                        <select value={editType} onChange={e => setEditType(e.target.value as CategoryType)}
                          className="h-8 rounded-lg border border-zinc-300 px-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30">
                          {CATEGORY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </td>
                      <td className="px-5 py-2">
                        <Input value={editDesc} onChange={e => setEditDesc(e.target.value)} className="h-8 text-sm" />
                      </td>
                      <td className="px-5 py-2" />
                      <td className="px-5 py-2">
                        <div className="flex items-center gap-1">
                          <Button type="button" variant="ghost" size="icon-sm" aria-label="Save" disabled={!editName || editSaving} onClick={() => handleEdit(c.category_id)} className="text-green-600 hover:text-green-700 hover:bg-green-50">
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
                      <td className="px-5 py-3 font-medium text-zinc-900">{c.category_name}</td>
                      <td className="px-5 py-3 font-mono text-xs text-zinc-500">{c.category_slug}</td>
                      <td className="px-5 py-3">
                        <Badge className={`text-xs rounded-full border-0 capitalize ${TYPE_COLOURS[c.category_type]}`}>
                          {c.category_type}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-zinc-500 max-w-xs truncate">{c.description ?? '—'}</td>
                      <td className="px-5 py-3">
                        <Badge className={`text-xs rounded-full border-0 ${c.is_active ? 'bg-green-50 text-green-700' : 'bg-zinc-100 text-zinc-500'}`}>
                          {c.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          <Button type="button" variant="ghost" size="icon-sm" aria-label="Edit category" onClick={() => startEdit(c)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button type="button" variant="ghost" size="icon-sm" aria-label="Delete category" onClick={() => handleDelete(c.category_id, c.category_name)} className="text-zinc-400 hover:text-red-600 hover:bg-red-50">
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
