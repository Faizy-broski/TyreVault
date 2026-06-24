import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminBreadcrumb } from '@/components/admin/AdminBreadcrumb'
import InventoryInterface from '@/components/admin/inventory/InventoryInterface'
import type { Supplier } from '@/types/admin.types'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Inventory — Admin' }

const API = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export default async function InventoryPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const headers = { Authorization: `Bearer ${session.access_token}` }

  let suppliers: Supplier[] = []
  try {
    const res = await fetch(`${API}/api/admin/suppliers`, { headers, cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      const all: Supplier[] = Array.isArray(data) ? data : (data.data ?? [])
      suppliers = all.filter(s => s.is_active)
    }
  } catch { /* backend not reachable in dev */ }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <AdminBreadcrumb crumbs={[{ label: 'Inventory' }]} />
      <h1 className="text-xl font-semibold text-zinc-900">Inventory</h1>
      <p className="text-sm text-zinc-500 -mt-2">
        Your products on the left — matched supplier catalogue entries on the right.
        Approve mappings to sync supplier stock into your availability.
      </p>
      <InventoryInterface suppliers={suppliers} accessToken={session.access_token} />
    </div>
  )
}
