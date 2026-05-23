import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import ProductDetailClient from '@/components/storefront/ProductDetailClient'

export const revalidate = 600

interface Props {
  params: Promise<{ slug: string }>
}

// Pre-render all active SKU slugs at build time
export async function generateStaticParams() {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('skus')
    .select('product_slug')
    .eq('status', 'active')
    .not('product_slug', 'is', null)

  return (data ?? [])
    .filter((r: any) => r.product_slug)
    .map((r: any) => ({ slug: r.product_slug as string }))
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: sku } = await supabase
    .from('skus')
    .select('tyre_size_display, patterns!inner(pattern_name, pattern_short_description, brands(brand_name))')
    .eq('product_slug', slug)
    .eq('status', 'active')
    .single()

  if (!sku) return { title: 'Tyre Not Found' }

  const skuAny  = sku as any
  const pattern = skuAny.patterns
  const brand   = pattern?.brands

  return {
    title: `${brand?.brand_name ?? ''} ${pattern?.pattern_name ?? ''} ${skuAny.tyre_size_display ?? ''}`.trim(),
    description: pattern?.pattern_short_description ?? undefined,
  }
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params

  // connection() ensures price and stock are always fresh (never prerendered)
  await connection()

  const supabase = await createClient()

  // Fetch SKU + pattern + siblings + price + stock in parallel
  const { data: skuRaw, error } = await supabase
    .from('skus')
    .select(`
      product_id,
      sku,
      product_slug,
      tyre_size_display,
      width,
      profile,
      rim_size,
      speed_rating,
      load_index,
      runflat,
      xl_reinforced,
      ply_rating,
      load_range,
      construction_type,
      sidewall,
      country_of_origin,
      overall_diameter,
      tread_depth,
      tyre_weight,
      e_mark,
      utqg,
      fuel_rating,
      wet_grip,
      noise_db,
      noise_class,
      variant_images,
      total_available_stock,
      pattern_id,
      brand_id,
      patterns!inner (
        pattern_name,
        pattern_slug,
        pattern_short_description,
        application_type,
        gallery_images,
        brands ( brand_name, brand_slug )
      ),
      product_prices ( price_type, price_inc_gst, customer_group_id )
    `)
    .eq('product_slug', slug)
    .eq('status', 'active')
    .single()

  if (error || !skuRaw) notFound()

  const sku     = skuRaw as any
  const pattern = sku.patterns
  const brand   = pattern?.brands

  const [siblingsResult] = await Promise.all([
    supabase
      .from('skus')
      .select('product_id, product_slug, tyre_size_display, width, profile, rim_size, total_available_stock')
      .eq('pattern_id', sku.pattern_id)
      .eq('status', 'active')
      .neq('product_id', sku.product_id)
      .order('width').order('profile').order('rim_size'),
  ])

  const retail_price = (sku.product_prices ?? [])
    .find((p: any) => p.price_type === 'retail' && !p.customer_group_id)
    ?.price_inc_gst ?? null

  const product = {
    ...sku,
    brand_name:                brand?.brand_name                ?? null,
    brand_slug:                brand?.brand_slug                ?? null,
    pattern_name:              pattern?.pattern_name            ?? null,
    pattern_slug:              pattern?.pattern_slug            ?? null,
    pattern_short_description: pattern?.pattern_short_description ?? null,
    application_type:          pattern?.application_type        ?? null,
    gallery_images:            pattern?.gallery_images          ?? [],
    retail_price,
    siblings: siblingsResult.data ?? [],
  }

  return <ProductDetailClient product={product} />
}
