import { createClient } from '@/lib/supabase/server'
import ShipmentsClient from '@/components/admin/shipments/ShipmentsClient'
import type { ShipmentListItem } from '@/types/admin.types'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Shipments — Admin' }

const API   = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
const LIMIT = 20

export default async function ShipmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>
}) {
  const { status = 'all', page: pageStr = '1' } = await searchParams
  const page = Math.max(1, Number(pageStr) || 1)

  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token ?? ''

  let shipments: ShipmentListItem[] = []
  let total = 0

  if (token) {
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) })
    if (status !== 'all') params.set('status', status)
    try {
      const res = await fetch(`${API}/api/admin/shipments?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      if (res.ok) {
        const json = await res.json()
        shipments = json.data  ?? []
        total     = json.total ?? 0
      }
    } catch { /* render empty state */ }
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  return (
    <ShipmentsClient
      accessToken={token}
      shipments={shipments}
      total={total}
      totalPages={totalPages}
      page={page}
      status={status}
    />
  )
}
