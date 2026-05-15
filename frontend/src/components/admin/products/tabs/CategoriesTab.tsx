'use client'

import { useFormContext } from 'react-hook-form'
import type { CreateProductFormValues } from '../schema'

type Props = {
  brands:      { brand_id: string; brand_name: string }[]
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

export default function CategoriesTab({ brands, collections, categories }: Props) {
  const { register, watch, setValue, formState: { errors } } = useFormContext<CreateProductFormValues>()

  const selectedTags   = watch('tags') ?? []
  const selectedCats   = watch('categoryIds') ?? []
  const discountable   = watch('discountable')

  function toggleTag(tag: string) {
    const has = selectedTags.includes(tag)
    setValue('tags', has ? selectedTags.filter(t => t !== tag) : [...selectedTags, tag])
  }

  function toggleCategory(id: string) {
    const has = selectedCats.includes(id)
    setValue('categoryIds', has ? selectedCats.filter(c => c !== id) : [...selectedCats, id])
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

        <div className="grid grid-cols-2 gap-4">
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
            <select
              {...register('performanceCategory')}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
            >
              <option value="">Touring, Performance, Highway</option>
              {PERFORMANCE_CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-zinc-400">The primary tyre classification</p>
          </div>

          {/* Season */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Season</label>
            <select
              {...register('seasonType')}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
            >
              <option value="">Summer, winter, all season etc</option>
              {SEASON_TYPES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Collection */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Collection</label>
            <select
              {...register('collectionId')}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
            >
              <option value="">Premium tires, low budget tires ...</option>
              {collections.map(c => (
                <option key={c.collection_id} value={c.collection_id}>{c.collection_name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Category (vehicle category — multi-select) */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-zinc-700 mb-1">Category</label>
          <p className="text-xs text-zinc-400 mb-2">Vehicle category this tyre fits</p>
          <div className="border border-zinc-300 rounded-lg overflow-hidden">
            <div className="max-h-40 overflow-y-auto divide-y divide-zinc-100">
              {categories.length === 0 && (
                <p className="px-3 py-2 text-sm text-zinc-400">No categories. Create them first.</p>
              )}
              {categories.map(cat => (
                <label key={cat.category_id}
                  className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-zinc-50">
                  <input
                    type="checkbox"
                    checked={selectedCats.includes(cat.category_id)}
                    onChange={() => toggleCategory(cat.category_id)}
                    className="rounded border-zinc-300 text-zinc-900 focus:ring-primary/30"
                  />
                  <span className="text-sm text-zinc-700">{cat.category_name}</span>
                  <span className="ml-auto text-xs text-zinc-400 capitalize">{cat.category_type}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-zinc-700 mb-2">Tags</label>
          <div className="flex flex-wrap gap-2">
            {COMMON_TAGS.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                  selectedTags.includes(tag)
                    ? 'bg-primary text-zinc-900 border-primary'
                    : 'border-zinc-300 text-zinc-600 hover:border-zinc-500 hover:text-zinc-900'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
          {selectedTags.length > 0 && (
            <p className="mt-2 text-xs text-zinc-500">
              Selected: {selectedTags.join(', ')}
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
