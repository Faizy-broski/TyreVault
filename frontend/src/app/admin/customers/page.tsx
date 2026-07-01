import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import CustomersClient from './CustomersClient'
import type { CustomerStats, CustomerListResponse } from '@/lib/query/hooks'

export const metadata: Metadata = { title: 'Customers — Admin' }

export default async function CustomersPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token ?? ''
  const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

  // Prefetch in parallel — doesn't add wall-clock time since layout runs concurrently
  const [statsRes, customersRes] = await Promise.allSettled([
    fetch(`${API}/api/admin/customers/stats`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 0 },
    }),
    fetch(`${API}/api/admin/customers?page=1`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 0 },
    }),
  ])

  const initialStats: CustomerStats | undefined =
    statsRes.status === 'fulfilled' && statsRes.value.ok
      ? await statsRes.value.json()
      : undefined

  const initialCustomers: CustomerListResponse | undefined =
    customersRes.status === 'fulfilled' && customersRes.value.ok
      ? await customersRes.value.json()
      : undefined

  return <CustomersClient initialStats={initialStats} initialCustomers={initialCustomers} />
}
