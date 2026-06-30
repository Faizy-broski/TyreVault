import { createClient } from '@/lib/supabase/server'
import PurchaseOrdersClient from '@/components/admin/purchase-orders/PurchaseOrdersClient'
import type { PurchaseOrderListItem } from '@/types/admin.types'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Purchase Orders — Admin' }

const API   = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
const LIMIT = 20

export default async function PurchaseOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>
}) {
  const { status = 'all', page: pageStr = '1' } = await searchParams
  const page = Math.max(1, Number(pageStr) || 1)

  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token ?? ''

  let pos: PurchaseOrderListItem[] = []
  let total = 0

  if (token) {
    const params = new URLSearchParams({ status, page: String(page), limit: String(LIMIT) })
    try {
      const res = await fetch(`${API}/api/admin/purchase-orders?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      if (res.ok) {
        const json = await res.json()
        pos   = json.data  ?? []
        total = json.total ?? 0
      }
    } catch { /* render empty state */ }
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  return (
    <PurchaseOrdersClient
      accessToken={token}
      pos={pos}
      total={total}
      totalPages={totalPages}
      page={page}
      status={status}
    />
  )
}
