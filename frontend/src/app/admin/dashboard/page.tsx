import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import DashboardClient from './DashboardClient'
import type { OrderStats, OrderListResponse } from '@/lib/query/hooks'

export const metadata: Metadata = { title: 'Dashboard — Admin' }

export default async function AdminDashboardPage() {
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

  const initialOrderStats: OrderStats | undefined =
    statsRes.status === 'fulfilled' && statsRes.value.ok
      ? await statsRes.value.json()
      : undefined

  const initialOrders: OrderListResponse | undefined =
    ordersRes.status === 'fulfilled' && ordersRes.value.ok
      ? await ordersRes.value.json()
      : undefined

  // Derive display name from session email (e.g. "osama.hashmi@..." → "Osama")
  const rawEmail = session?.user?.email ?? ''
  const firstName = rawEmail.split('@')[0].split(/[._-]/)[0]
  const userName = firstName ? firstName.charAt(0).toUpperCase() + firstName.slice(1) : ''

  return (
    <DashboardClient
      initialOrderStats={initialOrderStats}
      initialOrders={initialOrders}
      userName={userName}
    />
  )
}
