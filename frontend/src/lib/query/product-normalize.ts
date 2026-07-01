// Plain module (no 'use client') so it can be imported from both Server Components
// (SSR prefetch in page.tsx files) and client-side query hooks (hooks.ts).

export type ProductRaw = {
  id: string; name: string; image: string | null
  brand: { brand_id: string; brand_name: string } | null
  collection: { collection_name: string } | null
  variantCount: number
  activeVariantCount: number
  totalStock: number
  loadIndexes: string[]
  firstSku: string | null
  isActive: boolean
  showOnWebsite: boolean
  updatedAt: string
  createdAt: string
}

export type NormalisedProduct = {
  id: string; name: string; image: string | null; brand: string; brandId: string
  collection: string | null; variantCount: number; activeVariants: number
  totalStock: number
  loadIndexes: string[]
  firstSku: string | null
  isActive: boolean; showOnWebsite: boolean; updatedAt: string; createdAt: string
}

export type ProductListResponse = { data: NormalisedProduct[]; total: number }

export function normaliseProductRaw(item: ProductRaw): NormalisedProduct {
  return {
    id: item.id,
    name: item.name,
    image: item.image ?? null,
    brand: item.brand?.brand_name ?? '—',
    brandId: item.brand?.brand_id ?? '',
    collection: item.collection?.collection_name ?? null,
    variantCount: item.variantCount,
    activeVariants: item.activeVariantCount,
    totalStock: item.totalStock ?? 0,
    loadIndexes: item.loadIndexes ?? [],
    firstSku: item.firstSku ?? null,
    isActive: item.isActive,
    showOnWebsite: item.showOnWebsite,
    updatedAt: item.updatedAt,
    createdAt: item.createdAt,
  }
}
