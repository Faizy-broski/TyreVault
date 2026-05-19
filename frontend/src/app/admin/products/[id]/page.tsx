'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { AdminBreadcrumb } from '@/components/admin/AdminBreadcrumb'
import { toastError } from '@/lib/toast'
import PublishToggle from '@/components/admin/products/PublishToggle'
import ProductActionsBar, { VariantsTableActions, VariantRowMenu } from '@/components/admin/products/ProductActionsBar'
import type { Pattern, SkuListItem } from '@/types/admin.types'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()

  const [pattern, setPattern]     = useState<Pattern | null>(null)
  const [skus, setSkus]           = useState<SkuListItem[]>([])
  const [loading, setLoading]     = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  const onRefresh = useCallback(() => setRefreshKey(k => k + 1), [])

  useEffect(() => {
    document.title = pattern ? `${pattern.pattern_name} | Tyre Vault` : 'Product | Tyre Vault'
  }, [pattern])

  // `t` param is injected by EditProductWizard after a successful save to bust the router cache
  const t = searchParams.get('t')

  useEffect(() => {
    if (!id) return
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const { data: { session } } = await createClient().auth.getSession()
        const tok = session?.access_token ?? ''

        const res = await fetch(`${API}/api/admin/products/${id}`, {
          headers: { Authorization: `Bearer ${tok}` },
          cache: 'no-store',
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error ?? `API returned ${res.status}`)
        }
        const json = await res.json()
        if (!cancelled) {
          setPattern(json.pattern as Pattern)
          setSkus((json.skus ?? []) as SkuListItem[])
        }
      } catch (err) {
        if (!cancelled) toastError(err instanceof Error ? err.message : 'Failed to load product')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [id, refreshKey, t])

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="h-8 w-48 bg-zinc-100 rounded animate-pulse mb-6" />
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-32 bg-zinc-100 rounded-xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  if (!pattern) {
    return (
      <div className="p-4 sm:p-6">
        <AdminBreadcrumb crumbs={[{ label: 'Products', href: '/admin/products' }, { label: 'Product' }]} />
        <p className="mt-6 text-sm text-zinc-500">Product not found.</p>
      </div>
    )
  }

  const brand      = (pattern.brands as { brand_name: string } | null)?.brand_name ?? '—'
  const collection = (pattern.collections as { collection_name: string } | null)?.collection_name ?? '—'
  const images     = Array.isArray(pattern.gallery_images) ? pattern.gallery_images as string[] : []
  const categories = (pattern.pattern_categories ?? [])
    .map(pc => pc.categories?.category_name)
    .filter(Boolean)
    .join(', ') || '—'

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <AdminBreadcrumb crumbs={[
          { label: 'Products', href: '/admin/products' },
          { label: pattern.pattern_name },
        ]} />
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex-1 min-w-0 space-y-6">
          {/* ── Overview card ─────────────────────────────────── */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-start sm:justify-between">
              <h1 className="text-lg font-semibold text-zinc-900">{pattern.pattern_name}</h1>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  pattern.show_on_website ? 'bg-green-50 text-green-700' : 'bg-zinc-100 text-zinc-600'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${pattern.show_on_website ? 'bg-green-500' : 'bg-zinc-400'}`} />
                  {pattern.show_on_website ? 'Published' : 'Draft'}
                </span>
                <Link
                  href={`/admin/products/${id}/edit`}
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                  </svg>
                  Edit
                </Link>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <ProductActionsBar patternId={id} pattern={pattern} skuStocks={skus as any} skuPrices={skus as any} onSuccess={onRefresh} />
              </div>
            </div>

            <dl className="grid grid-cols-1 gap-y-3 text-sm sm:grid-cols-2 sm:gap-x-6">
              {[
                { label: 'Brand',       value: brand },
                { label: 'Collection',  value: collection },
                { label: 'Description', value: pattern.pattern_short_description ?? '—' },
                { label: 'Slug',        value: `/${pattern.pattern_slug}` },
                { label: 'On Sale',     value: pattern.on_sale ? 'Yes' : 'No' },
                { label: 'Discountable', value: pattern.discountable ? 'Yes' : 'No' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between border-b border-zinc-100 pb-2">
                  <dt className="text-zinc-500">{label}</dt>
                  <dd className="font-medium text-zinc-800">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* ── Media card ────────────────────────────────────── */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-zinc-900 mb-3">Media</h2>
            {images.length > 0 ? (
              <div className="flex gap-3 flex-wrap">
                {images.map((src, i) => (
                  <div key={i} className="w-16 h-16 rounded-lg border border-zinc-200 bg-zinc-100 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`${pattern.pattern_name} image ${i + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-400">No images uploaded.</p>
            )}
          </div>

          {/* ── Variants table ─────────────────────────────────── */}
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            <div className="flex flex-col gap-3 px-5 py-4 border-b border-zinc-200 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-sm font-semibold text-zinc-900">Variants</h2>
              <div className="flex flex-wrap gap-2">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <VariantsTableActions patternId={id} skuStocks={skus as any} skuPrices={skus as any} onSuccess={onRefresh} />
                <Link href={`/admin/products/${id}/variants/new`} className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-primary/90 transition-colors">
                  Add variant
                </Link>
              </div>
            </div>

            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 w-8"><span className="sr-only">Image</span></th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Tire Size</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">SKU</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Inventory</th>
                  <th className="px-4 py-3 w-10"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {skus.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-zinc-400">No variants yet. Add the first one.</td>
                  </tr>
                ) : skus.map(sku => {
                  const stockRows     = Array.isArray(sku.product_stock) ? sku.product_stock : []
                  const totalStock    = stockRows.reduce((sum: number, s: { available_stock: number }) => sum + s.available_stock, 0)
                  const locationCount = stockRows.length
                  const isOutOfStock  = totalStock === 0
                  const thumb         = Array.isArray((sku as any).variant_images) && (sku as any).variant_images.length > 0
                    ? (sku as any).variant_images[0] as string
                    : null

                  return (
                    <tr key={sku.product_id} className="hover:bg-zinc-50">
                      <td className="px-4 py-3">
                        <div className="w-8 h-8 rounded bg-zinc-100 overflow-hidden flex items-center justify-center">
                          {thumb ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={thumb} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <svg className="w-4 h-4 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909" />
                            </svg>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-zinc-800">
                        <Link href={`/admin/products/${id}/variants/${sku.product_id}`} className="hover:underline">
                          {sku.tyre_size_display}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-zinc-500 text-xs">{sku.sku}</td>
                      <td className="px-4 py-3">
                        <span className={isOutOfStock ? 'text-red-600 text-sm' : 'text-zinc-700 text-sm'}>
                          {isOutOfStock
                            ? `0 in stock · ${locationCount} location${locationCount !== 1 ? 's' : ''}`
                            : `${totalStock} in stock · ${locationCount} location${locationCount !== 1 ? 's' : ''}`}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <VariantRowMenu patternId={id} variantId={sku.product_id} variantName={sku.tyre_size_display} onDeleted={onRefresh} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          </div>
        </div>

        {/* ── Right sidebar ────────────────────────────────────── */}
        <div className="w-full space-y-4 lg:w-64 lg:shrink-0">
          <PublishToggle patternId={id} isPublished={pattern.show_on_website ?? false} onSuccess={onRefresh} />

          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-zinc-900 mb-3">Organize</h3>
            <dl className="space-y-2 text-sm">
              {[
                { label: 'Tags',       value: Array.isArray(pattern.tags) && pattern.tags.length > 0 ? (pattern.tags as string[]).join(', ') : '—' },
                { label: 'Type',       value: pattern.application_type ?? '—' },
                { label: 'Collection', value: collection },
                { label: 'Categories', value: categories },
              ].map(item => (
                <div key={item.label} className="flex justify-between gap-2">
                  <dt className="text-zinc-500 shrink-0">{item.label}</dt>
                  <dd className="text-zinc-700 text-right truncate">{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}
