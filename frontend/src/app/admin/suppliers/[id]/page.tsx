import { createClient } from '@/lib/supabase/server'
import SupplierDetailClient from '@/components/admin/suppliers/SupplierDetailClient'
import type { Supplier } from '@/types/admin.types'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

interface Props { params: Promise<{ id: string }> }

export default async function AdminSupplierDetailPage({ params }: Props) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token ?? ''

  let supplier: Supplier | null = null
  try {
    const res = await fetch(`${API}/api/admin/suppliers/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (res.ok) supplier = await res.json()
  } catch { /* backend may not be running in dev */ }

  if (!supplier) {
    return (
      <div className="p-6 text-zinc-500 text-sm">
        Supplier not found.
      </div>
    )
  }

  return <SupplierDetailClient supplier={supplier} accessToken={token} />
}
