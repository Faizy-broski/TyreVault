import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import OrdersClient from './OrdersClient'
import type { OrderStats, OrderListResponse } from '@/lib/query/hooks'

export const metadata: Metadata = { title: 'Orders — Admin' }

export default async function OrdersPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token ?? ''
  const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

  // Prefetch in parallel — doesn't add wall-clock time since layout runs concurrently
  const [statsRes, ordersRes] = await Promise.allSettled([
    fetch(`${API}/api/admin/orders/stats`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 0 },
    }),
    fetch(`${API}/api/admin/orders?page=1`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 0 },
    }),
  ])

  const initialStats: OrderStats | undefined =
    statsRes.status === 'fulfilled' && statsRes.value.ok
      ? await statsRes.value.json()
      : undefined

  const initialOrders: OrderListResponse | undefined =
    ordersRes.status === 'fulfilled' && ordersRes.value.ok
      ? await ordersRes.value.json()
      : undefined

  return <OrdersClient initialStats={initialStats} initialOrders={initialOrders} />
}
