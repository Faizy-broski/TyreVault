'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AdminBreadcrumb } from '@/components/admin/AdminBreadcrumb'
import { toastError } from '@/lib/toast'
import type { Sku, PatternRef, ProductPrice } from '@/types/admin.types'
import { VariantPricingMenu, VariantDangerZone } from '@/components/admin/products/VariantDetailActions'
import StockTab from '@/components/admin/products/StockTab'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export default function VariantDetailPage() {
  const { id, variantId } = useParams<{ id: string; variantId: string }>()

  const [sku, setSku]         = useState<Sku | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  const onRefresh = useCallback(() => setRefreshKey(k => k + 1), [])

  useEffect(() => {
    document.title = sku ? `${sku.tyre_size_display} | Tyre Vault` : 'Variant | Tyre Vault'
  }, [sku])

  useEffect(() => {
    if (!id || !variantId) return
    let cancelled = false
    setLoading(true)
    async function load() {
      try {
        const { data: { session } } = await createClient().auth.getSession()
        const tok = session?.access_token ?? ''
        const headers = { Authorization: `Bearer ${tok}` }

        const res = await fetch(`${API}/api/admin/products/${id}`, { headers })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error ?? `API returned ${res.status}`)
        }
        const json = await res.json()
        const found = (json.skus ?? []).find((s: { product_id: string }) => s.product_id === variantId)
        if (!found) throw new Error('Variant not found')

        const skuWithPattern: Sku = {
          ...found,
          patterns: json.pattern ? {
            pattern_id:   json.pattern.pattern_id,
            pattern_name: json.pattern.pattern_name,
            pattern_slug: json.pattern.pattern_slug,
            brands:       json.pattern.brands ?? null,
          } : null,
        }
        if (!cancelled) {
          setSku(skuWithPattern)
        }
      } catch (err) {
        if (!cancelled) toastError(err instanceof Error ? err.message : 'Failed to load variant')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [id, variantId, refreshKey])

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

  if (!sku) {
    return (
      <div className="p-4 sm:p-6">
        <AdminBreadcrumb crumbs={[{ label: 'Products', href: '/admin/products' }, { label: 'Product', href: `/admin/products/${id}` }, { label: 'Variant' }]} />
        <p className="mt-6 text-sm text-zinc-500">Variant not found.</p>
      </div>
    )
  }

  const pattern = sku.patterns as PatternRef | null
  const prices  = (Array.isArray(sku.product_prices) ? sku.product_prices : []) as ProductPrice[]
  const images: string[] = Array.isArray(sku.variant_images) ? sku.variant_images as string[] : []

  const n = (v: string | number | null | undefined) => v != null ? String(v) : '—'
  const specs = [
    { label: 'SKU',              value: sku.sku },
    { label: 'Width (mm)',       value: n(sku.width) },
    { label: 'Aspect Ratio',     value: n(sku.profile) },
    { label: 'Rim Size (in)',    value: n(sku.rim_size) },
    { label: 'Construction',     value: sku.construction_type || '—' },
    { label: 'Speed Rating',     value: sku.speed_rating  || '—' },
    { label: 'Load Index',       value: sku.load_index    || '—' },
    { label: 'Load/Speed Rating',value: sku.load_speed_rating || '—' },
    { label: 'Fuel Rating',      value: sku.fuel_rating   || '—' },
    { label: 'Wet Grip',         value: sku.wet_grip      || '—' },
    { label: 'Noise (dB)',       value: sku.noise_db      || '—' },
    { label: 'Noise Class',      value: sku.noise_class   || '—' },
    { label: 'Run Flat',         value: sku.runflat ? 'Yes' : 'No' },
    { label: 'XL Reinforced',    value: sku.xl_reinforced ? 'Yes' : 'No' },
    { label: 'Ply Rating',       value: sku.ply_rating    || '—' },
    { label: 'Load Range',       value: sku.load_range    || '—' },
    { label: 'Sidewall',         value: sku.sidewall      || '—' },
    { label: 'Tube Type',        value: sku.tube_type     || '—' },
    { label: 'Country of Origin',value: sku.country_of_origin || '—' },
    { label: 'Manufacturer',     value: sku.manufacturer_name || '—' },
    { label: 'Factory Name',     value: sku.factory_name    || '—' },
    { label: 'Factory Country',  value: sku.factory_country || '—' },
    { label: 'Section Width',    value: n(sku.section_width) },
    { label: 'Tread Depth (mm)', value: n(sku.tread_depth) },
    { label: 'Tyre Weight (kg)', value: n(sku.tyre_weight) },
    { label: 'Overall Dia (mm)', value: n(sku.overall_diameter) },
    { label: 'Max Load',         value: sku.max_load     || '—' },
    { label: 'Max Pressure',     value: sku.max_pressure || '—' },
    { label: 'E-Mark',           value: sku.e_mark   || '—' },
    { label: 'DOT Code',         value: sku.dot_code || '—' },
    { label: 'UTQG',             value: sku.utqg     || '—' },
  ]

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <AdminBreadcrumb crumbs={[
          { label: 'Products', href: '/admin/products' },
          { label: pattern?.pattern_name ?? 'Product', href: `/admin/products/${id}` },
          { label: sku.tyre_size_display || sku.sku },
        ]} />
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex-1 min-w-0 space-y-6">
          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-lg font-semibold text-zinc-900">{sku.tyre_size_display || sku.sku}</h1>
                <p className="text-sm text-zinc-500 mt-0.5">{pattern?.brands?.brand_name} · {pattern?.pattern_name}</p>
              </div>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium self-start ${
                sku.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-zinc-100 text-zinc-600'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${sku.status === 'active' ? 'bg-green-500' : 'bg-zinc-400'}`} />
                {sku.status === 'active' ? 'Active' : 'Inactive'}
              </span>
            </div>

            <dl className="grid grid-cols-1 gap-y-3 text-sm sm:grid-cols-2 sm:gap-x-6 lg:grid-cols-3">
              {specs.map(spec => (
                <div key={spec.label} className="flex justify-between border-b border-zinc-100 pb-2">
                  <dt className="text-zinc-500">{spec.label}</dt>
                  <dd className="font-medium text-zinc-800">{spec.value}</dd>
                </div>
              ))}
            </dl>
          </div>

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
                : <p className="text-sm text-zinc-400">No images uploaded.</p>
              }
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-zinc-900 mb-4">Stock</h2>
            <StockTab productId={variantId} patternId={id} />
          </div>
        </div>

        <div className="w-full space-y-4 lg:w-64 lg:shrink-0">
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-zinc-900">Pricing</h3>
              <VariantPricingMenu
                patternId={id}
                variantId={variantId}
                onSuccess={onRefresh}
                prices={prices.map(p => ({
                  group_name:    p.customer_groups?.group_name ?? 'Retail',
                  price_inc_gst: p.price_inc_gst,
                }))}
              />
            </div>
            <dl className="space-y-2 text-sm">
              {prices.map((p, i) => (
                <div key={i} className="flex justify-between">
                  <dt className="text-zinc-500">{p.customer_groups?.group_name ?? 'Retail'}</dt>
                  <dd className="font-medium text-zinc-900">
                    {p.price_inc_gst != null ? `A$${Number(p.price_inc_gst).toFixed(2)}` : '—'}
                  </dd>
                </div>
              ))}
              {prices.length === 0 && <div><dt className="sr-only">Prices</dt><dd className="text-zinc-400 text-xs">No prices set.</dd></div>}
              {sku.compare_at_price != null && (
                <div className="flex justify-between pt-1 border-t border-zinc-100">
                  <dt className="text-zinc-500">Compare at</dt>
                  <dd className="text-zinc-500 line-through">A${Number(sku.compare_at_price).toFixed(2)}</dd>
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

          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-zinc-900 mb-3">Attributes</h3>
            <dl className="space-y-2 text-sm">
              {[
                { label: 'Noise Class', value: sku.noise_class || '—' },
                { label: 'Load Range',  value: sku.load_range  || '—' },
                { label: 'Ply Rating',  value: sku.ply_rating  || '—' },
                { label: 'Origin',      value: sku.country_of_origin || '—' },
              ].map(item => (
                <div key={item.label} className="flex justify-between">
                  <dt className="text-zinc-500">{item.label}</dt>
                  <dd className="text-zinc-700">{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="rounded-xl border border-red-100 bg-white p-4">
            <h3 className="text-sm font-semibold text-red-600 mb-3">Danger Zone</h3>
            <VariantDangerZone patternId={id} variantId={variantId} variantName={sku.tyre_size_display || sku.sku} />
          </div>
        </div>
      </div>
    </div>
  )
}
