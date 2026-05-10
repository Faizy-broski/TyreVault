import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import PublishToggle from '@/components/admin/products/PublishToggle'
import type { Pattern, SkuListItem } from '@/types/admin.types'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('patterns').select('pattern_name').eq('pattern_id', id).single()
  return { title: (data as unknown as { pattern_name: string } | null)?.pattern_name ?? 'Product' }
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: rawPattern, error } = await supabase
    .from('patterns')
    .select(`
      pattern_id, pattern_name, pattern_slug, pattern_short_description,
      is_active, show_on_website, on_sale, discountable, tags,
      updated_at, created_at,
      brands ( brand_name ),
      collections ( collection_name ),
      pattern_categories ( categories ( category_id, category_name ) )
    `)
    .eq('pattern_id', id)
    .single()

  if (error || !rawPattern) notFound()

  const pattern = rawPattern as unknown as Pattern

  const { data: rawSkus } = await supabase
    .from('skus')
    .select(`
      product_id, sku, tyre_size_display, status, total_available_stock,
      width, profile, rim_size, speed_rating, load_index,
      product_stock ( available_stock, warehouses ( warehouse_name ) )
    `)
    .eq('pattern_id', id)
    .order('rim_size', { ascending: true })

  const skus = (rawSkus ?? []) as unknown as SkuListItem[]

  const brand      = (pattern.brands as { brand_name: string } | null)?.brand_name ?? '—'
  const collection = (pattern.collections as { collection_name: string } | null)?.collection_name ?? '—'

  return (
    <div className="p-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-zinc-500 mb-6">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
        <Link href="/admin/products" className="hover:text-zinc-900">Products</Link>
        <span>›</span>
        <span className="text-zinc-900 font-medium">{pattern.pattern_name}</span>
      </div>

      <div className="flex gap-6">
        {/* ── Main panel ─────────────────────────────────────────────────── */}
        <div className="flex-1 space-y-6">

          {/* Product header card */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-lg font-semibold text-zinc-900">{pattern.pattern_name}</h1>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  pattern.show_on_website
                    ? 'bg-green-50 text-green-700'
                    : 'bg-zinc-100 text-zinc-600'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${pattern.show_on_website ? 'bg-green-500' : 'bg-zinc-400'}`} />
                  {pattern.show_on_website ? 'Published' : 'Draft'}
                </span>
                <button className="p-1 text-zinc-400 hover:text-zinc-700">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                  </svg>
                </button>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div className="flex justify-between border-b border-zinc-100 pb-2">
                <dt className="text-zinc-500">Brand</dt>
                <dd className="font-medium text-zinc-800">{brand}</dd>
              </div>
              <div className="flex justify-between border-b border-zinc-100 pb-2">
                <dt className="text-zinc-500">Collection</dt>
                <dd className="font-medium text-zinc-800">{collection}</dd>
              </div>
              <div className="flex justify-between border-b border-zinc-100 pb-2">
                <dt className="text-zinc-500">Description</dt>
                <dd className="text-zinc-700">{pattern.pattern_short_description ?? '—'}</dd>
              </div>
              <div className="flex justify-between border-b border-zinc-100 pb-2">
                <dt className="text-zinc-500">Slug</dt>
                <dd className="text-zinc-700">/{pattern.pattern_slug}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">On Sale</dt>
                <dd className="font-medium">{pattern.on_sale ? 'Yes' : 'No'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Discountable</dt>
                <dd className="font-medium">{pattern.discountable ? 'Yes' : 'No'}</dd>
              </div>
            </dl>
          </div>

          {/* Media */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-zinc-900 mb-3">Media</h2>
            <div className="flex gap-3 flex-wrap">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="w-16 h-16 rounded-lg border border-zinc-200 bg-zinc-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                </div>
              ))}
            </div>
          </div>

          {/* Variants */}
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200">
              <h2 className="text-sm font-semibold text-zinc-900">Variants</h2>
              <div className="flex gap-2">
                <button className="text-sm text-zinc-600 hover:text-zinc-900 border border-zinc-300 rounded-md px-3 py-1.5 hover:bg-zinc-50 transition-colors">
                  + Edit Stock Levels
                </button>
                <button className="text-sm text-zinc-600 hover:text-zinc-900 border border-zinc-300 rounded-md px-3 py-1.5 hover:bg-zinc-50 transition-colors">
                  + Edit Prices
                </button>
                <Link
                  href={`/admin/products/${id}/variants/new`}
                  className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
                >
                  Create variant
                </Link>
              </div>
            </div>

            {/* Variants table */}
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 w-8" />
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Tire Size</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">SKU</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Inventory</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {skus.map(sku => {
                  const stockRows = Array.isArray(sku.product_stock) ? sku.product_stock : []
                  const locationCount = stockRows.length
                  const totalStock = stockRows.reduce((sum: number, s: { available_stock: number }) => sum + s.available_stock, 0)
                  const isOutOfStock = totalStock === 0

                  return (
                    <tr key={sku.product_id} className="hover:bg-zinc-50">
                      <td className="px-4 py-3">
                        <div className="w-8 h-8 rounded bg-zinc-100 flex items-center justify-center">
                          <svg className="w-4 h-4 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909" />
                          </svg>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-zinc-800">
                        <Link href={`/admin/products/${id}/variants/${sku.product_id}`}
                          className="hover:underline">
                          {sku.tyre_size_display}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-zinc-500 text-xs">{sku.sku}</td>
                      <td className="px-4 py-3">
                        <span className={isOutOfStock ? 'text-red-600 text-sm' : 'text-zinc-700 text-sm'}>
                          {isOutOfStock
                            ? `0 available at ${locationCount} location${locationCount !== 1 ? 's' : ''}`
                            : `${totalStock} available at ${locationCount} location${locationCount !== 1 ? 's' : ''}`
                          }
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button className="p-1 text-zinc-400 hover:text-zinc-700">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Right sidebar ───────────────────────────────────────────────── */}
        <div className="w-64 space-y-4">
          {/* Publish toggle */}
          <PublishToggle
            patternId={id}
            isPublished={pattern.show_on_website ?? false}
          />

          {/* Organize */}
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-zinc-900">Organize</h3>
              <button className="p-0.5 text-zinc-400 hover:text-zinc-700">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                </svg>
              </button>
            </div>
            <dl className="space-y-2 text-sm">
              {[
                { label: 'Tags', value: Array.isArray(pattern.tags) && pattern.tags.length > 0 ? (pattern.tags as string[]).join(', ') : '—' },
                { label: 'Type', value: '—' },
                { label: 'Collection', value: collection },
                { label: 'Categories', value: '—' },
              ].map(item => (
                <div key={item.label} className="flex justify-between">
                  <dt className="text-zinc-500">{item.label}</dt>
                  <dd className="text-zinc-700 text-right">{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Attributes */}
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-zinc-900">Attributes</h3>
              <button className="p-0.5 text-zinc-400 hover:text-zinc-700">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                </svg>
              </button>
            </div>
            <dl className="space-y-2 text-sm">
              {[
                { label: 'Length', value: '—' },
                { label: 'MID code', value: '—' },
                { label: 'HS code', value: '—' },
                { label: 'Country of origin', value: '—' },
              ].map(item => (
                <div key={item.label} className="flex justify-between">
                  <dt className="text-zinc-500">{item.label}</dt>
                  <dd className="text-zinc-700">{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}
