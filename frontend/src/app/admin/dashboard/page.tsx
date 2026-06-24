import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardClient from './DashboardClient'
import type { OrderStats, OrderListResponse } from '@/lib/query/hooks'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Dashboard — Admin' }

const API = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

const EMPTY_ORDER_STATS: OrderStats   = { totalOrders: 0, totalRevenue: 0, avgOrderSize: 0, pendingPayment: 0 }
const EMPTY_ORDERS: OrderListResponse = { data: [], total: 0 }

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const headers = { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }

  const [orderStatsRes, ordersRes] = await Promise.allSettled([
    fetch(`${API}/api/admin/orders/stats`,  { headers, cache: 'no-store' }),
    fetch(`${API}/api/admin/orders?page=1`, { headers, cache: 'no-store' }),
  ])

  const initialOrderStats = orderStatsRes.status === 'fulfilled' && orderStatsRes.value.ok
    ? (await orderStatsRes.value.json()) as OrderStats
    : EMPTY_ORDER_STATS

  const initialOrders = ordersRes.status === 'fulfilled' && ordersRes.value.ok
    ? (await ordersRes.value.json()) as OrderListResponse
    : EMPTY_ORDERS

  return (
    <DashboardClient
      initialOrderStats={initialOrderStats}
      initialOrders={initialOrders}
    />
  )
}
