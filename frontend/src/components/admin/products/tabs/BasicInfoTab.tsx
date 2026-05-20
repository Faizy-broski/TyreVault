'use client'

import { useRef, useState } from 'react'
import { useFormContext, useFieldArray } from 'react-hook-form'
import type { CreateProductFormValues } from '../schema'
import { CreatableCombobox, slugify } from '@/components/ui/CreatableCombobox'
import { createClient } from '@/lib/supabase/client'
import RichTextEditor from '@/components/ui/RichTextEditor'
import { uploadProductImage, deleteProductImage } from '@/lib/upload-image'
import { toastError } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

const RichField = ({ name, label }: { name: 'tyreOverview' | 'features' | 'warrantyInformation' | 'tyreSpecSheet'; label: string }) => {
  const { watch, setValue } = useFormContext<CreateProductFormValues>()
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700 mb-1">{label}</label>
      <RichTextEditor
        value={watch(name) ?? ''}
        onChange={v => setValue(name, v)}
        placeholder={`Enter ${label.toLowerCase()} here…`}
      />
    </div>
  )
}

export default function BasicInfoTab({ autoSlug, brands }: {
  autoSlug: string
  brands: { brand_id: string; brand_name: string }[]
}) {
  const { register, watch, setValue, formState: { errors } } = useFormContext<CreateProductFormValues>()
  const brandId = watch('brandId')
  const { fields: faqFields, append: appendFaq, remove: removeFaq } = useFieldArray<CreateProductFormValues, 'faqList'>({
    name: 'faqList',
  })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const galleryImages = watch('galleryImages') ?? []
  const [uploading,    setUploading]    = useState(false)
  const [dragIdx,      setDragIdx]      = useState<number | null>(null)
  const [dragOverIdx,  setDragOverIdx]  = useState<number | null>(null)

  function reorder(from: number, to: number) {
    if (from === to) return
    const next = [...galleryImages]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setValue('galleryImages', next)
  }

  function setCover(i: number) {
    if (i === 0) return
    reorder(i, 0)
  }

  const patternName = watch('patternName')

  // Auto-fill slug from title
  function handleNameBlur() {
    const current = watch('patternSlug')
    if (!current) setValue('patternSlug', autoSlug)
  }

  return (
    <div className="space-y-8">

      {/* ── General ─────────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-base font-semibold text-zinc-900 mb-4">General</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Brand */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Brand</label>
            <CreatableCombobox
              options={brands.map(b => ({ value: b.brand_id, label: b.brand_name }))}
              value={brandId ?? ''}
              onChange={v => setValue('brandId', v, { shouldValidate: true })}
              onCreate={async (name) => {
                const { data: { session } } = await createClient().auth.getSession()
                const tok = session?.access_token ?? ''
                const res = await fetch(`${API}/api/admin/products/brands`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
                  body: JSON.stringify({ brand_name: name, brand_slug: slugify(name) }),
                })
                if (!res.ok) {
                  const body = await res.json().catch(() => ({}))
                  throw new Error(body.error ?? 'Failed to create brand')
                }
                const data = await res.json()
                return { value: data.brand_id, label: data.brand_name }
              }}
              placeholder="Select or create brand…"
            />
            {errors.brandId && <p className="mt-1 text-xs text-red-600">{errors.brandId.message}</p>}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Title</label>
            <Input
              {...register('patternName')}
              onBlur={handleNameBlur}
              placeholder="Michelin Pilot Sport 4"
            />
            {errors.patternName && <p className="mt-1 text-xs text-red-600">{errors.patternName.message}</p>}
          </div>

          {/* Slug */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Slug</label>
            <div className="flex items-center rounded-lg border border-zinc-300 overflow-hidden focus-within:ring-2 focus-within:ring-zinc-500/20 focus-within:border-zinc-500">
              <span className="px-2 text-zinc-400 text-sm select-none border-r border-zinc-300 bg-zinc-50 py-2">/</span>
              <input
                {...register('patternSlug')}
                placeholder={autoSlug || 'product-slug'}
                className="flex-1 px-3 py-2 text-sm focus:outline-none bg-transparent border-0 shadow-none focus-visible:ring-0"
              />
            </div>
            {errors.patternSlug && <p className="mt-1 text-xs text-red-600">{errors.patternSlug.message}</p>}
          </div>
        </div>

        {/* Short Description */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-zinc-700 mb-1">Short Description</label>
          <Textarea
            {...register('shortDescription')}
            rows={3}
            placeholder="Brief description of tyre product..."
            className="resize-none placeholder-zinc-400"
          />
        </div>

        {/* Default Country of Origin */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Default Country of Origin
            <span className="ml-1 text-xs font-normal text-zinc-400">(pattern-level fallback — overridden per variant)</span>
          </label>
          <Input
            {...register('defaultCountryOfOrigin')}
            placeholder="CN"
            maxLength={3}
            className="w-24 uppercase"
          />
        </div>

        {/* Media */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-zinc-700 mb-1">Media</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
            multiple
            className="hidden"
            onChange={async (e) => {
              const files = Array.from(e.target.files ?? [])
              e.target.value = ''
              if (!files.length) return
              setUploading(true)
              try {
                const urls = await Promise.all(files.map(f => uploadProductImage(f, 'gallery')))
                setValue('galleryImages', [...galleryImages, ...urls])
              } catch (err) {
                toastError(err instanceof Error ? err.message : 'Upload failed')
              } finally {
                setUploading(false)
              }
            }}
          />
          <div
            role="button"
            tabIndex={0}
            onClick={() => !uploading && fileInputRef.current?.click()}
            onKeyDown={(e) => e.key === 'Enter' && !uploading && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center gap-2 transition-colors ${
              uploading
                ? 'border-zinc-200 bg-zinc-50 cursor-wait'
                : 'border-zinc-300 bg-zinc-50 hover:border-zinc-400 cursor-pointer'
            }`}
          >
            {uploading ? (
              <>
                <svg className="w-6 h-6 text-zinc-400 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                <p className="text-sm text-zinc-500">Uploading…</p>
              </>
            ) : (
              <>
                <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <p className="text-sm text-zinc-500">
                  <span className="font-medium text-zinc-700">Upload Images</span>
                </p>
                <p className="text-xs text-zinc-400">JPEG, PNG, WebP, GIF or AVIF · max 5 MB each</p>
              </>
            )}
          </div>
          {galleryImages.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-zinc-400 mb-2">
                Drag to reorder · First image is the <span className="font-semibold text-zinc-600">cover</span>
              </p>
              <div className="flex flex-wrap gap-3">
                {galleryImages.map((src, i) => {
                  const isCover   = i === 0
                  const isDragged = dragIdx === i
                  const isOver    = dragOverIdx === i

                  return (
                    <div
                      key={src}
                      draggable
                      onDragStart={() => { setDragIdx(i); setDragOverIdx(null) }}
                      onDragEnter={() => setDragOverIdx(i)}
                      onDragOver={e => e.preventDefault()}
                      onDrop={() => {
                        if (dragIdx !== null) reorder(dragIdx, i)
                        setDragIdx(null)
                        setDragOverIdx(null)
                      }}
                      onDragEnd={() => { setDragIdx(null); setDragOverIdx(null) }}
                      className={`relative w-24 h-24 rounded-xl border-2 overflow-hidden group cursor-grab active:cursor-grabbing transition-all duration-150 ${
                        isDragged ? 'opacity-40 scale-95'
                        : isOver  ? 'border-primary scale-105 shadow-lg'
                        : isCover ? 'border-primary'
                        : 'border-zinc-200 hover:border-zinc-400'
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" className="w-full h-full object-cover" />

                      {/* Cover badge */}
                      {isCover && (
                        <span className="absolute top-1 left-1 bg-primary text-zinc-900 text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-none select-none">
                          Cover
                        </span>
                      )}

                      {/* Hover overlay — set cover + remove */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1.5 transition-opacity">
                        {!isCover && (
                          <Button
                            type="button"
                            aria-label="Set as cover"
                            onClick={() => setCover(i)}
                            title="Set as cover"
                            size="xs"
                            className="bg-white/90 hover:bg-white text-zinc-800"
                          >
                            <svg className="w-3 h-3 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                            Set cover
                          </Button>
                        )}
                        <Button
                          type="button"
                          aria-label="Remove image"
                          onClick={async () => {
                            setValue('galleryImages', galleryImages.filter((_, j) => j !== i))
                            await deleteProductImage(src).catch(() => {})
                          }}
                          size="xs"
                          className="bg-red-500 hover:bg-red-600 text-white"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Remove
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Product Details ──────────────────────────────────────────────── */}
      <section>
        <h2 className="text-base font-semibold text-zinc-900 mb-4">Product Details</h2>
        <div className="space-y-4">
          <RichField name="tyreOverview"        label="Tyre Overview" />
          <RichField name="features"            label="Features" />
          <RichField name="warrantyInformation" label="Warranty Information" />
          <RichField name="tyreSpecSheet"       label="Tyre Spec Sheet" />
        </div>
      </section>

      {/* ── SEO + Visibility ─────────────────────────────────────────────── */}
      <section>
        <h2 className="text-base font-semibold text-zinc-900 mb-4">SEO &amp; Visibility</h2>

        {/* Show on Website toggle */}
        <div className="rounded-lg border border-zinc-200 p-4 mb-4">
          <div className="flex items-start gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={watch('showOnWebsite')}
              onClick={() => setValue('showOnWebsite', !watch('showOnWebsite'))}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors mt-0.5 ${
                watch('showOnWebsite') ? 'bg-primary' : 'bg-zinc-300'
              }`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                watch('showOnWebsite') ? 'translate-x-4' : 'translate-x-0'
              }`} />
            </button>
            <div>
              <span className="text-sm font-medium text-zinc-800">Show on Website</span>
              <p className="text-xs text-zinc-500 mt-0.5">
                Product will be visible to customers on the storefront
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">SEO Title</label>
            <Input
              {...register('seoTitle')}
              placeholder="Michelin Pilot Sport 4 Tyres — Buy Online"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">SEO Description</label>
            <Input
              {...register('seoDescription')}
              placeholder="Short meta description for search engines"
            />
          </div>
        </div>

        {/* Tread Image */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-zinc-700 mb-1">Tread Image URL</label>
          <Input
            {...register('treadImage')}
            placeholder="https://cdn.example.com/tread-pattern.jpg"
          />
          <p className="mt-1 text-xs text-zinc-400">Close-up tread pattern image shown on product detail page</p>
        </div>
      </section>

      {/* ── FAQ List ─────────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-zinc-900">FAQ List</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => appendFaq({ question: '', answer: '' })}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Faq
          </Button>
        </div>

        {faqFields.length === 0 && (
          <p className="text-sm text-zinc-400 py-4 text-center border border-dashed border-zinc-200 rounded-lg">
            No FAQs added yet. Click "Add Faq" to create one.
          </p>
        )}

        <div className="space-y-3">
          {faqFields.map((field, index) => (
            <div key={field.id} className="border border-zinc-200 rounded-lg overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 bg-zinc-50 border-b border-zinc-200">
                <svg className="w-4 h-4 text-zinc-400 cursor-move" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 6h2v2H8V6zm6 0h2v2h-2V6zM8 11h2v2H8v-2zm6 0h2v2h-2v-2zM8 16h2v2H8v-2zm6 0h2v2h-2v-2z"/>
                </svg>
              </div>
              <div className="p-3 space-y-2">
                <Input
                  {...register(`faqList.${index}.question`)}
                  placeholder="Question"
                />
                <div className="flex gap-2">
                  <Textarea
                    {...register(`faqList.${index}.answer`)}
                    placeholder="Answer"
                    rows={2}
                    className="flex-1 resize-none"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeFaq(index)}
                    className="self-start text-red-400 hover:text-red-600 hover:bg-red-50"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
