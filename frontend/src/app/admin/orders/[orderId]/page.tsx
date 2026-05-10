import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { OrderDetail } from '@/types/admin.types'
import OrderDetailClient from '@/components/admin/orders/OrderDetailClient'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

interface Props {
  params: Promise<{ orderId: string }>
}

export async function generateMetadata({ params }: Props) {
  const { orderId } = await params
  return { title: `Order ${orderId}` }
}

export default async function OrderDetailPage({ params }: Props) {
  const { orderId } = await params

  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const token   = session?.access_token ?? ''
  const headers = { Authorization: `Bearer ${token}` }

  let order: OrderDetail | null = null

  try {
    const res = await fetch(`${API}/api/admin/orders/${orderId}`, { headers, cache: 'no-store' })
    if (res.status === 404) notFound()
    if (res.ok) order = await res.json()
  } catch { /* server may not be running in dev */ }

  if (!order) {
    return (
      <div className="p-6 text-center text-sm text-zinc-400">
        Could not load order. Ensure the backend is running.
      </div>
    )
  }

  return <OrderDetailClient order={order} accessToken={token} />
}
