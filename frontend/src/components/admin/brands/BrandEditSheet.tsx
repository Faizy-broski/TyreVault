'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Sheet } from '@/components/ui/sheet'
import { BoolToggle } from '@/components/admin/BoolToggle'
import { uploadProductImage } from '@/lib/upload-image'
import { toastSuccess, toastError } from '@/lib/toast'
import type { Brand } from '@/types/admin.types'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

const POSITIONING_OPTIONS = [
  { value: 'budget',     label: 'Budget' },
  { value: 'mid_range',  label: 'Mid Range' },
  { value: 'premium',    label: 'Premium' },
  { value: 'commercial', label: 'Commercial' },
]

interface Props {
  brand:    Brand | null
  open:     boolean
  onClose:  () => void
  onSaved:  () => void
}

export function BrandEditSheet({ brand, open, onClose, onSaved }: Props) {
  const [name,             setName]             = useState('')
  const [slug,             setSlug]             = useState('')
  const [logo,             setLogo]             = useState('')
  const [country,          setCountry]          = useState('')
  const [manufacturer,     setManufacturer]     = useState('')
  const [positioning,      setPositioning]      = useState('')
  const [description,      setDescription]      = useState('')
  const [isActive,         setIsActive]         = useState(true)
  const [showOnWeb,        setShowOnWeb]        = useState(false)
  const [saving,           setSaving]           = useState(false)
  const [uploading,        setUploading]        = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (brand) {
      setName(brand.brand_name ?? '')
      setSlug(brand.brand_slug ?? '')
      setLogo(brand.brand_logo ?? '')
      setCountry(brand.country_of_brand ?? '')
      setManufacturer(brand.manufacturer_name ?? '')
      setPositioning(brand.brand_positioning ?? '')
      setDescription(brand.brand_description ?? '')
      setIsActive(brand.is_active)
      setShowOnWeb(brand.show_on_website)
    }
  }, [brand])

  async function handleUpload(file: File) {
    setUploading(true)
    try {
      const url = await uploadProductImage(file, 'brands')
      setLogo(url)
    } catch {
      toastError('Image upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function handleSave() {
    if (!brand || !name.trim()) return toastError('Brand name is required')
    setSaving(true)
    try {
      const { data: { session } } = await createClient().auth.getSession()
      const res = await fetch(`${API}/api/admin/products/brands/${brand.brand_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
        body: JSON.stringify({
          brand_name:        name.trim(),
          brand_slug:        slug.trim() || null,
          brand_logo:        logo || null,
          country_of_brand:  country || null,
          manufacturer_name: manufacturer || null,
          brand_positioning: positioning || null,
          brand_description: description || null,
          is_active:         isActive,
          show_on_website:   showOnWeb,
        }),
      })
      if (!res.ok) throw new Error('Save failed')
      toastSuccess('Brand updated')
      onSaved()
    } catch {
      toastError('Failed to save brand')
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
      title={brand ? `Edit Brand — ${brand.brand_name}` : 'Edit Brand'}
      footer={
        <>
          <button type="button" onClick={onClose}
            className="px-4 py-2 rounded-lg border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors">
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={saving}
            className="px-4 py-2 rounded-lg bg-primary text-sm font-semibold text-zinc-900 hover:bg-primary/90 disabled:opacity-50 transition-colors">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      {/* Brand Name + Slug */}
      <div>
        <label className={lbl}>Brand Name <span className="text-red-500">*</span></label>
        <input value={name} onChange={e => setName(e.target.value)} className={inp} />
      </div>
      <div>
        <label className={lbl}>Slug</label>
        <div className="flex items-center rounded-lg border border-zinc-300 overflow-hidden focus-within:ring-2 focus-within:ring-primary/30 bg-white">
          <span className="px-3 text-zinc-400 text-sm select-none border-r border-zinc-200 bg-zinc-50 py-2">/</span>
          <input value={slug} onChange={e => setSlug(e.target.value)} placeholder="accelera"
            className="flex-1 px-3 py-2 text-sm focus:outline-none bg-transparent" />
        </div>
      </div>

      {/* Country + Manufacturer */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Country of Brand</label>
          <input value={country} onChange={e => setCountry(e.target.value)} placeholder="e.g. China" className={inp} />
        </div>
        <div>
          <label className={lbl}>Manufacturer Name</label>
          <input value={manufacturer} onChange={e => setManufacturer(e.target.value)} placeholder="e.g. Shandong Linglong" className={inp} />
        </div>
      </div>

      {/* Tier */}
      <div>
        <label className={lbl}>Tier</label>
        <select value={positioning} onChange={e => setPositioning(e.target.value)} className={inp}>
          <option value="">— None —</option>
          {POSITIONING_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Brand Logo */}
      <div>
        <label className={`${lbl} mb-2`}>Brand Logo</label>
        <div className="flex items-start gap-3">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" className="w-16 h-16 rounded-lg object-contain border border-zinc-200 bg-zinc-50 p-1 shrink-0" />
          ) : (
            <div className="w-16 h-16 rounded-lg border-2 border-dashed border-zinc-300 flex flex-col items-center justify-center text-zinc-400 text-xs shrink-0 cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileRef.current?.click()}>
              <span className="text-lg leading-none">+</span>
              <span className="mt-0.5">Upload</span>
            </div>
          )}
          <div className="space-y-1.5 flex-1">
            <input value={logo} onChange={e => setLogo(e.target.value)} placeholder="https://…" className={inp} />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
              className="text-xs text-primary underline hover:no-underline disabled:opacity-50">
              {uploading ? 'Uploading…' : 'Upload image'}
            </button>
            {logo && (
              <button type="button" onClick={() => setLogo('')} className="ml-3 text-xs text-red-500 underline hover:no-underline">
                Remove
              </button>
            )}
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} />
      </div>

      {/* Description */}
      <div>
        <label className={lbl}>Description</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)}
          rows={3} placeholder="Brand description…"
          className={`${inp} resize-none`} />
      </div>

      {/* Booleans */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-zinc-700">Is Active</span>
          <BoolToggle initial={isActive} onToggle={async next => setIsActive(next)} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-zinc-700">Show to Customer</span>
          <BoolToggle initial={showOnWeb} onToggle={async next => setShowOnWeb(next)} />
        </div>
      </div>
    </Sheet>
  )
}
