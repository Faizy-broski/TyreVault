import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import OrdersClient from './OrdersClient'
import type { OrderStats, OrderListResponse } from '@/lib/query/hooks'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Orders — Admin' }

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export default async function OrdersPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const headers = {
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  }

  const [statsRes, ordersRes] = await Promise.allSettled([
    fetch(`${API}/api/admin/orders/stats`,  { headers, cache: 'no-store' }),
    fetch(`${API}/api/admin/orders?page=1`, { headers, cache: 'no-store' }),
  ])

  const initialStats = statsRes.status === 'fulfilled' && statsRes.value.ok
    ? (await statsRes.value.json()) as OrderStats
    : undefined

  const initialOrders = ordersRes.status === 'fulfilled' && ordersRes.value.ok
    ? (await ordersRes.value.json()) as OrderListResponse
    : undefined

  return <OrdersClient initialStats={initialStats} initialOrders={initialOrders} />
}
