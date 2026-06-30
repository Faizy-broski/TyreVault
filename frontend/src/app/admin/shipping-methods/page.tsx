import { createClient } from '@/lib/supabase/server'
import ShippingMethodsClient from '@/components/admin/shipping/ShippingMethodsClient'
import type { AdminShippingMethod } from '@/types/admin.types'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Shipping Methods — Admin' }

const API = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export default async function ShippingMethodsPage({
  searchParams,
}: {
  searchParams: Promise<{ inactive?: string }>
}) {
  const { inactive } = await searchParams
  const showInactive = inactive === '1'

  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token ?? ''

  let methods: AdminShippingMethod[] = []

  if (token) {
    try {
      const res = await fetch(`${API}/api/admin/shipping/methods?all=${showInactive}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      if (res.ok) methods = await res.json()
    } catch { /* render empty state */ }
  }

  return (
    <ShippingMethodsClient
      accessToken={token}
      methods={methods}
      showInactive={showInactive}
    />
  )
}
