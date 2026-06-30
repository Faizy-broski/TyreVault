import { createClient } from '@/lib/supabase/server'
import WheelsListClient from '@/components/admin/wheels/WheelsListClient'
import type { AdminWheel, WheelBrand } from '@/types/admin.types'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Wheels — Admin' }

const API   = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
const LIMIT = 20

export default async function WheelsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; brandId?: string; page?: string }>
}) {
  const { search = '', brandId = '', page: pageStr = '1' } = await searchParams
  const page = Math.max(1, Number(pageStr) || 1)

  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token ?? ''

  let wheels: AdminWheel[] = []
  let brands: WheelBrand[] = []
  let total = 0

  if (token) {
    const wheelsQs = new URLSearchParams({
      search: search,
      brandId,
      page: String(page),
      limit: String(LIMIT),
    })
    try {
      const [wheelsRes, brandsRes] = await Promise.all([
        fetch(`${API}/api/admin/wheels?${wheelsQs}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        }),
        fetch(`${API}/api/admin/wheels/brands`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        }),
      ])
      if (wheelsRes.ok) {
        const json = await wheelsRes.json()
        wheels = json.data  ?? []
        total  = json.total ?? 0
      }
      if (brandsRes.ok) brands = await brandsRes.json()
    } catch { /* render empty state */ }
  }

  return (
    <WheelsListClient
      wheels={wheels}
      brands={brands}
      total={total}
      page={page}
      search={search}
      brandId={brandId}
    />
  )
}
