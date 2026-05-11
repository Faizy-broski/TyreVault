import { createClient } from '@/lib/supabase/server'
import MappingReviewClient from '@/components/admin/suppliers/MappingReviewClient'
import type { SupplierMapping, Supplier } from '@/types/admin.types'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

interface Props { params: Promise<{ id: string }> }

export default async function MappingReviewPage({ params }: Props) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token ?? ''

  let supplier: Supplier | null = null
  let mappings: SupplierMapping[] = []
  let total = 0

  try {
    const [sRes, mRes] = await Promise.all([
      fetch(`${API}/api/admin/suppliers/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      }),
      fetch(`${API}/api/admin/suppliers/${id}/mappings?filter=pending&page=1`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      }),
    ])
    if (sRes.ok)  supplier = await sRes.json()
    if (mRes.ok) {
      const body = await mRes.json()
      mappings = body.data  ?? []
      total    = body.total ?? 0
    }
  } catch { /* dev */ }

  return (
    <MappingReviewClient
      supplierId={id}
      supplierName={supplier?.supplier_name ?? id}
      initialMappings={mappings}
      initialTotal={total}
      accessToken={token}
    />
  )
}
