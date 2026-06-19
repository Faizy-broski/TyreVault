import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SuppliersClient from '@/components/admin/suppliers/SuppliersClient'
import type { Supplier } from '@/types/admin.types'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Suppliers — Admin' }

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export default async function AdminSuppliersPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const headers = { Authorization: `Bearer ${session.access_token}` }

  let suppliers: Supplier[] = []
  try {
    const res = await fetch(`${API}/api/admin/suppliers`, { headers, cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      suppliers = Array.isArray(data) ? data : (data.data ?? [])
    }
  } catch { /* backend not reachable in dev */ }

  return <SuppliersClient initialSuppliers={suppliers} accessToken={session.access_token} />
}
