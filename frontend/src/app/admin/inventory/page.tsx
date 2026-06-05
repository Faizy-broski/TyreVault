'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminBreadcrumb } from '@/components/admin/AdminBreadcrumb'
import { toastError } from '@/lib/toast'
import type { Supplier } from '@/types/admin.types'
import InventoryInterface from '@/components/admin/inventory/InventoryInterface'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export default function InventoryPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [token, setToken]         = useState('')
  const [loading, setLoading]     = useState(true)

  useEffect(() => { document.title = 'Inventory | Tyre Vault' }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const { data: { session } } = await createClient().auth.getSession()
        const tok = session?.access_token ?? ''
        if (!cancelled) setToken(tok)

        const res = await fetch(`${API}/api/admin/suppliers`, {
          headers: { Authorization: `Bearer ${tok}` },
        })
        if (!res.ok) throw new Error(`API ${res.status}`)
        const data: Supplier[] = await res.json()
        if (!cancelled) setSuppliers(Array.isArray(data) ? data.filter(s => s.is_active) : [])
      } catch (err) {
        if (!cancelled) toastError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div>
        <AdminBreadcrumb crumbs={[{ label: 'Inventory' }]} />
      </div>

      <h1 className="text-xl font-semibold text-zinc-900">Inventory</h1>
      <p className="text-sm text-zinc-500 -mt-2">
        Your products on the left — matched supplier catalogue entries on the right.
        Approve mappings to sync supplier stock into your availability.
      </p>

      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-zinc-100 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <InventoryInterface suppliers={suppliers} accessToken={token} />
      )}
    </div>
  )
}
