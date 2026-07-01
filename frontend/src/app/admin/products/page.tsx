import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import ProductsClient from './ProductsClient'
import { normaliseProductRaw, type ProductRaw, type ProductListResponse } from '@/lib/query/product-normalize'

export const metadata: Metadata = { title: 'Products — Admin' }

export default async function AdminProductsPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token ?? ''
  const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

  const productsRes = await fetch(
    `${API}/api/admin/products?page=1&sortBy=created_at&sortOrder=desc&limit=20`,
    { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 0 } },
  ).catch(() => undefined)

  const initialProducts: ProductListResponse | undefined =
    productsRes?.ok
      ? await productsRes.json().then((raw: { data: ProductRaw[]; total: number }) => ({
          total: raw.total,
          data: raw.data.map(normaliseProductRaw),
        }))
      : undefined

  return <ProductsClient initialProducts={initialProducts} />
}
