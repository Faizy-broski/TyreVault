'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import CreateProductWizard from '@/components/admin/products/CreateProductWizard'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

type Meta = {
  brands:      { brand_id: string; brand_name: string }[]
  collections: { collection_id: string; collection_name: string }[]
  categories:  { category_id: string; category_name: string; category_type: string }[]
}

export default function NewProductPage() {
  const [meta, setMeta]           = useState<Meta>({ brands: [], collections: [], categories: [] })
  const [warehouses, setWarehouses] = useState<{ warehouse_id: string; warehouse_name: string }[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)

  useEffect(() => { document.title = 'New Product | Tyre Vault' }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const { data: { session } } = await createClient().auth.getSession()
        const tok = session?.access_token ?? ''
        const headers = { Authorization: `Bearer ${tok}` }

        const [metaRes, whRes] = await Promise.all([
          fetch(`${API}/api/admin/products/meta`, { headers }),
          fetch(`${API}/api/admin/orders/warehouses`, { headers }),
        ])

        if (!metaRes.ok) {
          const body = await metaRes.json().catch(() => ({}))
          throw new Error(body.error ?? `Failed to load product metadata (${metaRes.status})`)
        }

        const metaData: Meta = await metaRes.json()
        const whData: { warehouse_id: string; warehouse_name: string }[] = whRes.ok
          ? await whRes.json().catch(() => [])
          : []

        if (!cancelled) {
          setMeta(metaData)
          setWarehouses(Array.isArray(whData) ? whData : [])
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load form data')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm text-zinc-400 animate-pulse">Loading product form…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>
      </div>
    )
  }

  return (
    <CreateProductWizard
      brands={meta.brands}
      collections={meta.collections}
      categories={meta.categories}
      warehouses={warehouses}
    />
  )
}
