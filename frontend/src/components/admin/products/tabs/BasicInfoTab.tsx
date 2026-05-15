'use client'

import { useRef } from 'react'
import { useFormContext, useFieldArray } from 'react-hook-form'
import type { CreateProductFormValues } from '../schema'

const RichTextArea = ({ name, label }: { name: keyof CreateProductFormValues; label: string }) => {
  const { register, formState: { errors } } = useFormContext<CreateProductFormValues>()
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700 mb-1">{label}</label>
      {/* Toolbar placeholder — swap for Tiptap/Quill in production */}
      <div className="border border-zinc-300 rounded-lg overflow-hidden">
        <div className="flex items-center gap-1 px-2 py-1.5 border-b border-zinc-200 bg-zinc-50">
          {['B', 'I', '≡', '→', '⊞', '↑', '↓'].map(t => (
            <button key={t} type="button"
              className="w-6 h-6 text-xs text-zinc-600 hover:bg-zinc-200 rounded flex items-center justify-center font-mono">
              {t}
            </button>
          ))}
        </div>
        <textarea
          {...register(name as never)}
          rows={5}
          placeholder={`Enter ${label.toLowerCase()} here`}
          className="w-full px-3 py-2 text-sm text-zinc-700 resize-y focus:outline-none placeholder-zinc-400"
        />
      </div>
      {errors[name] && (
        <p className="mt-1 text-xs text-red-600">{String((errors[name] as { message?: string })?.message)}</p>
      )}
    </div>
  )
}

export default function BasicInfoTab({ autoSlug, brands }: {
  autoSlug: string
  brands: { brand_id: string; brand_name: string }[]
}) {
  const { register, watch, setValue, formState: { errors } } = useFormContext<CreateProductFormValues>()
  const { fields: faqFields, append: appendFaq, remove: removeFaq } = useFieldArray<CreateProductFormValues, 'faqList'>({
    name: 'faqList',
  })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const galleryImages = watch('galleryImages') ?? []

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
        <div className="grid grid-cols-3 gap-4">
          {/* Brand */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Brand</label>
            <select
              {...register('brandId')}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
            >
              <option value="">Select brand</option>
              {brands.map(b => (
                <option key={b.brand_id} value={b.brand_id}>{b.brand_name}</option>
              ))}
            </select>
            {errors.brandId && <p className="mt-1 text-xs text-red-600">{errors.brandId.message}</p>}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Title</label>
            <input
              {...register('patternName')}
              onBlur={handleNameBlur}
              placeholder="Michelin Pilot Sport 4"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
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
                className="flex-1 px-3 py-2 text-sm focus:outline-none"
              />
            </div>
            {errors.patternSlug && <p className="mt-1 text-xs text-red-600">{errors.patternSlug.message}</p>}
          </div>
        </div>

        {/* Short Description */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-zinc-700 mb-1">Short Description</label>
          <textarea
            {...register('shortDescription')}
            rows={3}
            placeholder="Brief description of tyre product..."
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none placeholder-zinc-400"
          />
        </div>

        {/* Media */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-zinc-700 mb-1">Media</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? [])
              const urls = files.map(f => URL.createObjectURL(f))
              setValue('galleryImages', [...galleryImages, ...urls])
              e.target.value = ''
            }}
          />
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
            className="border-2 border-dashed border-zinc-300 rounded-lg p-8 flex flex-col items-center justify-center gap-2 hover:border-zinc-400 transition-colors cursor-pointer bg-zinc-50"
          >
            <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <p className="text-sm text-zinc-500">
              <span className="font-medium text-zinc-700">Upload Images</span>
            </p>
            <p className="text-xs text-zinc-400">Drag and drop files here or click to upload</p>
          </div>
          {galleryImages.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {galleryImages.map((src, i) => (
                <div key={i} className="relative w-16 h-16 rounded-lg border border-zinc-200 overflow-hidden group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    aria-label="Remove image"
                    onClick={() => setValue('galleryImages', galleryImages.filter((_, j) => j !== i))}
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                  >
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Product Details ──────────────────────────────────────────────── */}
      <section>
        <h2 className="text-base font-semibold text-zinc-900 mb-4">Product Details</h2>
        <div className="space-y-4">
          <RichTextArea name="tyreOverview"      label="Tyre Overview" />
          <RichTextArea name="features"          label="Features" />
          <RichTextArea name="warrantyInformation" label="Warranty Information" />
          <RichTextArea name="tyreSpecSheet"     label="Tyre Spec Sheet" />
        </div>
      </section>

      {/* ── FAQ List ─────────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-zinc-900">FAQ List</h2>
          <button
            type="button"
            onClick={() => appendFaq({ question: '', answer: '' })}
            className="flex items-center gap-1.5 rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Faq
          </button>
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
                <input
                  {...register(`faqList.${index}.question`)}
                  placeholder="Question"
                  className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                <div className="flex gap-2">
                  <textarea
                    {...register(`faqList.${index}.answer`)}
                    placeholder="Answer"
                    rows={2}
                    className="flex-1 px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                  />
                  <button
                    type="button"
                    onClick={() => removeFaq(index)}
                    className="self-start p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
