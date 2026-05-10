'use client'

import { useState } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { createProductSchema, type CreateProductFormValues } from './schema'
import BasicInfoTab from './tabs/BasicInfoTab'
import CategoriesTab from './tabs/CategoriesTab'
import VariantsTab from './tabs/VariantsTab'
import PricingTab from './tabs/PricingTab'
import { cn } from '@/lib/utils/cn'

const TABS = [
  { key: 'basic',      label: 'Basic Info' },
  { key: 'categories', label: 'Categories' },
  { key: 'variants',   label: 'Variants' },
  { key: 'pricing',    label: 'Pricing' },
] as const

type TabKey = typeof TABS[number]['key']

type Props = {
  brands:      { brand_id: string; brand_name: string }[]
  collections: { collection_id: string; collection_name: string }[]
  categories:  { category_id: string; category_name: string; category_type: string }[]
  warehouses:  { warehouse_id: string; warehouse_name: string }[]
}

export default function CreateProductWizard({ brands, collections, categories, warehouses }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabKey>('basic')
  const [completedTabs, setCompletedTabs] = useState<Set<TabKey>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const methods = useForm<CreateProductFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createProductSchema) as any,
    defaultValues: {
      brandId: '',
      patternName: '',
      patternSlug: '',
      shortDescription: '',
      galleryImages: [],
      tyreOverview: '',
      features: '',
      warrantyInformation: '',
      tyreSpecSheet: '',
      faqList: [],
      discountable: true,
      applicationType: 'PCR',
      categoryIds: [],
      performanceCategory: '',
      seasonType: '',
      collectionId: '',
      tags: [],
      variants: [],
      pricing: [],
    },
  })

  // Auto-generate slug from pattern name
  const watchName = methods.watch('patternName')
  const autoSlug  = watchName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  function goToTab(tab: TabKey) {
    setActiveTab(tab)
  }

  function markTabComplete(tab: TabKey) {
    setCompletedTabs(prev => new Set([...prev, tab]))
  }

  async function handlePublish(values: CreateProductFormValues) {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message ?? 'Failed to create product')
      }
      const { patternId } = await res.json()
      router.push(`/admin/products/${patternId}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  const tabIndex = TABS.findIndex(t => t.key === activeTab)

  return (
    <FormProvider {...methods}>
      <div className="flex flex-col h-full">
        {/* Wizard header */}
        <div className="flex items-center gap-2 px-6 py-4 border-b border-zinc-200 bg-white">
          {/* Close / esc */}
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 transition-colors mr-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            esc
          </button>

          {/* Tab steps */}
          {TABS.map((tab, i) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => goToTab(tab.key)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors',
                activeTab === tab.key
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : completedTabs.has(tab.key)
                  ? 'text-zinc-700 hover:bg-zinc-100'
                  : 'text-zinc-400 cursor-default'
              )}
            >
              {/* Step indicator */}
              <span className={cn(
                'w-5 h-5 rounded-full flex items-center justify-center text-xs',
                activeTab === tab.key
                  ? 'bg-blue-600 text-white'
                  : completedTabs.has(tab.key)
                  ? 'bg-zinc-800 text-white'
                  : 'border border-zinc-300 text-zinc-400'
              )}>
                {completedTabs.has(tab.key) && activeTab !== tab.key ? (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : i + 1}
              </span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-6 mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">
            {error}
          </div>
        )}

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {activeTab === 'basic'      && <BasicInfoTab autoSlug={autoSlug} />}
          {activeTab === 'categories' && <CategoriesTab brands={brands} collections={collections} categories={categories} />}
          {activeTab === 'variants'   && <VariantsTab />}
          {activeTab === 'pricing'    && <PricingTab warehouses={warehouses} />}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-200 bg-white">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900"
          >
            Cancel
          </button>

          {activeTab !== 'pricing' ? (
            <button
              type="button"
              onClick={() => {
                markTabComplete(activeTab)
                const next = TABS[tabIndex + 1]
                if (next) setActiveTab(next.key)
              }}
              className="px-4 py-2 rounded-md bg-zinc-900 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
            >
              Save & Continue
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={methods.handleSubmit(handlePublish)}
              className="px-5 py-2 rounded-md bg-zinc-900 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Publishing…' : 'Publish'}
            </button>
          )}
        </div>
      </div>
    </FormProvider>
  )
}
