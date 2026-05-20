import { notFound } from 'next/navigation'
import { unstable_noStore as noStore } from 'next/cache'
import ProductDetailClient from '@/components/storefront/ProductDetailClient'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

interface Props {
  params: Promise<{ slug: string }>
}

export const revalidate = 600

async function getProductBySlug(slug: string) {
  noStore()
  const res = await fetch(`${API}/api/products/slug/${encodeURIComponent(slug)}`, {
    next: { revalidate: 600 },
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Product fetch failed: ${res.status}`)
  return res.json()
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const product = await getProductBySlug(slug).catch(() => null)
  if (!product) return { title: 'Tyre Not Found' }
  return {
    title: `${product.brand_name ?? ''} ${product.pattern_name ?? ''} ${product.tyre_size_display ?? ''}`.trim(),
    description: product.pattern_short_description ?? undefined,
  }
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  if (!product) notFound()

  return <ProductDetailClient product={product} />
}
