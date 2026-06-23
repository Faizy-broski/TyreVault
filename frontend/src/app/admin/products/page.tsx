import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProductsClient from './ProductsClient'
import type { ProductListResponse } from '@/lib/query/hooks'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Products — Admin' }

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export default async function AdminProductsPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const headers = {
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  }

  const [productsRes] = await Promise.allSettled([
    fetch(`${API}/api/admin/products?page=1&sortBy=created_at&sortOrder=desc`, { headers, cache: 'no-store' }),
  ])

  let initialProducts: ProductListResponse | undefined
  if (productsRes.status === 'fulfilled' && productsRes.value.ok) {
    const raw = await productsRes.value.json() as { data: any[]; total: number }
    initialProducts = {
      total: raw.total,
      data:  raw.data.map((item: any) => ({
        id:             item.id,
        name:           item.name,
        image:          item.image          ?? null,
        brand:          item.brand?.brand_name          ?? '—',
        brandId:        item.brand?.brand_id            ?? '',
        collection:     item.collection?.collection_name ?? null,
        variantCount:   item.variantCount,
        activeVariants: item.activeVariantCount,
        totalStock:     item.totalStock     ?? 0,
        loadIndexes:    item.loadIndexes    ?? [],
        firstSku:       item.firstSku       ?? null,
        isActive:       item.isActive,
        showOnWebsite:  item.showOnWebsite,
        updatedAt:      item.updatedAt,
        createdAt:      item.createdAt,
      })),
    }
  }

  return <ProductsClient initialProducts={initialProducts} />
}
