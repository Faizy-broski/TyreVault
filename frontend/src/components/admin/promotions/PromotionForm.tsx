'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { toastSuccess, toastError } from '@/lib/toast'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export interface PromotionFormValues {
  title:             string
  brand_name:        string
  description:       string
  cta_url:           string
  discount_type:     'percent' | 'fixed_amount' | 'bundle'
  discount_value:    string
  start_date:        string
  end_date:          string
  applies_to:        string
  target_id:         string
  minimum_qty:       string
  display_order:     string
  show_on_homepage:  boolean
  is_active:         boolean
  image_url:         string
}

type Brand    = { brand_id: string; brand_name: string }
type Category = { category_id: string; category_name: string; category_type: string }

const EMPTY: PromotionFormValues = {
  title: '', brand_name: '', description: '', cta_url: '',
  discount_type: 'percent', discount_value: '0',
  start_date: '', end_date: '',
  applies_to: 'brand', target_id: '',
  minimum_qty: '1', display_order: '0',
  show_on_homepage: true, is_active: true, image_url: '',
}

async function getToken(): Promise<string> {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.access_token ?? ''
}

async function uploadImage(file: File, promotionId: string): Promise<string> {
  const ext    = file.name.split('.').pop() ?? 'jpg'
  const path   = `deals/${promotionId}/hero.${ext}`
  const client = createClient()

  const { error } = await client.storage
    .from('product-images')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (error) throw new Error(`Image upload failed: ${error.message}`)

  const { data } = client.storage.from('product-images').getPublicUrl(path)
  return data.publicUrl
}

interface Props {
  mode:           'create' | 'edit'
  promotionId?:   string
  initialValues?: Partial<PromotionFormValues>
}

export default function PromotionForm({ mode, promotionId, initialValues }: Props) {
  const router = useRouter()

  const [values,     setValues]     = useState<PromotionFormValues>({ ...EMPTY, ...initialValues })
  const [imageFile,  setImageFile]  = useState<File | null>(null)
  const [preview,    setPreview]    = useState<string>(initialValues?.image_url ?? '')
  const [submitting, setSubmitting] = useState(false)

  const [brands,     setBrands]     = useState<Brand[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [metaLoaded, setMetaLoaded] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)

  // Load brands + categories once for the scope selectors
  useEffect(() => {
    let cancelled = false
    async function loadMeta() {
      try {
        const tok = await getToken()
        const res = await fetch(`${API}/api/admin/products/meta`, {
          headers: { Authorization: `Bearer ${tok}` },
        })
        if (!res.ok) return
        const json = await res.json()
        if (!cancelled) {
          setBrands(json.brands     ?? [])
          setCategories(json.categories ?? [])
          setMetaLoaded(true)
        }
      } catch { /* non-fatal — text fallback still shown */ }
    }
    loadMeta()
    return () => { cancelled = true }
  }, [])

  function set<K extends keyof PromotionFormValues>(key: K, val: PromotionFormValues[K]) {
    setValues(prev => ({ ...prev, [key]: val }))
  }

  function onScopeChange(newScope: string) {
    // Clear target when scope changes so stale IDs don't carry over
    setValues(prev => ({ ...prev, applies_to: newScope, target_id: '' }))
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toastError('Image must be under 5 MB'); return }
    setImageFile(file)
    setPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (Number(values.discount_value) <= 0) { toastError('Discount value must be greater than 0'); return }
    if (values.end_date < values.start_date) { toastError('End date must be on or after start date'); return }

    setSubmitting(true)
    try {
      const tok     = await getToken()
      const headers = { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' }

      const body = {
        title:            values.title,
        brand_name:       values.brand_name  || null,
        description:      values.description || null,
        cta_url:          values.cta_url     || null,
        discount_type:    values.discount_type,
        discount_value:   Number(values.discount_value),
        start_date:       values.start_date,
        end_date:         values.end_date,
        applies_to:       values.applies_to,
        target_id:        values.target_id   || null,
        minimum_qty:      Number(values.minimum_qty),
        display_order:    Number(values.display_order),
        show_on_homepage: values.show_on_homepage,
        is_active:        values.is_active,
        image_url:        values.image_url   || null,
      }

      let pid = promotionId

      if (mode === 'create') {
        const res  = await fetch(`${API}/api/admin/promotions`, { method: 'POST', headers, body: JSON.stringify(body) })
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `Create failed (${res.status})`)
        const json = await res.json()
        pid = json.promotion_id
      } else {
        const res = await fetch(`${API}/api/admin/promotions/${pid}`, { method: 'PATCH', headers, body: JSON.stringify(body) })
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `Update failed (${res.status})`)
      }

      if (imageFile && pid) {
        const url      = await uploadImage(imageFile, pid)
        const patchRes = await fetch(`${API}/api/admin/promotions/${pid}`, {
          method: 'PATCH', headers,
          body: JSON.stringify({ image_url: url }),
        })
        if (!patchRes.ok) toastError('Promotion saved but image URL could not be updated')
      }

      toastSuccess(mode === 'create' ? 'Promotion created' : 'Promotion updated')
      router.push('/admin/promotions')
      router.refresh()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const labelCls = 'block text-xs font-semibold text-zinc-600 mb-1'
  const inputCls = 'w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary'
  const toggleCls = (on: boolean) =>
    `relative inline-flex h-6 w-11 cursor-pointer rounded-full transition-colors ${on ? 'bg-primary' : 'bg-zinc-300'}`

  // ── Smart target selector based on scope ──────────────────────────────────
  function TargetSelector() {
    const scope = values.applies_to

    if (scope === 'brand') {
      return (
        <div>
          <label className={labelCls}>
            Brand <span className="text-red-500">*</span>
          </label>
          {!metaLoaded ? (
            <div className="h-9 animate-pulse rounded-lg bg-zinc-100" />
          ) : (
            <select
              required
              className={inputCls}
              value={values.target_id}
              onChange={e => set('target_id', e.target.value)}
            >
              <option value="">— Select brand —</option>
              {brands.map(b => (
                <option key={b.brand_id} value={b.brand_id}>{b.brand_name}</option>
              ))}
            </select>
          )}
        </div>
      )
    }

    if (scope === 'category') {
      return (
        <div>
          <label className={labelCls}>
            Category <span className="text-red-500">*</span>
          </label>
          {!metaLoaded ? (
            <div className="h-9 animate-pulse rounded-lg bg-zinc-100" />
          ) : (
            <select
              required
              className={inputCls}
              value={values.target_id}
              onChange={e => set('target_id', e.target.value)}
            >
              <option value="">— Select category —</option>
              {categories.map(c => (
                <option key={c.category_id} value={c.category_id}>
                  {c.category_name}{c.category_type ? ` (${c.category_type})` : ''}
                </option>
              ))}
            </select>
          )}
        </div>
      )
    }

    if (scope === 'product') {
      return (
        <div>
          <label className={labelCls}>Product ID (UUID)</label>
          <input
            className={inputCls}
            value={values.target_id}
            onChange={e => set('target_id', e.target.value)}
            placeholder="Paste the product UUID from the Products page"
          />
          <p className="mt-1 text-xs text-zinc-400">
            Find the product ID on the product detail page URL: /admin/products/<strong>uuid</strong>
          </p>
        </div>
      )
    }

    if (scope === 'pattern') {
      return (
        <div>
          <label className={labelCls}>Pattern ID (UUID)</label>
          <input
            className={inputCls}
            value={values.target_id}
            onChange={e => set('target_id', e.target.value)}
            placeholder="Paste the pattern UUID"
          />
          <p className="mt-1 text-xs text-zinc-400">
            Applies the discount to all SKUs under that tyre pattern
          </p>
        </div>
      )
    }

    if (scope === 'customer_group') {
      return (
        <div>
          <label className={labelCls}>Customer Group ID</label>
          <input
            className={inputCls}
            value={values.target_id}
            onChange={e => set('target_id', e.target.value)}
            placeholder="Leave blank to apply to all customers"
          />
        </div>
      )
    }

    return null
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* ── Core Info ─────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-zinc-900">Promotion Details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelCls}>Title <span className="text-red-500">*</span></label>
            <input required className={inputCls} value={values.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Up to Rs. 5,000 Off" />
          </div>
          <div>
            <label className={labelCls}>Brand pill label</label>
            <input className={inputCls} value={values.brand_name} onChange={e => set('brand_name', e.target.value)} placeholder="e.g. Michelin (shown on the deal card)" />
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <input className={inputCls} value={values.description} onChange={e => set('description', e.target.value)} placeholder="Short subtitle on the card" />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>CTA URL</label>
            <input className={inputCls} type="url" value={values.cta_url} onChange={e => set('cta_url', e.target.value)} placeholder="https://… (makes deal card clickable)" />
          </div>
        </div>
      </section>

      {/* ── Hero Image ────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-zinc-900">Hero Image</h2>
          <span className="text-xs text-zinc-400">Stored in <code className="bg-zinc-100 px-1 py-0.5 rounded">product-images/deals/</code></span>
        </div>
        <div className="flex items-start gap-5">
          {preview ? (
            <div className="relative h-28 w-24 flex-shrink-0 overflow-hidden rounded-xl border border-zinc-200">
              <Image src={preview} alt="Preview" fill className="object-cover" unoptimized={preview.startsWith('blob:')} />
            </div>
          ) : (
            <div className="flex h-28 w-24 flex-shrink-0 items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 text-zinc-400 text-xs text-center p-2">
              No image
            </div>
          )}
          <div>
            <button type="button" onClick={() => fileRef.current?.click()}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors">
              {preview ? 'Change image' : 'Upload image'}
            </button>
            <p className="mt-1.5 text-xs text-zinc-400">JPEG, PNG or WebP · max 5 MB</p>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onFileChange} />
            {preview && !imageFile && (
              <p className="mt-1 text-xs text-zinc-400 break-all max-w-xs truncate">{values.image_url}</p>
            )}
          </div>
        </div>
      </section>

      {/* ── Discount ──────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-zinc-900">Discount</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelCls}>Type <span className="text-red-500">*</span></label>
            <select required className={inputCls} value={values.discount_type} onChange={e => set('discount_type', e.target.value as PromotionFormValues['discount_type'])}>
              <option value="percent">Percentage (%)</option>
              <option value="fixed_amount">Fixed Amount (Rs.)</option>
              <option value="bundle">Bundle</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Value <span className="text-red-500">*</span></label>
            <input required type="number" min="0.01" step="0.01" className={inputCls}
              value={values.discount_value} onChange={e => set('discount_value', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Minimum qty</label>
            <input type="number" min="1" step="1" className={inputCls}
              value={values.minimum_qty} onChange={e => set('minimum_qty', e.target.value)} />
          </div>
        </div>
      </section>

      {/* ── Dates ─────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-zinc-900">Active Period</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Start date <span className="text-red-500">*</span></label>
            <input required type="date" className={inputCls} value={values.start_date} onChange={e => set('start_date', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>End date <span className="text-red-500">*</span></label>
            <input required type="date" className={inputCls} value={values.end_date} onChange={e => set('end_date', e.target.value)} />
          </div>
        </div>
      </section>

      {/* ── Discount Scope ────────────────────────────────────────── */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold text-zinc-900">Discount Scope</h2>
        <p className="mb-4 text-xs text-zinc-400">Controls which products the discount applies to at checkout.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Applies to</label>
            <select
              className={inputCls}
              value={values.applies_to}
              onChange={e => onScopeChange(e.target.value)}
            >
              <option value="brand">Brand — all products from a brand</option>
              <option value="product">Product — a single tyre product</option>
              <option value="pattern">Pattern — all sizes of a tyre pattern</option>
              <option value="category">Category — a product category</option>
              <option value="customer_group">Customer Group</option>
            </select>
          </div>
          <TargetSelector />
        </div>
      </section>

      {/* ── Display ───────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-zinc-900">Display Settings</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Display order</label>
            <input type="number" min="0" step="1" className={inputCls}
              value={values.display_order} onChange={e => set('display_order', e.target.value)} />
            <p className="mt-1 text-xs text-zinc-400">Lower number = appears first in the carousel</p>
          </div>
          <div className="flex flex-col gap-4 pt-1">
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span className="text-sm font-medium text-zinc-700">Show on homepage carousel</span>
              <button type="button" role="switch" aria-checked={values.show_on_homepage}
                className={toggleCls(values.show_on_homepage)}
                onClick={() => set('show_on_homepage', !values.show_on_homepage)}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${values.show_on_homepage ? 'left-5' : 'left-0.5'}`} />
              </button>
            </label>
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span className="text-sm font-medium text-zinc-700">Active (discount applies at checkout)</span>
              <button type="button" role="switch" aria-checked={values.is_active}
                className={toggleCls(values.is_active)}
                onClick={() => set('is_active', !values.is_active)}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${values.is_active ? 'left-5' : 'left-0.5'}`} />
              </button>
            </label>
          </div>
        </div>
      </section>

      {/* ── Actions ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-3 pb-10">
        <button type="button" onClick={() => router.back()}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={submitting}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-zinc-900 hover:bg-[#c89907] transition-colors disabled:opacity-60">
          {submitting
            ? (mode === 'create' ? 'Creating…' : 'Saving…')
            : (mode === 'create' ? 'Create Promotion' : 'Save Changes')}
        </button>
      </div>
    </form>
  )
}
