'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AdminBreadcrumb } from '@/components/admin/AdminBreadcrumb'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toastPromise, toastError } from '@/lib/toast'
import { uploadProductImage } from '@/lib/upload-image'
import type { Brand } from '@/types/admin.types'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

const POSITIONING_OPTIONS = [
  { value: 'budget',     label: 'Budget' },
  { value: 'mid_range',  label: 'Mid Range' },
  { value: 'premium',    label: 'Premium' },
  { value: 'commercial', label: 'Commercial' },
]

export type BrandFormState = {
  brand_name: string
  brand_slug: string
  brand_logo: string
  brand_banner_image: string
  brand_short_description: string
  brand_description: string
  country_of_brand: string
  manufacturer_name: string
  brand_positioning: string
  warranty_info: string
  seo_title: string
  seo_description: string
  is_active: boolean
  show_on_website: boolean
  channel_wholesale: boolean
  channel_retail: boolean
  channel_marketplaces: boolean
}

export const EMPTY_BRAND_FORM: BrandFormState = {
  brand_name: '', brand_slug: '', brand_logo: '', brand_banner_image: '',
  brand_short_description: '', brand_description: '', country_of_brand: '',
  manufacturer_name: '', brand_positioning: '', warranty_info: '',
  seo_title: '', seo_description: '', is_active: true, show_on_website: false,
  channel_wholesale: false, channel_retail: false, channel_marketplaces: false,
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

interface Props {
  brandId?: string
  initial: BrandFormState
}

export default function BrandForm({ brandId, initial }: Props) {
  const router = useRouter()
  const [form, setForm]           = useState<BrandFormState>(initial)
  const [saving, setSaving]       = useState(false)
  const [uploading, setUploading] = useState<'logo' | 'banner' | null>(null)
  const logoRef   = useRef<HTMLInputElement>(null)
  const bannerRef = useRef<HTMLInputElement>(null)

  const isEdit = Boolean(brandId)

  function set(key: keyof BrandFormState, val: string | boolean) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  async function uploadImage(file: File, field: 'brand_logo' | 'brand_banner_image', which: 'logo' | 'banner') {
    setUploading(which)
    try {
      const url = await uploadProductImage(file, 'brands')
      set(field, url)
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.brand_name.trim()) { toastError('Brand name is required'); return }
    if (!form.brand_slug.trim()) { toastError('Slug is required'); return }

    setSaving(true)
    const { data: { session } } = await createClient().auth.getSession()
    const token = session?.access_token ?? ''

    const body = {
      brand_name:              form.brand_name.trim(),
      brand_slug:              form.brand_slug.trim(),
      brand_logo:              form.brand_logo              || null,
      brand_banner_image:      form.brand_banner_image      || null,
      brand_short_description: form.brand_short_description || null,
      brand_description:       form.brand_description       || null,
      country_of_brand:        form.country_of_brand        || null,
      manufacturer_name:       form.manufacturer_name       || null,
      brand_positioning:       form.brand_positioning        || null,
      warranty_info:           form.warranty_info            || null,
      seo_title:               form.seo_title               || null,
      seo_description:         form.seo_description         || null,
      is_active:               form.is_active,
      show_on_website:         form.show_on_website,
      channel_wholesale:       form.channel_wholesale,
      channel_retail:          form.channel_retail,
      channel_marketplaces:    form.channel_marketplaces,
    }

    const req = fetch(
      isEdit ? `${API}/api/admin/products/brands/${brandId}` : `${API}/api/admin/products/brands`,
      {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      }
    ).then(async res => {
      if (!res.ok) {
        const b = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(b.error ?? 'Failed to save brand')
      }
      return res.json() as Promise<Brand>
    })

    try {
      await toastPromise(req, {
        loading: isEdit ? 'Saving brand…'  : 'Creating brand…',
        success: isEdit ? 'Brand updated'  : 'Brand created',
        error:   (err: unknown) => err instanceof Error ? err.message : 'Failed to save brand',
      })
      router.push('/admin/products/brands')
    } catch {
      // error shown by toastPromise
    } finally {
      setSaving(false)
    }
  }

  const inp = 'w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-colors'
  const lbl = 'block text-xs font-semibold text-zinc-600 mb-1.5'

  return (
    <div className="p-4 sm:p-6 max-w-4xl">
      <div className="mb-6">
        <AdminBreadcrumb crumbs={[
          { label: 'Products',  href: '/admin/products' },
          { label: 'Brands',    href: '/admin/products/brands' },
          { label: isEdit ? 'Edit Brand' : 'New Brand' },
        ]} />
        <div className="mt-4">
          <h1 className="text-2xl font-bold text-zinc-900">{isEdit ? 'Edit Brand' : 'New Brand'}</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {isEdit ? 'Update brand identity, media, and SEO settings.' : 'Add a new tyre brand to the catalogue.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── General ──────────────────────────────────────────────────────── */}
        <Card title="General" description="Core brand identity and marketing positioning.">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={lbl}>Brand Name <Req /></label>
                <input
                  type="text" required value={form.brand_name}
                  onChange={e => { set('brand_name', e.target.value); if (!isEdit) set('brand_slug', slugify(e.target.value)) }}
                  placeholder="e.g. Grenlander" className={inp}
                />
              </div>
              <div>
                <label className={lbl}>Slug <Req /></label>
                <div className="flex items-center rounded-xl border border-zinc-200 overflow-hidden focus-within:ring-2 focus-within:ring-primary/30 bg-white">
                  <span className="px-3 text-zinc-400 text-sm select-none border-r border-zinc-200 bg-zinc-50 py-2.5">/</span>
                  <input
                    value={form.brand_slug} onChange={e => set('brand_slug', e.target.value)}
                    placeholder="grenlander" required
                    className="flex-1 px-3 py-2.5 text-sm focus:outline-none bg-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={lbl}>Country of Brand</label>
                <input type="text" value={form.country_of_brand} onChange={e => set('country_of_brand', e.target.value)} placeholder="e.g. China" className={inp} />
              </div>
              <div>
                <label className={lbl}>Manufacturer Name</label>
                <input type="text" value={form.manufacturer_name} onChange={e => set('manufacturer_name', e.target.value)} placeholder="e.g. Shandong Linglong" className={inp} />
              </div>
            </div>

            <div>
              <label className={lbl}>Tier</label>
              <select value={form.brand_positioning} onChange={e => set('brand_positioning', e.target.value)} className={inp}>
                <option value="">— None —</option>
                {POSITIONING_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div>
              <label className={lbl}>Short Description</label>
              <Textarea value={form.brand_short_description} onChange={e => set('brand_short_description', e.target.value)}
                rows={2} placeholder="Brief intro shown on brand cards and listings…" className="resize-none" />
            </div>

            <div>
              <label className={lbl}>Full Brand Description</label>
              <Textarea value={form.brand_description} onChange={e => set('brand_description', e.target.value)}
                rows={4} placeholder="Full brand description for the brand page…" className="resize-none" />
            </div>

            <div>
              <label className={lbl}>Warranty Information</label>
              <Textarea value={form.warranty_info} onChange={e => set('warranty_info', e.target.value)}
                rows={3} placeholder="Warranty terms and conditions…" className="resize-none" />
            </div>
          </div>
        </Card>

        {/* ── Media ────────────────────────────────────────────────────────── */}
        <Card title="Media" description="Brand logo and banner image for the website.">
          <div className="space-y-5">
            {/* Logo */}
            <div>
              <label className={lbl}>Brand Logo</label>
              <input ref={logoRef} type="file" accept="image/*" className="sr-only"
                onChange={async e => { const f = e.target.files?.[0]; if (f) await uploadImage(f, 'brand_logo', 'logo'); e.target.value = '' }}
              />
              {form.brand_logo ? (
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={form.brand_logo} alt="Logo" className="h-16 w-16 object-contain rounded-xl border border-zinc-200 bg-zinc-50 p-1" />
                  <div className="flex flex-col gap-1.5">
                    <Button type="button" variant="outline" size="sm" onClick={() => logoRef.current?.click()} disabled={uploading === 'logo'}>
                      {uploading === 'logo' ? 'Uploading…' : 'Replace'}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => set('brand_logo', '')} className="text-red-500 hover:text-red-700 hover:bg-red-50">Remove</Button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => logoRef.current?.click()} disabled={uploading === 'logo'}
                  className="flex items-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 px-4 py-3 text-sm text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 transition-colors">
                  {uploading === 'logo' ? 'Uploading…' : '+ Upload Logo'}
                </button>
              )}
              <p className="mt-2 text-xs text-zinc-400">Or paste a URL directly:</p>
              <input type="url" value={form.brand_logo} onChange={e => set('brand_logo', e.target.value)}
                placeholder="https://cdn.example.com/logo.png" className={`${inp} mt-1`} />
            </div>

            {/* Banner */}
            <div>
              <label className={lbl}>Brand Banner Image</label>
              <input ref={bannerRef} type="file" accept="image/*" className="sr-only"
                onChange={async e => { const f = e.target.files?.[0]; if (f) await uploadImage(f, 'brand_banner_image', 'banner'); e.target.value = '' }}
              />
              {form.brand_banner_image ? (
                <div className="space-y-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={form.brand_banner_image} alt="Banner" className="w-full h-28 object-cover rounded-xl border border-zinc-200" />
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => bannerRef.current?.click()} disabled={uploading === 'banner'}>
                      {uploading === 'banner' ? 'Uploading…' : 'Replace'}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => set('brand_banner_image', '')} className="text-red-500 hover:text-red-700 hover:bg-red-50">Remove</Button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => bannerRef.current?.click()} disabled={uploading === 'banner'}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 px-4 py-8 text-sm text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 transition-colors">
                  {uploading === 'banner' ? 'Uploading…' : '+ Upload Banner Image'}
                </button>
              )}
              <p className="mt-2 text-xs text-zinc-400">Or paste a URL directly:</p>
              <input type="url" value={form.brand_banner_image} onChange={e => set('brand_banner_image', e.target.value)}
                placeholder="https://cdn.example.com/banner.jpg" className={`${inp} mt-1`} />
            </div>
          </div>
        </Card>

        {/* ── SEO ──────────────────────────────────────────────────────────── */}
        <Card title="SEO" description="Search engine optimisation fields for the brand page.">
          <div className="space-y-4">
            <div>
              <label className={lbl}>SEO Title</label>
              <input type="text" value={form.seo_title} onChange={e => set('seo_title', e.target.value)}
                placeholder="e.g. Grenlander Tyres — Buy Online Australia" className={inp} />
            </div>
            <div>
              <label className={lbl}>SEO Description</label>
              <Textarea value={form.seo_description} onChange={e => set('seo_description', e.target.value)}
                rows={2} placeholder="Short meta description for search engines…" className="resize-none" />
            </div>
          </div>
        </Card>

        {/* ── Visibility ───────────────────────────────────────────────────── */}
        <Card title="Visibility" description="Control where this brand appears.">
          <div className="space-y-3">
            <Toggle id="is_active" label="Is Active" description="Brand is available for use in products and admin"
              checked={form.is_active} onChange={v => set('is_active', v)} />
            <Toggle id="show_on_website" label="Show on Website" description="Brand page and logo will be visible to customers"
              checked={form.show_on_website} onChange={v => set('show_on_website', v)} />
          </div>
        </Card>

        {/* ── Channel Permissions ───────────────────────────────────────────── */}
        <Card title="Channel Permissions" description="Select which sales channels this brand's products can be sold through.">
          <div className="flex flex-wrap gap-6">
            {([
              { key: 'channel_wholesale',    label: 'Wholesale' },
              { key: 'channel_retail',       label: 'Retail' },
              { key: 'channel_marketplaces', label: 'Marketplaces' },
            ] as const).map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form[key]}
                  onChange={e => set(key, e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 accent-primary cursor-pointer"
                />
                <span className="text-sm font-medium text-zinc-700">{label}</span>
              </label>
            ))}
          </div>
        </Card>

        {/* ── Actions ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4 pb-8">
          <button type="button" onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-medium text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back
          </button>
          <button type="submit" disabled={saving}
            className="inline-flex items-center gap-2.5 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm">
            {saving
              ? <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />{isEdit ? 'Saving…' : 'Creating…'}</>
              : isEdit ? 'Save Changes' : 'Create Brand'
            }
          </button>
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

