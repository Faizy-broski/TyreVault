import type { Metadata } from 'next'
import ProductsClient from './ProductsClient'

export const metadata: Metadata = { title: 'Products — Admin' }

export default function AdminProductsPage() {
  return <ProductsClient />
}
