'use client'

import { useEffect, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { useProductDetail, useProductMeta, useAdminWarehouses } from '@/lib/query/hooks'
import EditProductForm from '@/components/admin/products/EditProductForm'
import type { EditProductFormValues } from '@/components/admin/products/schema'
import { toastError } from '@/lib/toast'

type Meta = {
  brands:      { brand_id: string; brand_name: string }[]
  collections: { collection_id: string; collection_name: string }[]
  categories:  { category_id: string; category_name: string; category_type: string }[]
  patterns:    { pattern_id: string; pattern_name: string; brand_id: string }[]
}

const EMPTY_META: Meta = { brands: [], collections: [], categories: [], patterns: [] }

interface ExistingSku {
  product_id: string
  sku: string
  tyre_size_display: string
  status: string
  total_available_stock: number
  width: number | null
  profile: number | null
  rim_size: number | null
  load_index: string | null
  speed_rating: string | null
}

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>()

  const { data: productData, isPending: productPending, isError: productIsError, error: productError } = useProductDetail(id)
  const { data: metaData,    isPending: metaPending,    isError: metaIsError,    error: metaError }    = useProductMeta()
  const { data: whData,      isPending: whPending } = useAdminWarehouses()

  const loading = productPending || metaPending || whPending

  useEffect(() => { document.title = 'Edit Product | Tyre Vault' }, [])

  useEffect(() => {
    if (productIsError) toastError(productError instanceof Error ? productError.message : 'Failed to load product')
    else if (metaIsError) toastError(metaError instanceof Error ? metaError.message : 'Failed to load product metadata')
  }, [productIsError, productError, metaIsError, metaError])

  const meta: Meta = metaData ?? EMPTY_META
  const warehouses = whData ?? []

  const { initialData, existingSkus, patternInfo } = useMemo(() => {
    if (!productData) {
      return { initialData: null, existingSkus: [] as ExistingSku[], patternInfo: null as { name: string; brandName: string } | null }
    }

    const p = productData.pattern
    const skus: ExistingSku[] = (productData.skus ?? []).map((s: any) => ({
      product_id:            s.product_id,
      sku:                   s.sku,
      tyre_size_display:     s.tyre_size_display,
      status:                s.status,
      total_available_stock: s.total_available_stock ?? 0,
      width:                 s.width ?? null,
      profile:               s.profile ?? null,
      rim_size:              s.rim_size ?? null,
      load_index:            s.load_index ?? null,
      speed_rating:          s.speed_rating ?? null,
    }))

    // Map API pattern → form values
    const formValues: EditProductFormValues = {
      brandId:             p.brand_id ?? (p.brands?.brand_id ?? ''),
      patternName:         p.pattern_name ?? '',
      patternSlug:         p.pattern_slug ?? '',
      shortDescription:    p.pattern_short_description ?? '',
      galleryImages:       Array.isArray(p.gallery_images) ? p.gallery_images : [],
      tyreOverview:        p.tyre_overview ?? '',
      features:            p.features ?? '',
      warrantyInformation: p.warranty_information ?? '',
      tyreSpecSheet:       p.tyre_spec_sheet ?? '',
      faqList:             Array.isArray(p.faq_list) ? p.faq_list : [],
      defaultCountryOfOrigin: p.default_country_of_origin ?? '',
      isActive:            p.is_active ?? true,
      showOnWebsite:       p.show_on_website ?? false,
      seoTitle:            p.seo_title ?? '',
      seoDescription:      p.seo_description ?? '',
      treadImage:          p.tread_image ?? '',
      discountable:        p.discountable ?? true,
      applicationType:     p.application_type ?? 'PCR',
      categoryIds:         (p.pattern_categories ?? []).map(
        (pc: { categories: { category_id: string } | null }) => pc.categories?.category_id ?? ''
      ).filter(Boolean),
      performanceCategory: p.performance_category ?? '',
      seasonType:          p.season_type ?? '',
      collectionId:        p.collection_id ?? '',
      tags:                Array.isArray(p.tags) ? p.tags : [],
      positionCategory:    p.position_category ?? undefined,
      shoulderType:        p.shoulder_type ?? undefined,
      terrainType:         p.terrain_type ?? '',
      warrantyKm:          p.warranty_km ?? undefined,
      // Populate variants[0] from the first existing SKU so Tyre Specs tab shows current data
      variants: skus.length > 0 ? [{
        sku:              skus[0].sku ?? '',
        barcodeEan:       '',
        tyreSizeDisplay:  skus[0].tyre_size_display ?? '',
        width:            skus[0].width ?? undefined,
        profile:          skus[0].profile ?? undefined,
        rimSize:          skus[0].rim_size ?? 0,
        specialSize:      '',
        constructionType: undefined,
        speedRating:      skus[0].speed_rating ?? '',
        loadIndex:        skus[0].load_index ?? '',
        loadSpeedRating:  '',
        fuelRating:       '',
        wetGrip:          '',
        noiseDb:          '',
        noiseClass:       '',
        runflat:          false,
        xlReinforced:     false,
        ltSizing:         false,
        plyRating:        '',
        loadRange:        '',
        sidewall:         undefined,
        tubeType:         undefined,
        manufacturerName: '',
        countryOfOrigin:  p.default_country_of_origin ?? '',
        factoryName:      '',
        factoryCountry:   '',
        sectionWidth:     undefined,
        treadDepth:       undefined,
        tyreWeight:       undefined,
        overallDiameter:  undefined,
        maxLoad:          '',
        maxPressure:      '',
        eMark:            '',
        dotCode:          '',
        utqg:             '',
        variantImages:    [],
        status:           (skus[0].status as 'active' | 'inactive' | 'discontinued') ?? 'active',
        replacementProductId: '',
      }] : [{
        sku: '', barcodeEan: '', tyreSizeDisplay: '', width: undefined, profile: undefined,
        rimSize: 0, specialSize: '', constructionType: undefined, speedRating: '', loadIndex: '',
        loadSpeedRating: '', fuelRating: '', wetGrip: '', noiseDb: '', noiseClass: '',
        runflat: false, xlReinforced: false, ltSizing: false, plyRating: '', loadRange: '',
        sidewall: undefined, tubeType: undefined, manufacturerName: '',
        countryOfOrigin: p.default_country_of_origin ?? '',
        factoryName: '', factoryCountry: '', sectionWidth: undefined, treadDepth: undefined,
        tyreWeight: undefined, overallDiameter: undefined, maxLoad: '', maxPressure: '',
        eMark: '', dotCode: '', utqg: '', variantImages: [], status: 'active' as const,
        replacementProductId: '',
      }],
      pricing:  [],
    }

    return {
      initialData: formValues,
      existingSkus: skus,
      patternInfo: { name: p.pattern_name ?? '', brandName: p.brands?.brand_name ?? '' },
    }
  }, [productData])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-zinc-400">Loading product…</p>
      </div>
    )
  }

  if (!initialData) {
    return (
      <div className="p-4 sm:p-6">
        <p className="mt-6 text-sm text-zinc-500">Product not found.</p>
      </div>
    )
  }

  return (
    <EditProductForm
      patternId={id}
      initialData={initialData}
      brands={meta.brands}
      collections={meta.collections}
      categories={meta.categories}
      warehouses={warehouses}
      patterns={meta.patterns}
      existingSkus={existingSkus}
      patternInfo={patternInfo ?? undefined}
    />
  )
}
