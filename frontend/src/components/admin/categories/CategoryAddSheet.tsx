'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Sheet } from '@/components/ui/sheet'
import { BoolToggle } from '@/components/admin/BoolToggle'
import { uploadProductImage } from '@/lib/upload-image'
import { toastPromise, toastError } from '@/lib/toast'
import { useAdminCategories } from '@/lib/query/hooks'
import type { Category } from '@/types/admin.types'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

const CATEGORY_TYPES = ['season', 'application', 'performance', 'position', 'terrain'] as const

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

interface Props {
  open:    boolean
  onClose: () => void
  onSaved: () => void
}

const EMPTY = {
  category_name:        '',
  category_slug:        '',
  category_type:        'application',
  parent_category_id:   '',
  description:          '',
  image:                '',
  sort_order:           '',
  is_active:            true,
  hidden_from_website:  false,
}

export function CategoryAddSheet({ open, onClose, onSaved }: Props) {
  const [form, setForm]         = useState({ ...EMPTY })
  const [saving, setSaving]     = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const { data: allCategories = [] } = useAdminCategories()
  const parentOptions = allCategories.filter((c: Category) => c.category_type === form.category_type)

  function set<K extends keyof typeof EMPTY>(key: K, val: (typeof EMPTY)[K]) {
    setForm(f => ({ ...f, [key]: val }))
  }

  function reset() {
    setForm({ ...EMPTY })
  }

  async function handleUpload(file: File) {
    setUploading(true)
    try {
      const url = await uploadProductImage(file, 'categories')
      set('image', url)
    } catch {
      toastError('Image upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function handleSave() {
    if (!form.category_name.trim()) return toastError('Category name is required')
    if (!form.category_slug.trim()) return toastError('Slug is required')
    setSaving(true)
    try {
      const { data: { session } } = await createClient().auth.getSession()
      const req = fetch(`${API}/api/admin/products/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
        body: JSON.stringify({
          category_name:       form.category_name.trim(),
          category_slug:       form.category_slug.trim(),
          category_type:       form.category_type,
          parent_category_id:  form.parent_category_id || null,
          description:         form.description || null,
          image:               form.image || null,
          sort_order:          form.sort_order !== '' ? Number(form.sort_order) : null,
          is_active:           form.is_active,
          hidden_from_website: form.hidden_from_website,
        }),
      }).then(async res => {
        if (!res.ok) {
          const b = await res.json().catch(() => ({})) as { error?: string }
          throw new Error(b.error ?? 'Failed to create category')
        }
        return res.json()
      })

      await toastPromise(req, {
        loading: 'Creating category…',
        success: 'Category created',
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
      title="New Category"
      width="w-full max-w-lg"
      footer={
        <>
          <button type="button" onClick={onClose}
            className="px-4 py-2 rounded-lg border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors">
            Cancel
          </button>
          <button type="button" disabled={saving} onClick={handleSave}
            className="px-4 py-2 rounded-lg bg-primary text-sm font-semibold text-zinc-900 hover:bg-primary/90 disabled:opacity-50 transition-colors">
            {saving ? 'Creating…' : 'Create Category'}
          </button>
        </>
      }
    >
      {/* Name + Slug */}
      <div>
        <label className={lbl}>Category Name <span className="text-red-500">*</span></label>
        <input value={form.category_name} onChange={e => { set('category_name', e.target.value); set('category_slug', slugify(e.target.value)) }}
          placeholder="e.g. All Season" className={inp} />
      </div>
      <div>
        <label className={lbl}>Slug <span className="text-red-500">*</span></label>
        <div className="flex items-center rounded-lg border border-zinc-300 overflow-hidden focus-within:ring-2 focus-within:ring-primary/30 bg-white">
          <span className="px-3 text-zinc-400 text-sm select-none border-r border-zinc-200 bg-zinc-50 py-2">/</span>
          <input value={form.category_slug} onChange={e => set('category_slug', e.target.value)}
            placeholder="all-season" className="flex-1 px-3 py-2 text-sm focus:outline-none bg-transparent" />
        </div>
      </div>

      {/* Type */}
      <div>
        <label className={lbl}>Category Type <span className="text-red-500">*</span></label>
        <select value={form.category_type} onChange={e => { set('category_type', e.target.value); set('parent_category_id', '') }} className={inp}>
          {CATEGORY_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </select>
      </div>

      {/* Parent Category */}
      <div>
        <label className={lbl}>Parent Category</label>
        <select value={form.parent_category_id} onChange={e => set('parent_category_id', e.target.value)} className={inp}>
          <option value="">— None —</option>
          {parentOptions.map((c: Category) => (
            <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
          ))}
        </select>
      </div>

      {/* Description */}
      <div>
        <label className={lbl}>Description</label>
        <textarea value={form.description} onChange={e => set('description', e.target.value)}
          rows={3} placeholder="Brief description…"
          className={`${inp} resize-none`} />
      </div>

      {/* Image */}
      <div>
        <label className={lbl}>Category Image</label>
        <div className="flex items-start gap-3">
          {form.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.image} alt="" className="w-16 h-16 rounded-lg object-contain border border-zinc-200 bg-zinc-50 p-1 shrink-0" />
          ) : (
            <div onClick={() => fileRef.current?.click()}
              className="w-16 h-16 rounded-lg border-2 border-dashed border-zinc-300 flex flex-col items-center justify-center text-zinc-400 text-xs shrink-0 cursor-pointer hover:border-primary transition-colors">
              <span className="text-lg leading-none">+</span>
              <span className="mt-0.5">Upload</span>
            </div>
          )}
          <div className="space-y-1.5 flex-1">
            <input value={form.image} onChange={e => set('image', e.target.value)}
              placeholder="https://…" className={inp} />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
              className="text-xs text-primary underline hover:no-underline disabled:opacity-50">
              {uploading ? 'Uploading…' : 'Upload image'}
            </button>
            {form.image && (
              <button type="button" onClick={() => set('image', '')} className="ml-3 text-xs text-red-500 underline hover:no-underline">
                Remove
              </button>
            )}
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} />
      </div>

      {/* Sort Order */}
      <div>
        <label className={lbl}>Sort Order</label>
        <input type="number" min={0} value={form.sort_order} onChange={e => set('sort_order', e.target.value)}
          placeholder="0" className={inp} />
      </div>

      {/* Booleans */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-zinc-700">Active</span>
            <p className="text-xs text-zinc-400">Assignable to products</p>
          </div>
          <BoolToggle initial={form.is_active} onToggle={async next => set('is_active', next)} />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-zinc-700">Hidden from Website</span>
            <p className="text-xs text-zinc-400">Not shown on storefront</p>
          </div>
          <BoolToggle initial={form.hidden_from_website} onToggle={async next => set('hidden_from_website', next)} />
        </div>
      </div>
    </Sheet>
  )
}
