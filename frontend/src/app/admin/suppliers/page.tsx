import { createClient } from '@/lib/supabase/server'
import SuppliersClient from '@/components/admin/suppliers/SuppliersClient'
import type { Supplier } from '@/types/admin.types'

export const metadata = { title: 'Suppliers — Onyx Admin' }

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export default async function AdminSuppliersPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token ?? ''

  let suppliers: Supplier[] = []
  try {
    const res = await fetch(`${API}/api/admin/suppliers`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (res.ok) suppliers = await res.json()
  } catch { /* backend may not be running in dev */ }

  return <SuppliersClient initialSuppliers={suppliers} accessToken={token} />
}
