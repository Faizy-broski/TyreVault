'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { AdminBreadcrumb } from '@/components/admin/AdminBreadcrumb'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Pencil, Trash2, Plus } from 'lucide-react'
import { toastPromise, toastError } from '@/lib/toast'
import { uploadProductImage } from '@/lib/upload-image'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

const CATEGORY_TYPES = ['season', 'application', 'performance', 'position', 'terrain'] as const
type CategoryType = typeof CATEGORY_TYPES[number]

interface Category {
  category_id:          string
  parent_category_id:   string | null
  category_name:        string
  category_slug:        string
  category_type:        CategoryType
  description:          string | null
  image:                string | null
  sort_order:           number | null
  is_active:            boolean
  hidden_from_website:  boolean
  created_at:           string
}

type FormState = {
  category_name:        string
  category_slug:        string
  category_type:        CategoryType
  parent_category_id:   string
  description:          string
  image:                string
  sort_order:           string
  is_active:            boolean
  hidden_from_website:  boolean
}

const EMPTY: FormState = {
  category_name: '', category_slug: '', category_type: 'application',
  parent_category_id: '', description: '', image: '', sort_order: '',
  is_active: true, hidden_from_website: false,
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

function categoryToForm(c: Category): FormState & { category_id: string } {
  return {
    category_id:         c.category_id,
    category_name:       c.category_name,
    category_slug:       c.category_slug,
    category_type:       c.category_type,
    parent_category_id:  c.parent_category_id ?? '',
    description:         c.description ?? '',
    image:               c.image ?? '',
    sort_order:          c.sort_order != null ? String(c.sort_order) : '',
    is_active:           c.is_active,
    hidden_from_website: c.hidden_from_website,
  }
}

// ── Category Form Dialog ────────────────────────────────────────────────────

function CategoryFormDialog({
  open, onClose, initial, token, categories, onSaved,
}: {
  open:       boolean
  onClose:    () => void
  initial:    (FormState & { category_id?: string }) | null
  token:      string
  categories: Category[]
  onSaved:    (c: Category) => void
}) {
  const [form, setForm]           = useState<FormState>(EMPTY)
  const [saving, setSaving]       = useState(false)
  const [uploading, setUploading] = useState(false)
  const imgRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (initial) setForm({ ...EMPTY, ...initial })
  }, [initial, open])

  function set(key: keyof FormState, val: string | boolean) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  async function uploadImage(file: File) {
    setUploading(true)
    try {
      const url = await uploadProductImage(file, 'categories')
      set('image', url)
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Upload failed')
    } finally { setUploading(false) }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.category_name.trim()) { toastError('Category name is required'); return }
    if (!form.category_slug.trim()) { toastError('Slug is required'); return }

    setSaving(true)
    const isEdit  = Boolean((initial as { category_id?: string })?.category_id)
    const editId  = (initial as { category_id?: string })?.category_id

    const body = {
      category_name:       form.category_name.trim(),
      category_slug:       form.category_slug.trim(),
      category_type:       form.category_type,
      parent_category_id:  form.parent_category_id || null,
      description:         form.description        || null,
      image:               form.image              || null,
      sort_order:          form.sort_order !== '' ? Number(form.sort_order) : null,
      is_active:           form.is_active,
      hidden_from_website: form.hidden_from_website,
    }

    const req = fetch(
      isEdit
        ? `${API}/api/admin/products/categories/${editId}`
        : `${API}/api/admin/products/categories`,
      {
        method:  isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify(body),
      }
    ).then(async res => {
      if (!res.ok) {
        const b = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(b.error ?? 'Failed to save')
      }
      return isEdit
        ? { ...initial, ...body, category_id: editId! } as Category
        : await res.json() as Category
    })

    try {
      const saved = await toastPromise(req, {
        loading: isEdit ? 'Saving category…'  : 'Creating category…',
        success: isEdit ? 'Category updated'  : 'Category created',
        error:   (err: unknown) => err instanceof Error ? err.message : 'Failed to save',
      })
      onSaved(saved)
      onClose()
    } catch { /* shown */ } finally { setSaving(false) }
  }

  const inp = 'w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white'
  const lbl = 'block text-sm font-medium text-zinc-700 mb-1'
  const isEdit = Boolean((initial as { category_id?: string })?.category_id)

  // Only offer parent options of the same type (exclude self)
  const parentOptions = categories.filter(c =>
    c.category_type === form.category_type &&
    c.category_id !== (initial as { category_id?: string })?.category_id
  )

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Category' : 'New Category'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-5 pt-1">

          {/* Name + Slug */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Category Name <span className="text-red-500">*</span></label>
              <Input
                value={form.category_name}
                onChange={e => {
                  set('category_name', e.target.value)
                  if (!isEdit) set('category_slug', slugify(e.target.value))
                }}
                placeholder="e.g. All Terrain"
                required
              />
            </div>
            <div>
              <label className={lbl}>Slug <span className="text-red-500">*</span></label>
              <div className="flex items-center rounded-lg border border-zinc-300 overflow-hidden focus-within:ring-2 focus-within:ring-primary/30">
                <span className="px-2 text-zinc-400 text-sm select-none border-r border-zinc-300 bg-zinc-50 py-2">/</span>
                <input
                  value={form.category_slug}
                  onChange={e => set('category_slug', e.target.value)}
                  placeholder="all-terrain"
                  required
                  className="flex-1 px-3 py-2 text-sm focus:outline-none bg-transparent"
                />
              </div>
            </div>
          </div>

          {/* Type + Parent */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Category Type <span className="text-red-500">*</span></label>
              <select value={form.category_type} onChange={e => { set('category_type', e.target.value); set('parent_category_id', '') }} className={inp} required>
                {CATEGORY_TYPES.map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={lbl}>Parent Category</label>
              <select value={form.parent_category_id} onChange={e => set('parent_category_id', e.target.value)} className={inp}>
                <option value="">— None (top-level) —</option>
                {parentOptions.map(c => (
                  <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
                ))}
              </select>
              {parentOptions.length === 0 && (
                <p className="mt-1 text-xs text-zinc-400">No other {form.category_type} categories to nest under.</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={lbl}>Description</label>
            <Textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={3}
              placeholder="Category page content shown on the website…"
              className="resize-none"
            />
          </div>

          {/* Image */}
          <div>
            <label className={lbl}>Category Image</label>
            <input ref={imgRef} type="file" accept="image/*" className="sr-only"
              onChange={async e => { const f = e.target.files?.[0]; if (f) await uploadImage(f); e.target.value = '' }}
            />
            {form.image ? (
              <div className="flex items-center gap-3 mb-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.image} alt="" className="h-14 w-14 object-cover rounded-lg border border-zinc-200 shrink-0" />
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => imgRef.current?.click()} disabled={uploading}>
                    {uploading ? 'Uploading…' : 'Replace'}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => set('image', '')} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => imgRef.current?.click()} disabled={uploading}
                className="flex items-center gap-2 rounded-lg border-2 border-dashed border-zinc-300 px-4 py-2.5 text-sm text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 transition-colors mb-2">
                {uploading ? 'Uploading…' : '+ Upload Image'}
              </button>
            )}
            <Input
              value={form.image}
              onChange={e => set('image', e.target.value)}
              placeholder="https://cdn.example.com/category.jpg"
              className="text-sm"
            />
          </div>

          {/* Sort Order */}
          <div className="max-w-[180px]">
            <label className={lbl}>Sort Order</label>
            <Input
              type="number"
              min={0}
              step={1}
              value={form.sort_order}
              onChange={e => set('sort_order', e.target.value)}
              placeholder="0"
              className="text-sm"
            />
            <p className="mt-1 text-xs text-zinc-400">Lower numbers appear first on the frontend.</p>
          </div>

          {/* Active + Hidden from Website */}
          <div className="flex flex-col gap-3">
            <label className={lbl}>Visibility</label>
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={e => set('is_active', e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 text-primary accent-primary cursor-pointer"
              />
              <span className="text-sm text-zinc-700">Active</span>
              <span className="text-xs text-zinc-400">(assignable to products)</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.hidden_from_website}
                onChange={e => set('hidden_from_website', e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 text-primary accent-primary cursor-pointer"
              />
              <span className="text-sm text-zinc-700">Hidden from Website</span>
              <span className="text-xs text-zinc-400">(not shown on storefront)</span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Category'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Delete confirm ──────────────────────────────────────────────────────────

function DeleteDialog({
  target, token, onDeleted, onClose,
}: {
  target:    Category | null
  token:     string
  onDeleted: (id: string) => void
  onClose:   () => void
}) {
  const [deleting, setDeleting] = useState(false)

  async function confirm() {
    if (!target) return
    setDeleting(true)
    const req = fetch(`${API}/api/admin/products/categories/${target.category_id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }).then(async res => {
      if (!res.ok) throw new Error(await res.json().then((b: { error?: string }) => b.error ?? 'Failed'))
    })
    try {
      await toastPromise(req, {
        loading: `Deleting "${target.category_name}"…`,
        success: `"${target.category_name}" deleted`,
        error:   (err: unknown) => err instanceof Error ? err.message : 'Failed to delete',
      })
      onDeleted(target.category_id)
      onClose()
    } catch { /* shown */ } finally { setDeleting(false) }
  }

  return (
    <Dialog open={Boolean(target)} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Delete Category</DialogTitle></DialogHeader>
        <p className="text-sm text-zinc-600">
          Delete <span className="font-semibold">{target?.category_name}</span>? This cannot be undone. Child categories will lose their parent reference.
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={deleting}>Cancel</Button>
          <Button variant="destructive" onClick={confirm} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function CategoriesPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading]       = useState(true)
  const [token, setToken]           = useState('')
  const [dialogForm, setDialogForm] = useState<(FormState & { category_id?: string }) | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [filterType, setFilterType] = useState<CategoryType | ''>('')

  useEffect(() => { document.title = 'Categories | Tyre Vault' }, [])

  useEffect(() => {
    async function load() {
      try {
        const { data: { session } } = await createClient().auth.getSession()
        const tok = session?.access_token ?? ''
        setToken(tok)
        const res = await fetch(`${API}/api/admin/products/categories`, {
          headers: { Authorization: `Bearer ${tok}` },
        })
        if (!res.ok) throw new Error('Failed to load categories')
        setCategories(await res.json())
      } catch (err) {
        toastError(err instanceof Error ? err.message : 'Failed to load categories')
      } finally { setLoading(false) }
    }
    load()
  }, [])

  function openCreate() {
    router.push('/admin/products/categories/new')
  }

  function openEdit(c: Category) {
    router.push(`/admin/products/categories/${c.category_id}/edit`)
  }

  function handleSaved(saved: Category) {
    setCategories(prev => {
      const idx = prev.findIndex(c => c.category_id === saved.category_id)
      if (idx === -1) return [...prev, saved]
      const next = [...prev]; next[idx] = saved; return next
    })
  }

  const displayed = filterType
    ? categories.filter(c => c.category_type === filterType)
    : categories

  // Build a map for parent names
  const nameMap = Object.fromEntries(categories.map(c => [c.category_id, c.category_name]))

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <AdminBreadcrumb crumbs={[
        { label: 'Products', href: '/admin/products' },
        { label: 'Categories' },
      ]} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Categories</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Classify tyres by season, application, performance, position, and terrain</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/products/import?type=categories"
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-300 bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-200 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            Bulk Import
          </Link>
          <Button onClick={() => router.push('/admin/products/categories/new')} className="flex items-center gap-1.5 text-sm shrink-0">
            <Plus className="w-4 h-4" /> New Category
          </Button>
        </div>
      </div>

      {/* Type filter pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterType('')}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${!filterType ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}
        >
          All ({categories.length})
        </button>
        {CATEGORY_TYPES.map(t => (
          <button
            key={t}
            onClick={() => setFilterType(t === filterType ? '' : t)}
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${filterType === t ? `${TYPE_COLOURS[t]} ring-1 ring-inset ring-current` : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}
          >
            {t} ({categories.filter(c => c.category_type === t).length})
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 overflow-x-auto shadow-sm">
        <table className="w-full text-sm">
          <thead>
<<<<<<< Updated upstream
            <tr className="border-b border-zinc-100 bg-zinc-50">
              <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Name</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Slug</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Type</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Parent</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Description</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Order</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Status</th>
              <th className="px-5 py-3 w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-300">
=======
            <tr className="border-b border-zinc-200 bg-primary/10">
              <th className="px-5 py-3 text-left text-xs font-bold text-zinc-800 uppercase tracking-wide">Name</th>
              <th className="px-5 py-3 text-left text-xs font-bold text-zinc-800 uppercase tracking-wide">Slug</th>
              <th className="px-5 py-3 text-left text-xs font-bold text-zinc-800 uppercase tracking-wide">Type</th>
              <th className="px-5 py-3 text-left text-xs font-bold text-zinc-800 uppercase tracking-wide">Status</th>
              <th className="px-5 py-3 text-left text-xs font-bold text-zinc-800 uppercase tracking-wide">Visibility</th>
              <th className="px-5 py-3 w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
>>>>>>> Stashed changes
            {loading ? (
              <>
                {[1,2,3,4].map(i => (
                  <tr key={i}>
                    {[1,2,3,4,5].map(j => (
                      <td key={j} className="px-5 py-3"><div className="h-4 bg-zinc-100 rounded animate-pulse" style={{ width: `${60 + j * 10}px` }} /></td>
                    ))}
                    <td className="px-5 py-3" />
                  </tr>
                ))}
              </>
            ) : displayed.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-zinc-400">
                  {filterType ? `No ${filterType} categories yet.` : 'No categories yet.'}
                </td>
              </tr>
            ) : (
              displayed.map(c => (
<<<<<<< Updated upstream
                <tr key={c.category_id} className="odd:bg-white even:bg-zinc-200 [&:hover]:bg-amber-100 transition-colors duration-150">
=======
                <tr key={c.category_id} className="odd:bg-white even:bg-zinc-50 hover:!bg-zinc-200 transition-colors">
>>>>>>> Stashed changes
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      {c.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.image} alt="" className="h-7 w-7 object-cover rounded border border-zinc-200 shrink-0" />
                      )}
                      <span className="font-medium text-zinc-900">{c.category_name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-zinc-500">{c.category_slug}</td>
                  <td className="px-5 py-3">
                    <Badge className={`text-xs rounded-full border-0 capitalize ${TYPE_COLOURS[c.category_type]}`}>
                      {c.category_type}
                    </Badge>
                  </td>
                  <td className="px-5 py-3">
                    <Badge className={`text-xs rounded-full border-0 ${c.is_active ? 'bg-green-50 text-green-700' : 'bg-zinc-100 text-zinc-500'}`}>
                      {c.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-5 py-3">
                    <Badge className={`text-xs rounded-full border-0 ${c.hidden_from_website ? 'bg-zinc-100 text-zinc-500' : 'bg-blue-50 text-blue-700'}`}>
                      {c.hidden_from_website ? 'Hidden' : 'Visible'}
                    </Badge>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <Button type="button" variant="ghost" size="icon-sm" aria-label="Edit" onClick={() => openEdit(c)}
                        className="text-zinc-400 hover:text-blue-600 hover:bg-blue-50">
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon-sm" aria-label="Delete" onClick={() => setDeleteTarget(c)}
                        className="text-zinc-400 hover:text-red-600 hover:bg-red-50">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <CategoryFormDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setDialogForm(null) }}
        initial={dialogForm}
        token={token}
        categories={categories}
        onSaved={handleSaved}
      />

      <DeleteDialog
        target={deleteTarget}
        token={token}
        onDeleted={id => setCategories(prev => prev.filter(c => c.category_id !== id))}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}

