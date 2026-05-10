'use client'

import Link from 'next/link'

type Product = {
  id: string
  name: string
  brand: string
  collection: string | null
  variantCount: number
  activeVariants: number
  isActive: boolean
  showOnWebsite: boolean
  updatedAt: string
  createdAt: string
}

export default function ProductsTable({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-zinc-400">
        No products yet.{' '}
        <Link href="/admin/products/new" className="text-zinc-900 underline">Create your first product</Link>
      </div>
    )
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-zinc-200 bg-zinc-50">
          <th className="px-4 py-3 text-left font-medium text-zinc-500">Product</th>
          <th className="px-4 py-3 text-left font-medium text-zinc-500">Brand</th>
          <th className="px-4 py-3 text-left font-medium text-zinc-500">Collection</th>
          <th className="px-4 py-3 text-left font-medium text-zinc-500">Variants</th>
          <th className="px-4 py-3 text-left font-medium text-zinc-500">Status</th>
          <th className="px-4 py-3" />
        </tr>
      </thead>
      <tbody className="divide-y divide-zinc-100">
        {products.map(p => (
          <tr key={p.id} className="hover:bg-zinc-50 transition-colors">
            <td className="px-4 py-3">
              <Link
                href={`/admin/products/${p.id}`}
                className="font-medium text-zinc-900 hover:underline"
              >
                {p.name}
              </Link>
            </td>
            <td className="px-4 py-3 text-zinc-600">{p.brand}</td>
            <td className="px-4 py-3 text-zinc-500">{p.collection ?? '—'}</td>
            <td className="px-4 py-3">
              <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
                {p.variantCount} variant{p.variantCount !== 1 ? 's' : ''}
              </span>
            </td>
            <td className="px-4 py-3">
              {p.showOnWebsite ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                  Inactive
                </span>
              )}
            </td>
            <td className="px-4 py-3 text-right">
              <div className="relative inline-block">
                <button className="p-1.5 rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
