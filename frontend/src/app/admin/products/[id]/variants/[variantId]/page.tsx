import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Sku, PatternRef, ProductStock, ProductPrice } from '@/types/admin.types'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; variantId: string }>
}) {
  const { variantId } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('skus')
    .select('sku, tyre_size_display')
    .eq('product_id', variantId)
    .single()
  const row = data as unknown as { sku: string; tyre_size_display: string } | null
  return { title: row?.tyre_size_display ?? row?.sku ?? 'Variant' }
}

export default async function VariantDetailPage({
  params,
}: {
  params: Promise<{ id: string; variantId: string }>
}) {
  const { id, variantId } = await params
  const supabase = await createClient()

  const { data: rawSku, error } = await supabase
    .from('skus')
    .select(`
      product_id, sku, tyre_size_display, status,
      width, profile, rim_size, speed_rating, load_index,
      fuel_rating, wet_grip, noise_db, noise_class, runflat,
      xl_reinforced, ply_rating, load_range, country_of_origin,
      cost_price, compare_at_price, variant_images,
      patterns ( pattern_id, pattern_name, pattern_slug,
        brands ( brand_name )
      ),
      product_prices ( price_inc_gst, customer_groups ( group_name ) ),
      product_stock (
        available_stock, reserved_stock,
        warehouses ( warehouse_name, warehouse_id )
      )
    `)
    .eq('product_id', variantId)
    .single()

  if (error || !rawSku) notFound()

  const sku     = rawSku as unknown as Sku
  const pattern = sku.patterns as PatternRef | null
  const prices  = (Array.isArray(sku.product_prices) ? sku.product_prices : []) as ProductPrice[]
  const stocks  = (Array.isArray(sku.product_stock)  ? sku.product_stock  : []) as ProductStock[]


  const specs = [
    { label: 'SKU',          value: sku.sku },
    { label: 'Width (mm)',   value: sku.width   != null ? String(sku.width)   : '—' },
    { label: 'Aspect Ratio', value: sku.profile != null ? String(sku.profile) : '—' },
    { label: 'Rim Size (in)',value: sku.rim_size != null ? String(sku.rim_size) : '—' },
    { label: 'Speed Rating', value: sku.speed_rating  || '—' },
    { label: 'Load Index',   value: sku.load_index    || '—' },
    { label: 'Fuel Rating',  value: sku.fuel_rating   || '—' },
    { label: 'Wet',          value: sku.wet_grip      || '—' },
    { label: 'Noise',        value: sku.noise_db      || '—' },
    { label: 'Run Flat',     value: sku.runflat ? 'Yes' : 'No' },
    { label: 'XL Reinforced',value: sku.xl_reinforced ? 'Yes' : 'No' },
    { label: 'Ply Rating',   value: sku.ply_rating    || '—' },
    { label: 'Load Range',   value: sku.load_range    || '—' },
    { label: 'Origin',       value: sku.country_of_origin || '—' },
  ]

  const images: string[] = Array.isArray(sku.variant_images) ? sku.variant_images as string[] : []

  return (
    <div className="p-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-zinc-500 mb-6 flex-wrap">
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
        <Link href="/admin/products" className="hover:text-zinc-900">Products</Link>
        <span>›</span>
        <Link href={`/admin/products/${id}`} className="hover:text-zinc-900">
          {pattern?.pattern_name ?? 'Product'}
        </Link>
        <span>›</span>
        <span className="text-zinc-900 font-medium">{sku.tyre_size_display || sku.sku}</span>
      </div>

      <div className="flex gap-6">
        {/* ── Main panel ─────────────────────────────────────────────── */}
        <div className="flex-1 space-y-6">

          {/* Variant header */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-lg font-semibold text-zinc-900">{sku.tyre_size_display || sku.sku}</h1>
                <p className="text-sm text-zinc-500 mt-0.5">
                  {pattern?.brands?.brand_name} · {pattern?.pattern_name}
                </p>
              </div>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                sku.status === 'active'
                  ? 'bg-green-50 text-green-700'
                  : 'bg-zinc-100 text-zinc-600'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${sku.status === 'active' ? 'bg-green-500' : 'bg-zinc-400'}`} />
                {sku.status === 'active' ? 'Active' : 'Inactive'}
              </span>
            </div>

            {/* Specs grid */}
            <dl className="grid grid-cols-3 gap-x-6 gap-y-3 text-sm">
              {specs.map(spec => (
                <div key={spec.label} className="flex justify-between border-b border-zinc-100 pb-2">
                  <dt className="text-zinc-500">{spec.label}</dt>
                  <dd className="font-medium text-zinc-800">{spec.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Media */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-zinc-900 mb-3">Media</h2>
            <div className="flex gap-3 flex-wrap">
              {images.length > 0
                ? images.map((src, i) => (
                    <div key={i} className="w-16 h-16 rounded-lg border border-zinc-200 bg-zinc-100 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))
                : [0, 1, 2, 3].map(i => (
                    <div key={i} className="w-16 h-16 rounded-lg border border-zinc-200 bg-zinc-100 flex items-center justify-center">
                      <svg className="w-6 h-6 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                          d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                      </svg>
                    </div>
                  ))
              }
              <button className="w-16 h-16 rounded-lg border-2 border-dashed border-zinc-300 flex items-center justify-center hover:border-zinc-400 transition-colors">
                <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </button>
            </div>
          </div>

          {/* Inventory table */}
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200">
              <h2 className="text-sm font-semibold text-zinc-900">Inventory</h2>
              <button className="text-sm text-zinc-600 hover:text-zinc-900 border border-zinc-300 rounded-md px-3 py-1.5 hover:bg-zinc-50 transition-colors">
                Edit Stock
              </button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Available</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Reserved</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {stocks.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-zinc-400">
                      No inventory locations configured.
                    </td>
                  </tr>
                ) : (
                  stocks.map((s, i) => {
                    const avail    = s.available_stock ?? 0
                    const reserved = s.reserved_stock  ?? 0
                    const total    = avail + reserved
                    return (
                      <tr key={i} className="hover:bg-zinc-50">
                        <td className="px-4 py-3 font-medium text-zinc-800">
                          {s.warehouses?.warehouse_name ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={avail === 0 ? 'text-red-600' : 'text-zinc-700'}>
                            {avail}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zinc-500">{reserved}</td>
                        <td className="px-4 py-3 text-zinc-700">{total}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Right sidebar ───────────────────────────────────────────── */}
        <div className="w-64 space-y-4">

          {/* Price */}
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-zinc-900">Pricing</h3>
              <button className="p-0.5 text-zinc-400 hover:text-zinc-700">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                </svg>
              </button>
            </div>
            <dl className="space-y-2 text-sm">
              {prices.map((p, i) => (
                <div key={i} className="flex justify-between">
                  <dt className="text-zinc-500">{p.customer_groups?.group_name ?? 'Retail'}</dt>
                  <dd className="font-medium text-zinc-900">
                    {p.price_inc_gst != null
                      ? `A$${Number(p.price_inc_gst).toFixed(2)}`
                      : '—'}
                  </dd>
                </div>
              ))}
              {prices.length === 0 && (
                <p className="text-zinc-400 text-xs">No prices set.</p>
              )}
              {sku.compare_at_price != null && (
                <div className="flex justify-between pt-1 border-t border-zinc-100">
                  <dt className="text-zinc-500">Compare at</dt>
                  <dd className="text-zinc-500 line-through">
                    A${Number(sku.compare_at_price).toFixed(2)}
                  </dd>
                </div>
              )}
              {sku.cost_price != null && (
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Cost</dt>
                  <dd className="text-zinc-700">A${Number(sku.cost_price).toFixed(2)}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Attributes */}
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-zinc-900 mb-3">Attributes</h3>
            <dl className="space-y-2 text-sm">
              {[
                { label: 'Noise Class',  value: sku.noise_class || '—' },
                { label: 'Load Range',   value: sku.load_range  || '—' },
                { label: 'Ply Rating',   value: sku.ply_rating  || '—' },
                { label: 'Origin',       value: sku.country_of_origin || '—' },
              ].map(item => (
                <div key={item.label} className="flex justify-between">
                  <dt className="text-zinc-500">{item.label}</dt>
                  <dd className="text-zinc-700">{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Danger zone */}
          <div className="rounded-xl border border-red-100 bg-white p-4">
            <h3 className="text-sm font-semibold text-red-600 mb-3">Danger Zone</h3>
            <button className="w-full rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
              Delete Variant
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
