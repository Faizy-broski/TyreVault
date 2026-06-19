import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CustomersClient from './CustomersClient'
import type { CustomerStats, CustomerListResponse } from '@/lib/query/hooks'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Customers — Admin' }

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export default async function CustomersPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const headers = {
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  }

  const [statsRes, customersRes] = await Promise.allSettled([
    fetch(`${API}/api/admin/customers/stats`,  { headers, cache: 'no-store' }),
    fetch(`${API}/api/admin/customers?page=1`, { headers, cache: 'no-store' }),
  ])

  const initialStats = statsRes.status === 'fulfilled' && statsRes.value.ok
    ? (await statsRes.value.json()) as CustomerStats
    : undefined

  const initialCustomers = customersRes.status === 'fulfilled' && customersRes.value.ok
    ? (await customersRes.value.json()) as CustomerListResponse
    : undefined

  return <CustomersClient initialStats={initialStats} initialCustomers={initialCustomers} />
}
