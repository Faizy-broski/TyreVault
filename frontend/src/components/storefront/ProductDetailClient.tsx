'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ShoppingCart, ChevronLeft } from 'lucide-react'
import { useCartStore } from '@/stores/cart.store'

interface Sibling {
  product_id:        string
  product_slug:      string | null
  tyre_size_display: string
  width:             number | null
  profile:           number | null
  rim_size:          number | null
  total_available_stock: number
}

interface Product {
  product_id:        string
  sku:               string
  product_slug:      string | null
  tyre_size_display: string
  brand_name:        string | null
  brand_slug:        string | null
  pattern_name:      string | null
  pattern_slug:      string | null
  pattern_short_description: string | null
  application_type:  string | null
  retail_price:      number | null
  total_available_stock: number
  gallery_images:    string[]
  variant_images:    string[] | null
  runflat:           boolean
  xl_reinforced:     boolean
  speed_rating:      string | null
  load_index:        string | null
  ply_rating:        string | null
  load_range:        string | null
  construction_type: string | null
  sidewall:          string | null
  country_of_origin: string | null
  overall_diameter:  number | null
  tread_depth:       number | null
  tyre_weight:       number | null
  e_mark:            string | null
  utqg:              string | null
  fuel_rating:       string | null
  wet_grip:          string | null
  noise_db:          string | null
  noise_class:       string | null
  width:             number | null
  profile:           number | null
  rim_size:          number | null
  siblings:          Sibling[]
}

function StockBadge({ stock }: { stock: number }) {
  if (stock === 0) return <span className="text-sm font-medium text-red-600">Out of stock</span>
  if (stock <= 4)  return <span className="text-sm font-medium text-amber-600">Low stock — {stock} left</span>
  return <span className="text-sm font-medium text-green-700">In stock</span>
}

function EULabel({ fuel, wet, noise, noiseClass }: {
  fuel?: string | null; wet?: string | null; noise?: string | null; noiseClass?: string | null
}) {
  if (!fuel && !wet && !noise) return null
  const ratingColour = (r?: string | null) => {
    if (!r) return 'text-zinc-400'
    const map: Record<string, string> = { A: 'text-green-600', B: 'text-lime-600', C: 'text-yellow-600', D: 'text-amber-600', E: 'text-orange-600', F: 'text-red-600', G: 'text-red-700' }
    return map[r.toUpperCase()] ?? 'text-zinc-600'
  }
  return (
    <div className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
      {fuel && (
        <div className="text-center">
          <p className="text-xs text-zinc-500 mb-0.5">Fuel</p>
          <p className={`text-xl font-bold ${ratingColour(fuel)}`}>{fuel}</p>
        </div>
      )}
      {wet && (
        <div className="text-center">
          <p className="text-xs text-zinc-500 mb-0.5">Wet Grip</p>
          <p className={`text-xl font-bold ${ratingColour(wet)}`}>{wet}</p>
        </div>
      )}
      {noise && (
        <div className="text-center">
          <p className="text-xs text-zinc-500 mb-0.5">Noise</p>
          <p className="text-base font-bold text-zinc-800">{noise} dB {noiseClass ? `(${noiseClass})` : ''}</p>
        </div>
      )}
    </div>
  )
}

function SpecRow({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === '') return null
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-zinc-100 last:border-0">
      <span className="text-sm text-zinc-500">{label}</span>
      <span className="text-sm font-medium text-zinc-800">{String(value)}</span>
    </div>
  )
}

export default function ProductDetailClient({ product }: { product: Product }) {
  const [activeImg, setActiveImg] = useState(0)
  const { addItem, openCart } = useCartStore()

  const images = [
    ...(product.variant_images ?? []),
    ...(product.gallery_images ?? []),
  ].filter(Boolean)

  async function handleAddToCart() {
    const result = await addItem({
      id:    product.product_id,
      sku:   product.sku,
      name:  `${product.brand_name ?? ''} ${product.pattern_name ?? ''}`.trim(),
      size:  product.tyre_size_display,
      price: product.retail_price ?? 0,
      image: images[0] ?? null,
      stock: product.total_available_stock,
    }, 1)
    if (result.error === 'out_of_stock') {
      alert('Sorry, this item is out of stock.')
      return
    }
    if (result.error === 'insufficient_stock') {
      alert(`Only ${result.available} unit(s) available. Cart updated to maximum.`)
    }
    openCart()
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm text-zinc-500">
        <Link href="/tyres" className="flex items-center gap-1 hover:text-zinc-800">
          <ChevronLeft className="w-3.5 h-3.5" />
          Shop Tyres
        </Link>
        <span>/</span>
        {product.brand_name && (
          <>
            <Link href={`/tyres?brand=${encodeURIComponent(product.brand_name)}`} className="hover:text-zinc-800">
              {product.brand_name}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-zinc-800">{product.tyre_size_display}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Gallery */}
        <div className="space-y-3">
          <div className="aspect-[4/3] rounded-2xl bg-zinc-100 relative overflow-hidden">
            {images.length > 0 ? (
              <Image
                src={images[activeImg]}
                alt={product.tyre_size_display}
                fill
                className="object-contain p-8"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 rounded-full border-8 border-zinc-200 opacity-30" />
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveImg(i)}
                  className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                    i === activeImg ? 'border-primary' : 'border-transparent'
                  }`}
                >
                  <Image src={img} alt="" width={64} height={64} className="w-full h-full object-contain p-1" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-5">
          <div>
            {product.brand_name && (
              <p className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">{product.brand_name}</p>
            )}
            <h1 className="text-2xl font-bold text-zinc-900 mt-1">
              {product.pattern_name ?? product.sku}
            </h1>
            <p className="text-lg text-zinc-600 mt-0.5">{product.tyre_size_display}</p>
            {product.pattern_short_description && (
              <p className="text-sm text-zinc-500 mt-2 leading-relaxed">{product.pattern_short_description}</p>
            )}
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2">
            {product.runflat      && <span className="rounded-full bg-blue-50 text-blue-700 px-3 py-1 text-xs font-medium">Runflat</span>}
            {product.xl_reinforced && <span className="rounded-full bg-purple-50 text-purple-700 px-3 py-1 text-xs font-medium">XL / Extra Load</span>}
            {product.application_type && <span className="rounded-full bg-zinc-100 text-zinc-700 px-3 py-1 text-xs font-medium">{product.application_type}</span>}
          </div>

          {/* EU Label */}
          <EULabel fuel={product.fuel_rating} wet={product.wet_grip} noise={product.noise_db} noiseClass={product.noise_class} />

          {/* Price + CTA */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-3">
            <div className="flex items-baseline justify-between">
              {product.retail_price != null ? (
                <p className="text-3xl font-bold text-zinc-900">${product.retail_price.toFixed(2)}</p>
              ) : (
                <p className="text-base text-zinc-500">Price on request</p>
              )}
              <StockBadge stock={product.total_available_stock} />
            </div>
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={product.total_available_stock === 0}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-zinc-900 hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ShoppingCart className="w-4 h-4" />
              {product.total_available_stock === 0 ? 'Out of Stock' : 'Add to Cart'}
            </button>
          </div>

          {/* Size selector */}
          {product.siblings.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Other Sizes</p>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-lg border-2 border-primary bg-primary/10 px-3 py-1.5 text-xs font-semibold text-zinc-900">
                  {product.tyre_size_display}
                </span>
                {product.siblings.map(s => (
                  <Link
                    key={s.product_id}
                    href={s.product_slug ? `/tyres/${s.product_slug}` : '#'}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:border-zinc-500 hover:bg-zinc-50 transition-colors"
                  >
                    {s.tyre_size_display}
                    {s.total_available_stock === 0 && <span className="ml-1 text-zinc-400">(OOS)</span>}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Specs */}
      <div className="mt-12 rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="text-base font-semibold text-zinc-900 mb-4">Specifications</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10">
          <SpecRow label="Width"              value={product.width ? `${product.width} mm` : null} />
          <SpecRow label="Profile"            value={product.profile ? `${product.profile}%` : null} />
          <SpecRow label="Rim Size"           value={product.rim_size ? `${product.rim_size}"` : null} />
          <SpecRow label="Speed Rating"       value={product.speed_rating} />
          <SpecRow label="Load Index"         value={product.load_index} />
          <SpecRow label="Construction"       value={product.construction_type} />
          <SpecRow label="Ply Rating"         value={product.ply_rating} />
          <SpecRow label="Load Range"         value={product.load_range} />
          <SpecRow label="Sidewall"           value={product.sidewall} />
          <SpecRow label="Overall Diameter"   value={product.overall_diameter ? `${product.overall_diameter} mm` : null} />
          <SpecRow label="Tread Depth"        value={product.tread_depth ? `${product.tread_depth} mm` : null} />
          <SpecRow label="Tyre Weight"        value={product.tyre_weight ? `${product.tyre_weight} kg` : null} />
          <SpecRow label="Country of Origin"  value={product.country_of_origin} />
          <SpecRow label="E-Mark"             value={product.e_mark} />
          <SpecRow label="UTQG"               value={product.utqg} />
        </div>
      </div>
    </div>
  )
}
