'use client'

import { useFormContext } from 'react-hook-form'
import type { CreateProductFormValues } from '../schema'
import { CreatableCombobox, CreatableMultiCombobox, TagInput, slugify } from '@/components/ui/CreatableCombobox'
import { createClient } from '@/lib/supabase/client'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

type Props = {
  collections: { collection_id: string; collection_name: string }[]
  categories:  { category_id: string; category_name: string; category_type: string }[]
}

const APPLICATION_TYPES = [
  { value: 'PCR',  label: 'PCR — Passenger Car' },
  { value: '4x4',  label: '4x4 / SUV' },
  { value: 'TBR',  label: 'TBR — Truck / Bus' },
]

const PERFORMANCE_CATEGORIES = [
  'HP', 'UHP', 'HT', 'AT', 'RT', 'MT', 'XT', 'ECO', 'COMMERCIAL',
]

const SEASON_TYPES = [
  { value: 'summer',     label: 'Summer' },
  { value: 'winter',     label: 'Winter' },
  { value: 'all_season', label: 'All Season' },
]

const COMMON_TAGS = [
  'suv', 'quiet', 'comfort', 'performance', 'runflat', 'xl', 'wet', 'fuel-efficient',
  'highway', 'all-terrain', 'mud-terrain', 'commercial', '4x4', 'sport',
]

export default function CategoriesTab({ collections, categories }: Props) {
  const { register, watch, setValue, formState: { errors } } = useFormContext<CreateProductFormValues>()

  const selectedTags       = watch('tags') ?? []
  const selectedCats       = watch('categoryIds') ?? []
  const discountable       = watch('discountable')
  const applicationType    = watch('applicationType')
  const collectionId       = watch('collectionId') ?? ''
  const performanceCategory = watch('performanceCategory') ?? ''
  const seasonType         = watch('seasonType') ?? ''

  async function getAuthToken() {
    const { data: { session } } = await createClient().auth.getSession()
    return session?.access_token ?? ''
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-base font-semibold text-zinc-900 mb-4">General</h2>

        {/* Discountable toggle */}
        <div className="rounded-lg border border-zinc-200 p-4 mb-5">
          <div className="flex items-start gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={discountable}
              onClick={() => setValue('discountable', !discountable)}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors mt-0.5 ${
                discountable ? 'bg-primary' : 'bg-zinc-300'
              }`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                discountable ? 'translate-x-4' : 'translate-x-0'
              }`} />
            </button>
            <div>
              <span className="text-sm font-medium text-zinc-800">
                Discountable{' '}
                <span className="text-xs font-normal text-zinc-400">(Optional)</span>
              </span>
              <p className="text-xs text-zinc-500 mt-0.5">
                When unchecked, discounts will not be applied to this product
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Product Type (application_type) */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Product Type</label>
            <select
              {...register('applicationType')}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
            >
              <option value="">Tire, wheels ...</option>
              {APPLICATION_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Tyre Type (performance_category) */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Tyre Type</label>
            <CreatableCombobox
              options={PERFORMANCE_CATEGORIES.map(c => ({ value: c, label: c }))}
              value={performanceCategory}
              onChange={v => setValue('performanceCategory', v)}
              onCreate={async (name) => ({ value: name.toUpperCase(), label: name.toUpperCase() })}
              placeholder="Touring, Performance, Highway…"
            />
            <p className="mt-1 text-xs text-zinc-400">The primary tyre classification</p>
          </div>

          {/* Season */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Season</label>
            <CreatableCombobox
              options={SEASON_TYPES.map(s => ({ value: s.value, label: s.label }))}
              value={seasonType}
              onChange={v => setValue('seasonType', v)}
              placeholder="Summer, winter, all season…"
            />
          </div>

          {/* Collection */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Collection</label>
            <CreatableCombobox
              options={collections.map(c => ({ value: c.collection_id, label: c.collection_name }))}
              value={collectionId}
              onChange={v => setValue('collectionId', v)}
              onCreate={async (name) => {
                const tok = await getAuthToken()
                const res = await fetch(`${API}/api/admin/products/collections`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
                  body: JSON.stringify({ collection_name: name, collection_slug: slugify(name) }),
                })
                if (!res.ok) {
                  const body = await res.json().catch(() => ({}))
                  throw new Error(body.error ?? 'Failed to create collection')
                }
                const data = await res.json()
                return { value: data.collection_id, label: data.collection_name }
              }}
              placeholder="Select or create collection…"
            />
          </div>
        </div>

        {/* Category (vehicle category — multi-select creatable) */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-zinc-700 mb-1">Category</label>
          <p className="text-xs text-zinc-400 mb-2">Vehicle category this tyre fits</p>
          <CreatableMultiCombobox
            options={categories.map(cat => ({ value: cat.category_id, label: cat.category_name }))}
            value={selectedCats}
            onChange={v => setValue('categoryIds', v)}
            onCreate={async (name) => {
              const tok = await getAuthToken()
              const res = await fetch(`${API}/api/admin/products/categories`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
                body: JSON.stringify({ category_name: name, category_slug: slugify(name), category_type: 'general' }),
              })
              if (!res.ok) {
                const body = await res.json().catch(() => ({}))
                throw new Error(body.error ?? 'Failed to create category')
              }
              const data = await res.json()
              return { value: data.category_id, label: data.category_name }
            }}
            placeholder="Select or create categories…"
          />
        </div>

        {/* TBR-specific fields */}
        {applicationType === 'TBR' && (
          <div className="mt-4 grid grid-cols-1 gap-4 rounded-lg border border-amber-200 bg-amber-50 p-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Position Category</label>
              <select
                {...register('positionCategory')}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
              >
                <option value="">Select position</option>
                <option value="steer">Steer</option>
                <option value="drive">Drive</option>
                <option value="trailer">Trailer</option>
                <option value="all_position">All Position</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Shoulder Type</label>
              <select
                {...register('shoulderType')}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
              >
                <option value="">Select shoulder</option>
                <option value="open_shoulder">Open Shoulder</option>
                <option value="closed_shoulder">Closed Shoulder</option>
                <option value="block_drive">Block Drive</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Terrain Type</label>
              <input
                {...register('terrainType')}
                placeholder="e.g. highway, mixed"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
          </div>
        )}

        {/* Warranty (km) */}
        <div className="mt-4 grid grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Warranty (km)</label>
            <input
              type="number"
              {...register('warrantyKm', { valueAsNumber: true })}
              placeholder="80000"
              min={0}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
        </div>

        {/* Tags */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-zinc-700 mb-2">Tags</label>
          <TagInput
            value={selectedTags}
            onChange={v => setValue('tags', v)}
            suggestions={COMMON_TAGS}
          />
        </div>
      </section>
    </div>
  )
}
