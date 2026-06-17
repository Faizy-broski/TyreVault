'use client'

import { useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AdminBreadcrumb } from '@/components/admin/AdminBreadcrumb'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { toastPromise, toastError } from '@/lib/toast'
import { uploadProductImage } from '@/lib/upload-image'
import { Check, ChevronDown } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

import { CreatableCombobox, ComboOption } from '@/components/ui/CreatableCombobox'

export type PatternAttribute = {
  id: string
  attribute_type: string
  attribute_value: string
}

export type PatternFormState = {
  pattern_name:              string
  pattern_slug:              string
  pattern_short_description: string
  pattern_description:       string
  main_image:                string
  application_type:          string
  season_type:               string
  performance_category:      string
  position_category:         string
  shoulder_type:             string
  terrain_type:              string
  default_country_of_origin: string
  warranty_km:               string
  seo_title:                 string
  seo_description:           string
  tyre_overview:             string
  features:                  string
  warranty_information:      string
  is_active:                 boolean
  show_on_website:           boolean
  on_sale:                   boolean
  discountable:              boolean
  category_ids:              string[]
}

export const EMPTY_PATTERN_FORM: PatternFormState = {
  pattern_name: '', pattern_slug: '', pattern_short_description: '', pattern_description: '',
  main_image: '', application_type: 'passenger', season_type: '', performance_category: '',
  position_category: '', shoulder_type: '', terrain_type: '', default_country_of_origin: '',
  warranty_km: '', seo_title: '', seo_description: '', tyre_overview: '', features: '',
  warranty_information: '', is_active: true, show_on_website: true, on_sale: false, discountable: true,
  category_ids: [],
}

type CategoryOption = { category_id: string; category_name: string; category_type: string }

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

type BrandOption = { brand_id: string; brand_name: string }

interface Props {
  brandId:    string
  brandName?: string
  brands?:    BrandOption[]
  patternId?: string
  initial:    PatternFormState
}

export default function PatternForm({ brandId: initialBrandId, brandName: initialBrandName, brands = [], patternId, initial }: Props) {
  const router = useRouter()
  const [form, setForm]               = useState<PatternFormState>(initial)
  const [selectedBrandId, setSelectedBrandId] = useState(initialBrandId)
  const [saving, setSaving]           = useState(false)
  const [uploading, setUploading]     = useState(false)
  const [categories, setCategoriesList] = useState<CategoryOption[]>([])
  const [catLoading, setCatLoading]     = useState(true)
  const [catSearch, setCatSearch]       = useState('')
  const [attributes, setAttributes]     = useState<PatternAttribute[]>([])
  const imgRef = useRef<HTMLInputElement>(null)
  const isEdit = Boolean(patternId)

  const brandId   = selectedBrandId
  const brandName = brands.find(b => b.brand_id === brandId)?.brand_name ?? initialBrandName ?? ''

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { session } } = await createClient().auth.getSession()
        const tok = session?.access_token ?? ''
        
        const [catRes, attrRes] = await Promise.all([
          fetch(`${API}/api/admin/products/categories`, { headers: { Authorization: `Bearer ${tok}` } }),
          fetch(`${API}/api/admin/products/attributes`, { headers: { Authorization: `Bearer ${tok}` } })
        ])
        
        if (catRes.ok) setCategoriesList(await catRes.json())
        if (attrRes.ok) setAttributes(await attrRes.json())
      } catch { /* non-critical */ } finally { setCatLoading(false) }
    }
    loadData()
  }, [])

  const getOptions = (type: string): ComboOption[] => 
    attributes.filter(a => a.attribute_type === type).map(a => ({ value: a.attribute_value, label: a.attribute_value }))

  async function handleCreateAttr(type: string, value: string): Promise<ComboOption> {
    const { data: { session } } = await createClient().auth.getSession()
    const tok = session?.access_token ?? ''
    const res = await fetch(`${API}/api/admin/products/attributes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
      body: JSON.stringify({ attribute_type: type, attribute_value: value })
    })
    if (!res.ok) throw new Error('Failed to create attribute')
    const created = await res.json()
    setAttributes(prev => [...prev, created])
    return { value: created.attribute_value, label: created.attribute_value }
  }

  async function handleEditAttr(oldVal: string, newVal: string, type: string): Promise<ComboOption> {
    const attr = attributes.find(a => a.attribute_type === type && a.attribute_value === oldVal)
    if (!attr) throw new Error('Not found')
    const { data: { session } } = await createClient().auth.getSession()
    const tok = session?.access_token ?? ''
    const res = await fetch(`${API}/api/admin/products/attributes/${attr.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
      body: JSON.stringify({ attribute_value: newVal })
    })
    if (!res.ok) throw new Error('Failed to update attribute')
    setAttributes(prev => prev.map(a => a.id === attr.id ? { ...a, attribute_value: newVal } : a))
    return { value: newVal, label: newVal }
  }

  async function handleDeleteAttr(val: string, type: string): Promise<void> {
    const attr = attributes.find(a => a.attribute_type === type && a.attribute_value === val)
    if (!attr) throw new Error('Not found')
    const { data: { session } } = await createClient().auth.getSession()
    const tok = session?.access_token ?? ''
    const res = await fetch(`${API}/api/admin/products/attributes/${attr.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tok}` }
    })
    if (!res.ok) throw new Error('Failed to delete attribute')
    setAttributes(prev => prev.filter(a => a.id !== attr.id))
  }

  function set(key: keyof PatternFormState, val: string | boolean) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  function toggleCategory(id: string) {
    setForm(prev => ({
      ...prev,
      category_ids: prev.category_ids.includes(id)
        ? prev.category_ids.filter(c => c !== id)
        : [...prev.category_ids, id],
    }))
  }

  async function uploadImage(file: File) {
    setUploading(true)
    try {
      const url = await uploadProductImage(file, 'patterns')
      set('main_image', url)
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Upload failed')
    } finally { setUploading(false) }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!brandId)                   { toastError('Please select a brand'); return }
    if (!form.pattern_name.trim()) { toastError('Pattern name is required'); return }
    if (!form.pattern_slug.trim()) { toastError('Slug is required'); return }
    if (!form.application_type)    { toastError('Application type is required'); return }

    setSaving(true)
    const { data: { session } } = await createClient().auth.getSession()
    const token = session?.access_token ?? ''

    const url = isEdit
      ? `${API}/api/admin/products/brands/${brandId}/patterns/${patternId}`
      : `${API}/api/admin/products/brands/${brandId}/patterns`

    const body = {
      pattern_name:              form.pattern_name.trim(),
      pattern_slug:              form.pattern_slug.trim(),
      pattern_short_description: form.pattern_short_description || null,
      pattern_description:       form.pattern_description       || null,
      main_image:                form.main_image                || null,
      application_type:          form.application_type,
      season_type:               form.season_type               || null,
      performance_category:      form.performance_category      || null,
      position_category:         form.position_category         || null,
      shoulder_type:             form.shoulder_type             || null,
      terrain_type:              form.terrain_type              || null,
      default_country_of_origin: form.default_country_of_origin || null,
      warranty_km:               form.warranty_km ? Number(form.warranty_km) : null,
      seo_title:                 form.seo_title                 || null,
      seo_description:           form.seo_description           || null,
      tyre_overview:             form.tyre_overview             || null,
      features:                  form.features                  || null,
      warranty_information:      form.warranty_information       || null,
      is_active:                 form.is_active,
      show_on_website:           form.show_on_website,
      on_sale:                   form.on_sale,
      discountable:              form.discountable,
      category_ids:              form.category_ids,
    }

    const req = fetch(url, {
      method: isEdit ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    }).then(async res => {
      if (!res.ok) {
        const b = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(b.error ?? 'Failed to save pattern')
      }
      return res.json() as Promise<{ pattern_id?: string }>
    })

    try {
      const result = await toastPromise(req, {
        loading: isEdit ? 'Saving pattern…'  : 'Creating pattern…',
        success: isEdit ? 'Pattern updated'  : 'Pattern created',
        error:   (err: unknown) => err instanceof Error ? err.message : 'Failed to save pattern',
      })
      const resolvedPatternId = isEdit ? patternId : result?.pattern_id
      if (resolvedPatternId && brandId) {
        router.push(`/admin/products/brands/${brandId}/patterns/${resolvedPatternId}`)
      } else {
        router.push('/admin/products/patterns')
      }
    } catch { /* shown */ } finally { setSaving(false) }
  }

  const inp = 'w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-colors'
  const lbl = 'block text-xs font-semibold text-zinc-600 mb-1.5'

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <AdminBreadcrumb crumbs={[
          { label: 'Products', href: '/admin/products' },
          { label: 'Brands',   href: '/admin/products/brands' },
          ...(brandId && brandName ? [{ label: brandName, href: `/admin/products/brands/${brandId}` }] : []),
          { label: isEdit ? 'Edit Pattern' : 'New Pattern' },
        ]} />
        <div className="mt-4">
          <h1 className="text-xl font-bold text-zinc-900">{isEdit ? 'Edit Pattern' : 'New Pattern'}</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {isEdit ? 'Update pattern details.' : brandName ? `Add a new tyre pattern under ${brandName}.` : 'Add a new tyre pattern to the catalogue.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* ── Two-column layout ─────────────────────────────────────────────── */}
        <div className="flex flex-col xl:flex-row gap-5 items-start">

          {/* ── LEFT: main content ────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-5">

            {/* Brand + Identity */}
            <Card title="Identity" description="Pattern name, slug, and marketing copy.">
              <div className="space-y-4">
                {!isEdit && brands.length > 0 && (
                  <div>
                    <label className={lbl}>Brand <Req /></label>
                    <select value={selectedBrandId} onChange={e => setSelectedBrandId(e.target.value)} className={inp} required>
                      <option value="">— Select brand —</option>
                      {brands.map(b => <option key={b.brand_id} value={b.brand_id}>{b.brand_name}</option>)}
                    </select>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={lbl}>Pattern Name <Req /></label>
                    <input type="text" required value={form.pattern_name}
                      onChange={e => { set('pattern_name', e.target.value); if (!isEdit) set('pattern_slug', slugify(e.target.value)) }}
                      placeholder="e.g. COLO H/T" className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Slug <Req /></label>
                    <div className="flex items-center rounded-xl border border-zinc-200 overflow-hidden focus-within:ring-2 focus-within:ring-primary/30 bg-white">
                      <span className="px-3 text-zinc-400 text-sm select-none border-r border-zinc-200 bg-zinc-50 py-2.5">/</span>
                      <input value={form.pattern_slug} onChange={e => set('pattern_slug', e.target.value)}
                        placeholder="colo-h-t" required className="flex-1 px-3 py-2.5 text-sm focus:outline-none bg-transparent" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className={lbl}>Short Description</label>
                  <Textarea value={form.pattern_short_description} onChange={e => set('pattern_short_description', e.target.value)}
                    rows={2} placeholder="Brief intro shown in listings…" className="resize-none" />
                </div>
                <div>
                  <label className={lbl}>Full Description</label>
                  <Textarea value={form.pattern_description} onChange={e => set('pattern_description', e.target.value)}
                    rows={3} placeholder="Detailed description…" className="resize-none" />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={lbl}>Tyre Overview</label>
                    <Textarea value={form.tyre_overview} onChange={e => set('tyre_overview', e.target.value)}
                      rows={2} placeholder="Overview copy…" className="resize-none" />
                  </div>
                  <div>
                    <label className={lbl}>Key Features</label>
                    <Textarea value={form.features} onChange={e => set('features', e.target.value)}
                      rows={2} placeholder="Bullet-point features…" className="resize-none" />
                  </div>
                </div>
              </div>
            </Card>

            {/* Categories */}
            <Card title="Categories" description="Assign this pattern to a product category.">
              {catLoading ? (
                <div className="h-[38px] rounded-lg bg-zinc-100 animate-pulse w-full" />
              ) : categories.length === 0 ? (
                <p className="text-xs text-zinc-400">No categories found. Create categories under Products → Categories first.</p>
              ) : (
                <Select
                  value={form.category_ids[0] || ''}
                  onValueChange={(val) => setForm(prev => ({ ...prev, category_ids: val ? [val] : [] }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a category..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(c => (
                      <SelectItem key={c.category_id} value={c.category_id}>
                        {c.category_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </Card>

            {/* Specifications */}
            <Card title="Specifications" description="Application, season, and tyre classification.">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div>
                  <label className={lbl}>Application <Req /></label>
                  <CreatableCombobox
                    value={form.application_type}
                    onChange={v => set('application_type', v)}
                    options={getOptions('application')}
                    onCreate={v => handleCreateAttr('application', v)}
                    onEdit={(oldV, newV) => handleEditAttr(oldV, newV, 'application')}
                    onDelete={v => handleDeleteAttr(v, 'application')}
                  />
                </div>
                <div>
                  <label className={lbl}>Season</label>
                  <CreatableCombobox
                    value={form.season_type}
                    onChange={v => set('season_type', v)}
                    options={getOptions('season')}
                    onCreate={v => handleCreateAttr('season', v)}
                    onEdit={(oldV, newV) => handleEditAttr(oldV, newV, 'season')}
                    onDelete={v => handleDeleteAttr(v, 'season')}
                  />
                </div>
                <div>
                  <label className={lbl}>Performance</label>
                  <CreatableCombobox
                    value={form.performance_category}
                    onChange={v => set('performance_category', v)}
                    options={getOptions('performance')}
                    onCreate={v => handleCreateAttr('performance', v)}
                    onEdit={(oldV, newV) => handleEditAttr(oldV, newV, 'performance')}
                    onDelete={v => handleDeleteAttr(v, 'performance')}
                  />
                </div>
                <div>
                  <label className={lbl}>Position</label>
                  <CreatableCombobox
                    value={form.position_category}
                    onChange={v => set('position_category', v)}
                    options={getOptions('position')}
                    onCreate={v => handleCreateAttr('position', v)}
                    onEdit={(oldV, newV) => handleEditAttr(oldV, newV, 'position')}
                    onDelete={v => handleDeleteAttr(v, 'position')}
                  />
                </div>
                <div>
                  <label className={lbl}>Shoulder</label>
                  <CreatableCombobox
                    value={form.shoulder_type}
                    onChange={v => set('shoulder_type', v)}
                    options={getOptions('shoulder')}
                    onCreate={v => handleCreateAttr('shoulder', v)}
                    onEdit={(oldV, newV) => handleEditAttr(oldV, newV, 'shoulder')}
                    onDelete={v => handleDeleteAttr(v, 'shoulder')}
                  />
                </div>
                <div>
                  <label className={lbl}>Terrain</label>
                  <CreatableCombobox
                    value={form.terrain_type}
                    onChange={v => set('terrain_type', v)}
                    options={getOptions('terrain')}
                    onCreate={v => handleCreateAttr('terrain', v)}
                    onEdit={(oldV, newV) => handleEditAttr(oldV, newV, 'terrain')}
                    onDelete={v => handleDeleteAttr(v, 'terrain')}
                  />
                </div>
                <div>
                  <label className={lbl}>Country of Origin</label>
                  <input type="text" value={form.default_country_of_origin} onChange={e => set('default_country_of_origin', e.target.value)}
                    placeholder="e.g. China" className={inp} />
                </div>
                <div>
                  <label className={lbl}>Warranty (km)</label>
                  <input type="number" min={0} value={form.warranty_km} onChange={e => set('warranty_km', e.target.value)}
                    placeholder="e.g. 60000" className={inp} />
                </div>
              </div>
            </Card>

            {/* Warranty info */}
            <Card title="Warranty" description="Warranty terms displayed on the pattern page.">
              <Textarea value={form.warranty_information} onChange={e => set('warranty_information', e.target.value)}
                rows={2} placeholder="Warranty terms and conditions…" className="resize-none" />
            </Card>

            {/* Main Image */}
            <Card title="Main Image" description="Primary product image shown in listings.">
              <input ref={imgRef} type="file" accept="image/*" className="sr-only"
                onChange={async e => { const f = e.target.files?.[0]; if (f) await uploadImage(f); e.target.value = '' }}
              />
              {form.main_image ? (
                <div className="flex items-center gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={form.main_image} alt="" className="h-16 w-16 object-contain rounded-xl border border-zinc-200 bg-zinc-50 p-1 shrink-0" />
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => imgRef.current?.click()} disabled={uploading}>
                      {uploading ? 'Uploading…' : 'Replace'}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => set('main_image', '')} className="text-red-500 hover:text-red-700 hover:bg-red-50">Remove</Button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => imgRef.current?.click()} disabled={uploading}
                  className="flex items-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 px-4 py-3 text-sm text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 transition-colors">
                  {uploading ? 'Uploading…' : '+ Upload Image'}
                </button>
              )}
              <p className="mt-2 text-xs text-zinc-400">Or paste a URL directly:</p>
              <input type="url" value={form.main_image} onChange={e => set('main_image', e.target.value)}
                placeholder="https://cdn.example.com/pattern.jpg" className={`${inp} mt-1`} />
            </Card>
          </div>

          {/* ── RIGHT: sidebar ─────────────────────────────────────────────── */}
          <div className="w-full xl:w-72 xl:shrink-0 space-y-5">

            {/* Actions */}
            <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm p-4 space-y-3">
              <button type="submit" disabled={saving}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm">
                {saving
                  ? <><span className="w-4 h-4 rounded-full border-2 border-zinc-900/30 border-t-zinc-900 animate-spin" />{isEdit ? 'Saving…' : 'Creating…'}</>
                  : isEdit ? 'Save Changes' : 'Create Pattern'
                }
              </button>
              <button type="button" onClick={() => router.back()}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-medium text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 transition-colors">
                ← Back
              </button>
            </div>

            {/* Visibility */}
            <Card title="Visibility & Flags" description="Control where this pattern appears.">
              <div className="space-y-3">
                <Toggle id="is_active"       label="Is Active"       description="Available in admin"             checked={form.is_active}       onChange={v => set('is_active', v)} />
                <Toggle id="show_on_website" label="Show on Website" description="Visible on storefront"          checked={form.show_on_website} onChange={v => set('show_on_website', v)} />
                <Toggle id="on_sale"         label="On Sale"         description="Marks pattern as on sale"       checked={form.on_sale}         onChange={v => set('on_sale', v)} />
                <Toggle id="discountable"    label="Discountable"    description="Allow promotions & discounts"   checked={form.discountable}    onChange={v => set('discountable', v)} />
              </div>
            </Card>


            {/* SEO */}
            <Card title="SEO" description="Search engine optimisation.">
              <div className="space-y-3">
                <div>
                  <label className={lbl}>SEO Title</label>
                  <input type="text" value={form.seo_title} onChange={e => set('seo_title', e.target.value)}
                    placeholder="e.g. Michelin Pilot Sport 3 — Buy Online" className={inp} />
                </div>
                <div>
                  <label className={lbl}>SEO Description</label>
                  <Textarea value={form.seo_description} onChange={e => set('seo_description', e.target.value)}
                    rows={2} placeholder="Short meta description…" className="resize-none" />
                </div>
              </div>
            </Card>

          </div>
        </div>
      </form>
    </div>
  )
}



function Card({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50/60">
        <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
        <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  )
}

function Toggle({ id, label, description, checked, onChange }: {
  id: string; label: string; description: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-zinc-200 p-3.5">
      <button type="button" id={id} role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors mt-0.5 ${checked ? 'bg-primary' : 'bg-zinc-300'}`}>
        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
      </button>
      <div>
        <label htmlFor={id} className="text-sm font-medium text-zinc-800 cursor-pointer">{label}</label>
        <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
      </div>
    </div>
  )
}

function Req() { return <span className="text-red-500 ml-0.5">*</span> }

